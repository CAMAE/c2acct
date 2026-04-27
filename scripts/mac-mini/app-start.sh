#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mode="start"
for arg in "$@"; do
  case "${arg}" in
    --check) mode="check" ;;
    --dry-run) mode="dry-run" ;;
    *) ;;
  esac
done

mac_mini_require_cmd node
mac_mini_require_cmd git
mac_mini_require_cmd shasum
mac_mini_ensure_dirs
mac_mini_prune_artifacts
mac_mini_load_contract
mac_mini_load_env
mac_mini_assert_runtime_root_allowed
mac_mini_assert_clean_root
mac_mini_assert_env_ready

if [ ! -d "${MAC_MINI_ROOT}/node_modules" ]; then
  echo "node_modules is missing. Run 'pnpm install' before starting the app." >&2
  exit 1
fi

if [ "$(pwd -P)" != "${MAC_MINI_CANONICAL_ROOT}" ]; then
  echo "Current working directory must be the canonical root: ${MAC_MINI_CANONICAL_ROOT}" >&2
  exit 1
fi

mac_mini_build_if_needed
mac_mini_write_canonical_state "app-start-${mode}"
mac_mini_write_expected_live_release
mac_mini_assert_release_artifacts_agree
start_command="HOSTNAME=${MAC_MINI_HOST} PORT=${PORT} node --import tsx ${MAC_MINI_ROOT}/scripts/startup-guard.ts launch --kind standalone --port ${PORT} -- node ${MAC_MINI_ROOT}/.next/standalone/server.js"

if [ "${mode}" = "check" ] || [ "${mode}" = "dry-run" ]; then
  printf 'mode=%s\n' "${mode}"
  printf 'canonical_root=%s\n' "${MAC_MINI_CANONICAL_ROOT}"
  printf 'auth_mode=%s\n' "${MAC_MINI_AUTH_MODE}"
  printf 'start_command=%s\n' "${start_command}"
  exit 0
fi

echo "$(mac_mini_now_utc)" > "${MAC_MINI_STATE_DIR}/app-last-start-at.txt"
printf '%s\n' "$$" > "${MAC_MINI_STATE_DIR}/app-launch-script.pid"

cd "${MAC_MINI_ROOT}"
HOSTNAME="${MAC_MINI_HOST}" PORT="${PORT}" exec node --import tsx "${MAC_MINI_ROOT}/scripts/startup-guard.ts" launch --kind standalone --port "${PORT}" -- node "${MAC_MINI_ROOT}/.next/standalone/server.js"
