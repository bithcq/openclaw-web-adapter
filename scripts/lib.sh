#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_REPO_URL="${OPENCLAW_WEB_ADAPTER_REPO_URL:-https://github.com/bithcq/openclaw-web-adapter.git}"
DEFAULT_TARGET_DIR="${OPENCLAW_WEB_ADAPTER_TARGET_DIR:-$HOME/web-adapter}"
DEFAULT_PLUGIN_ID="web-adapter"

info() {
  printf '[web-adapter] %s\n' "$*"
}

warn() {
  printf '[web-adapter] WARN: %s\n' "$*" >&2
}

die() {
  printf '[web-adapter] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"
}

config_file_path() {
  local explicit_config="${OPENCLAW_CONFIG_PATH:-${CLAWDBOT_CONFIG_PATH:-}}"
  if [[ -n "$explicit_config" ]]; then
    printf '%s\n' "$explicit_config"
    return
  fi

  local explicit_state_dir="${OPENCLAW_STATE_DIR:-${CLAWDBOT_STATE_DIR:-}}"
  if [[ -n "$explicit_state_dir" ]]; then
    printf '%s\n' "$explicit_state_dir/openclaw.json"
    return
  fi

  printf '%s\n' "$HOME/.openclaw/openclaw.json"
}

resolve_repo_dir() {
  if [[ "${1:-}" == "" ]]; then
    printf '%s\n' "$DEFAULT_TARGET_DIR"
    return
  fi
  if [[ "$1" == "~/"* ]]; then
    printf '%s\n' "$HOME/${1#~/}"
    return
  fi
  printf '%s\n' "$1"
}

ensure_install_tools() {
  require_cmd git
  require_cmd node
  require_cmd pnpm
  require_cmd openclaw
}

ensure_update_tools() {
  ensure_install_tools
}

ensure_uninstall_tools() {
  require_cmd openclaw
}

source_repo_url() {
  printf '%s\n' "$DEFAULT_REPO_URL"
}

