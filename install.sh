#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/scripts/lib.sh"

main() {
  local repo_dir
  repo_dir="$(resolve_repo_dir "${1:-}")"

  ensure_install_tools
  ensure_repo_checkout "$repo_dir"
  install_repo_deps "$repo_dir"
  install_plugin_link "$repo_dir"
  enable_plugin
  restart_gateway
  show_plugin_status
}

main "$@"
