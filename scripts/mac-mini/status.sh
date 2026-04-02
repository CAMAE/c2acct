#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_ensure_dirs
mac_mini_load_contract
mac_mini_load_env

app_agent_status="unavailable"
verify_agent_status="unavailable"
launchd_mode="unsupported"
app_launchd_target="gui/${UID}/${MAC_MINI_APP_LABEL}"
verify_launchd_target="gui/${UID}/${MAC_MINI_VERIFY_LABEL}"

if mac_mini_has_launchctl; then
  launchd_mode="available"
  app_agent_status="not-loaded"
  verify_agent_status="not-loaded"

  if launchctl print "${app_launchd_target}" >/dev/null 2>&1; then
    app_agent_status="loaded"
  fi

  if launchctl print "${verify_launchd_target}" >/dev/null 2>&1; then
    verify_agent_status="loaded"
  fi
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

branch="$(mac_mini_git_branch)"
commit="$(mac_mini_git_commit)"
commit_sha="$(mac_mini_git_commit_full)"
dirty="$(mac_mini_git_dirty)"
last_verify="$(mac_mini_latest_verify_summary)"
mac_mini_load_release_state || true
preflight_output="$(mac_mini_preflight_summary)"

printf 'time=%s\n' "$(mac_mini_now_utc)"
printf 'canonical_root=%s\n' "${MAC_MINI_CANONICAL_ROOT}"
printf 'repo=%s\n' "${MAC_MINI_ROOT}"
printf 'branch=%s\n' "${branch}"
printf 'commit=%s\n' "${commit}"
printf 'commit_sha=%s\n' "${commit_sha}"
printf 'git_dirty=%s\n' "${dirty}"
printf 'auth_mode=%s\n' "${MAC_MINI_AUTH_MODE}"
printf 'start_command=%s\n' "${MAC_MINI_START_COMMAND}"
printf 'app_label=%s\n' "${MAC_MINI_APP_LABEL}"
printf 'verify_label=%s\n' "${MAC_MINI_VERIFY_LABEL}"
printf 'launchd_mode=%s\n' "${launchd_mode}"
printf 'launchd_app=%s\n' "${app_agent_status}"
printf 'launchd_verify=%s\n' "${verify_agent_status}"
printf 'listen=%s host=%s port=%s\n' "${listening}" "${MAC_MINI_HOST}" "${PORT}"
printf 'health=%s %s\n' "${health_status}" "${health_details}"
printf 'app_url=%s\n' "$(mac_mini_app_url)"
printf 'release_fingerprint_seed=%s\n' "$(mac_mini_release_fingerprint_seed)"
printf 'build_id=%s\n' "${BUILD_ID:-missing}"
printf 'build_time=%s\n' "${BUILD_TIME_UTC:-unknown}"
printf 'build_reason=%s\n' "${BUILD_REASON:-unknown}"
printf 'build_commit=%s\n' "${COMMIT:-unknown}"
printf 'build_branch=%s\n' "${BRANCH:-unknown}"
printf 'build_age=%s\n' "$(mac_mini_build_age_human)"
printf '%s\n' "${preflight_output}"
if [ -n "${last_verify}" ]; then
  printf 'last_verify=%s\n' "${last_verify}"
fi
