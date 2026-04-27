#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mode="restart"
for arg in "$@"; do
  case "${arg}" in
    --check) mode="check" ;;
    --dry-run) mode="dry-run" ;;
    *) ;;
  esac
done

mac_mini_require_cmd launchctl
mac_mini_require_cmd node
mac_mini_ensure_dirs
mac_mini_load_contract
mac_mini_load_env
mac_mini_assert_runtime_root_allowed
mac_mini_assert_clean_root

launchd_target="gui/${UID}/${MAC_MINI_APP_LABEL}"
expected_env="$(cd "${MAC_MINI_ROOT}" && node --import tsx scripts/release/read-release-fingerprint.ts --format env)"
expected_release_id="$(printf '%s\n' "${expected_env}" | sed -n 's/^release_id=//p' | head -n 1)"

printf 'mode=%s\n' "${mode}"
printf 'launchd_target=%s\n' "${launchd_target}"
printf 'expected_release_id=%s\n' "${expected_release_id:-missing}"

if [ "${mode}" = "check" ] || [ "${mode}" = "dry-run" ]; then
  exit 0
fi

mac_mini_write_canonical_state "restart-app-${mode}"
mac_mini_write_expected_live_release
mac_mini_assert_release_artifacts_agree
launchctl kickstart -k "${launchd_target}"

attempt=0
last_output=""
while [ "${attempt}" -lt 30 ]; do
  if last_output="$(bash "${SCRIPT_DIR}/port-owner-proof.sh" --check 2>&1)"; then
    printf '%s\n' "${last_output}"
    exit 0
  fi

  attempt=$((attempt + 1))
  sleep 1
done

printf '%s\n' "${last_output}"
exit 1
