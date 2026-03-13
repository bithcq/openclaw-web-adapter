#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib.sh
source "$SCRIPT_DIR/scripts/lib.sh"

main() {
  ensure_uninstall_tools
  uninstall_plugin
  restart_gateway
  show_uninstall_status
}

main "$@"
