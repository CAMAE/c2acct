#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_ensure_dirs
mac_mini_load_contract
mac_mini_load_env
mac_mini_write_canonical_state "launchd-check"

app_agent_path="$(mac_mini_launch_agent_path "${MAC_MINI_APP_LABEL}")"
verify_agent_path="$(mac_mini_launch_agent_path "${MAC_MINI_VERIFY_LABEL}")"
app_rendered="${MAC_MINI_LAUNCHD_DIR}/${MAC_MINI_APP_LABEL}.plist"
verify_rendered="${MAC_MINI_LAUNCHD_DIR}/${MAC_MINI_VERIFY_LABEL}.plist"

printf 'canonical_root=%s\n' "${MAC_MINI_CANONICAL_ROOT}"
printf 'auth_mode=%s\n' "${MAC_MINI_AUTH_MODE}"
printf 'start_command=%s\n' "${MAC_MINI_START_COMMAND}"
printf 'app_plist=%s %s\n' "${app_agent_path}" "$([ -f "${app_agent_path}" ] && echo present || echo missing)"
printf 'verify_plist=%s %s\n' "${verify_agent_path}" "$([ -f "${verify_agent_path}" ] && echo present || echo missing)"
printf 'rendered_app_plist=%s %s\n' "${app_rendered}" "$([ -f "${app_rendered}" ] && echo present || echo missing)"
printf 'rendered_verify_plist=%s %s\n' "${verify_rendered}" "$([ -f "${verify_rendered}" ] && echo present || echo missing)"
printf '%s\n' "$(mac_mini_preflight_summary)"

if mac_mini_has_launchctl; then
  if launchctl print "gui/${UID}/${MAC_MINI_APP_LABEL}" >/dev/null 2>&1; then
    printf 'launchd_app=loaded\n'
  else
    printf 'launchd_app=not-loaded\n'
  fi

  if launchctl print "gui/${UID}/${MAC_MINI_VERIFY_LABEL}" >/dev/null 2>&1; then
    printf 'launchd_verify=loaded\n'
  else
    printf 'launchd_verify=not-loaded\n'
  fi
else
  printf 'launchd_app=unsupported\n'
  printf 'launchd_verify=unsupported\n'
fi
