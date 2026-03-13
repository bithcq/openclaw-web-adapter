#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_TARGET_DIR="${OPENCLAW_WEB_ADAPTER_TARGET_DIR:-$REPO_ROOT}"
DEFAULT_PLUGIN_ID="web-adapter"

info() {
  printf '[openclaw-web-adapter] %s\n' "$*"
}

warn() {
  printf '[openclaw-web-adapter] WARN: %s\n' "$*" >&2
}

die() {
  printf '[openclaw-web-adapter] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"
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

current_repo_url() {
  git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true
}

ensure_repo_checkout() {
  local repo_dir="$1"
  if [[ -d "$repo_dir/.git" ]]; then
    local source_url existing_url
    source_url="$(current_repo_url)"
    existing_url="$(git -C "$repo_dir" remote get-url origin 2>/dev/null || true)"
    if [[ -n "$source_url" && -n "$existing_url" && "$existing_url" != "$source_url" ]]; then
      die "目标目录的 origin 与当前仓库不一致：$repo_dir"
    fi
    return
  fi

  local source_url
  source_url="$(current_repo_url)"
  [[ -n "$source_url" ]] || die "当前仓库没有 origin，无法自动克隆到新目录：$repo_dir"
  if [[ -e "$repo_dir" ]]; then
    die "目标路径已存在但不是 git 仓库：$repo_dir"
  fi

  if [[ "$repo_dir" != "$REPO_ROOT" ]]; then
    info "克隆仓库到 $repo_dir"
    git clone "$source_url" "$repo_dir"
    return
  fi

  die "当前仓库目录不是 git 仓库：$repo_dir"
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

show_plugin_status() {
  info "当前插件状态"
  openclaw plugins list
  plugin_exists || die "OpenClaw 未发现插件：${DEFAULT_PLUGIN_ID}"
  openclaw web-adapter status --json
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