normalize_repo_url() {
  local raw="${1:-}"
  raw="${raw%.git}"
  raw="${raw%/}"
  raw="${raw#ssh://}"

  if [[ "$raw" == git@*:* ]]; then
    local host_and_path="${raw#git@}"
    printf '%s\n' "${host_and_path/:/\/}"
    return
  fi

  if [[ "$raw" == git@*/* ]]; then
    printf '%s\n' "${raw#git@}"
    return
  fi

  raw="${raw#https://}"
  raw="${raw#http://}"
  raw="${raw#git://}"
  printf '%s\n' "${raw#/}"
}

ensure_repo_checkout() {
  local repo_dir="$1"
  local source_url normalized_source_url
  source_url="$(source_repo_url)"
  normalized_source_url="$(normalize_repo_url "$source_url")"

  if [[ -d "$repo_dir/.git" ]]; then
    local existing_url normalized_existing_url
    existing_url="$(git -C "$repo_dir" remote get-url origin 2>/dev/null || true)"
    normalized_existing_url="$(normalize_repo_url "$existing_url")"
    if [[ -z "$normalized_existing_url" ]]; then
      die "目标目录存在 git 仓库，但没有可用的 origin：$repo_dir"
    fi
    if [[ "$normalized_existing_url" != "$normalized_source_url" ]]; then
      die "目标目录的 origin 与配置的安装源不一致：$repo_dir"
    fi
    return
  fi

  if [[ -e "$repo_dir" ]]; then
    die "目标路径已存在但不是 git 仓库：$repo_dir"
  fi

  info "从 GitHub 克隆仓库到 $repo_dir"
  git clone "$source_url" "$repo_dir"
}

resolve_upstream_ref() {
  local repo_dir="$1"
  local current_branch
  current_branch="$(git -C "$repo_dir" branch --show-current)"
  [[ -n "$current_branch" ]] || return 0
  git -C "$repo_dir" for-each-ref --format='%(upstream:short)' "refs/heads/$current_branch" | head -n 1
}

resolve_update_remote() {
  local repo_dir="$1"
  local upstream
  upstream="$(resolve_upstream_ref "$repo_dir")"
  if [[ -n "$upstream" ]]; then
    printf '%s\n' "${upstream%%/*}"
    return
  fi

  git -C "$repo_dir" remote | head -n 1
}

resolve_update_branch() {
  local repo_dir="$1"
  local upstream
  upstream="$(resolve_upstream_ref "$repo_dir")"
  if [[ -n "$upstream" ]]; then
    printf '%s\n' "${upstream#*/}"
    return
  fi

  git -C "$repo_dir" branch --show-current
}

update_repo_checkout() {
  local repo_dir="$1"
  if ! git -C "$repo_dir" diff --quiet || \
     ! git -C "$repo_dir" diff --cached --quiet || \
     [[ -n "$(git -C "$repo_dir" ls-files --others --exclude-standard)" ]]; then
    die "目标仓库有未提交改动，先清理后再更新：$repo_dir"
  fi

  local remote_name branch_name
  remote_name="$(resolve_update_remote "$repo_dir")"
  branch_name="$(resolve_update_branch "$repo_dir")"

  [[ -n "$remote_name" ]] || die "目标仓库没有可用 remote，无法自动更新：$repo_dir"
  [[ -n "$branch_name" ]] || die "目标仓库不在有效分支上，无法自动更新：$repo_dir"

  info "更新仓库 ($remote_name/$branch_name)"
  git -C "$repo_dir" fetch "$remote_name" --tags
  git -C "$repo_dir" pull --ff-only "$remote_name" "$branch_name"
}

install_repo_deps() {
  local repo_dir="$1"
  info "安装依赖"
  pnpm -C "$repo_dir" install --no-frozen-lockfile
}

install_plugin_link() {
  local repo_dir="$1"
  info "安装插件链接"
  openclaw plugins install -l "$repo_dir"
}

enable_plugin() {
  info "启用插件"
  openclaw config set "plugins.entries.${DEFAULT_PLUGIN_ID}.enabled" true
}

restart_gateway() {
  info "重启 Gateway"
  if openclaw daemon restart --json >/dev/null 2>&1; then
    return
  fi
  if openclaw gateway restart --json >/dev/null 2>&1; then
    return
  fi
  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user restart openclaw-gateway.service
    return
  fi
  die "无法自动重启 Gateway，请手动执行 openclaw daemon restart 或重启 openclaw-gateway.service"
}

plugin_exists() {
  local list_json
  list_json="$(openclaw plugins list --json)"
  printf '%s\n' "$list_json" | grep -Eq "\"id\"[[:space:]]*:[[:space:]]*\"${DEFAULT_PLUGIN_ID}\""
}

plugin_loaded() {
  local list_json
  list_json="$(openclaw plugins list --json)"
  printf '%s\n' "$list_json" | node --input-type=module -e '
    let raw = "";
    for await (const chunk of process.stdin) {
      raw += chunk;
    }
    const payload = JSON.parse(raw);
    const plugin = Array.isArray(payload.plugins)
      ? payload.plugins.find((entry) => entry?.id === process.argv[1])
      : null;
    if (!plugin) {
      process.exit(1);
    }
    process.exit(plugin.status === "loaded" ? 0 : 2);
  ' "$DEFAULT_PLUGIN_ID"
}

wait_for_plugin_loaded() {
  local attempts="${1:-15}"
  local delay_seconds="${2:-1}"
  local attempt
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if plugin_loaded; then
      return 0
    fi
    sleep "$delay_seconds"
  done
  return 1
}

fetch_plugin_status_via_gateway() {
  local gateway_base="${OPENCLAW_GATEWAY_BASE_URL:-http://127.0.0.1:18789}"
  local config_path
  config_path="$(config_file_path)"

  GATEWAY_BASE="$gateway_base" OPENCLAW_CONFIG_FILE="$config_path" node --input-type=module -e '
    import fs from "node:fs";

    const configPath = process.env.OPENCLAW_CONFIG_FILE;
    const gatewayBase = process.env.GATEWAY_BASE || "http://127.0.0.1:18789";
    const envToken =
      process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
      process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() ||
      "";
    let configToken = "";
    if (!envToken && configPath) {
      try {
        const raw = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw);
        configToken = typeof parsed?.gateway?.auth?.token === "string" ? parsed.gateway.auth.token : "";
      } catch {
        configToken = "";
      }
    }
    const token = envToken || configToken.trim();
    if (!token) {
      process.stderr.write("[web-adapter] WARN: 无法解析 gateway token，跳过 HTTP route 状态检查\n");
      process.exit(2);
    }
    const response = await fetch(`${gatewayBase.replace(/\/$/, "")}/plugins/web-adapter/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      process.stderr.write(`[web-adapter] WARN: 插件状态路由返回 ${response.status}\n`);
      process.exit(3);
    }
    process.stdout.write(await response.text());
  '
}

show_plugin_status() {
  info "当前插件状态"
  openclaw plugins list
  wait_for_plugin_loaded 20 1 || die "OpenClaw 未发现已加载插件：${DEFAULT_PLUGIN_ID}"

  if openclaw web-adapter status --json; then
    return
  fi

  warn "插件 CLI 子命令当前不可用，回退到 Gateway HTTP route 状态检查"
  if fetch_plugin_status_via_gateway; then
    printf '\n'
    return
  fi

  warn "插件已加载，但无法通过 CLI 或 HTTP route 获取状态"
}

show_uninstall_status() {
  info "当前插件状态"
  openclaw plugins list
  if plugin_exists; then
    die "插件仍然存在：${DEFAULT_PLUGIN_ID}"
  fi
  info "插件 ${DEFAULT_PLUGIN_ID} 已卸载"
}

uninstall_plugin() {
  info "卸载插件"
  openclaw plugins uninstall "$DEFAULT_PLUGIN_ID" --keep-files --force
}
