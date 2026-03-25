#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd pnpm
mac_mini_ensure_dirs
mac_mini_prune_artifacts
mac_mini_load_env
mac_mini_assert_env_ready

if [ ! -d "${MAC_MINI_ROOT}/node_modules" ]; then
  echo "node_modules is missing. Run 'pnpm install' before starting the app." >&2
  exit 1
fi

mac_mini_build_if_needed

echo "$(mac_mini_now_utc)" > "${MAC_MINI_STATE_DIR}/app-last-start-at.txt"
printf '%s\n' "$$" > "${MAC_MINI_STATE_DIR}/app-launch-script.pid"

cd "${MAC_MINI_ROOT}"
exec pnpm exec next start --hostname "${MAC_MINI_HOST}" --port "${PORT}"
