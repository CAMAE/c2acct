#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_ensure_dirs
mac_mini_load_env

app_agent_status="not-loaded"
verify_agent_status="not-loaded"
app_launchd_target="gui/${UID}/${MAC_MINI_APP_LABEL}"
verify_launchd_target="gui/${UID}/${MAC_MINI_VERIFY_LABEL}"

if launchctl print "${app_launchd_target}" >/dev/null 2>&1; then
  app_agent_status="loaded"
fi

if launchctl print "${verify_launchd_target}" >/dev/null 2>&1; then
  verify_agent_status="loaded"
fi

health_status="down"
health_details=""
if health_output="$(bash "${SCRIPT_DIR}/health-check.sh" 2>&1)"; then
  health_status="ok"
  health_details="$(printf '%s' "${health_output}" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
else
  health_details="$(printf '%s' "${health_output:-unavailable}" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
fi

listening="no"
if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  listening="yes"
fi

branch="$(git -C "${MAC_MINI_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
commit="$(git -C "${MAC_MINI_ROOT}" rev-parse --short HEAD 2>/dev/null || echo unknown)"
last_verify="$(mac_mini_latest_verify_summary)"

printf 'time=%s\n' "$(mac_mini_now_utc)"
printf 'repo=%s\n' "${MAC_MINI_ROOT}"
printf 'branch=%s\n' "${branch}"
printf 'commit=%s\n' "${commit}"
printf 'app_label=%s\n' "${MAC_MINI_APP_LABEL}"
printf 'verify_label=%s\n' "${MAC_MINI_VERIFY_LABEL}"
printf 'launchd_app=%s\n' "${app_agent_status}"
printf 'launchd_verify=%s\n' "${verify_agent_status}"
printf 'listen=%s host=%s port=%s\n' "${listening}" "${MAC_MINI_HOST}" "${PORT}"
printf 'health=%s %s\n' "${health_status}" "${health_details}"
printf 'app_url=%s\n' "$(mac_mini_app_url)"
if [ -n "${last_verify}" ]; then
  printf 'last_verify=%s\n' "${last_verify}"
fi
