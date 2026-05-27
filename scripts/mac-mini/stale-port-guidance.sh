#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd lsof
mac_mini_require_cmd ps
mac_mini_ensure_dirs
mac_mini_load_contract
mac_mini_load_env

listener_pid=""
listener_command="missing"
listener_user="missing"
listener_command_line="missing"
listener_cwd="missing"
listener_root_status="no-listener"
homepage_probe_status="not-run"
homepage_probe_summary=""

listen_output="$(lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "${listen_output}" ]; then
  listener_pid="$(printf '%s\n' "${listen_output}" | awk 'NR==2 { print $2; exit }')"
  listener_command="$(printf '%s\n' "${listen_output}" | awk 'NR==2 { print $1; exit }')"
  listener_user="$(printf '%s\n' "${listen_output}" | awk 'NR==2 { print $3; exit }')"

  if command_line="$(ps -p "${listener_pid}" -o command= 2>/dev/null || true)"; then
    listener_command_line="$(printf '%s' "${command_line}" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/^[[:space:]]*//; s/[[:space:]]*$//')"
    [ -n "${listener_command_line}" ] || listener_command_line="unavailable"
  fi

  if cwd_output="$(lsof -a -p "${listener_pid}" -d cwd -Fn 2>/dev/null || true)"; then
    listener_cwd="$(printf '%s\n' "${cwd_output}" | awk '/^n/ { sub(/^n/, "", $0); print; exit }')"
    [ -n "${listener_cwd}" ] || listener_cwd="unavailable"
  fi

  if [ "${listener_cwd}" = "${MAC_MINI_CANONICAL_ROOT}" ]; then
    listener_root_status="canonical"
  elif [ "${listener_cwd}" = "${MAC_MINI_DEV_ROOT}" ]; then
    listener_root_status="forbidden-dev-root"
  elif [[ "${listener_cwd}" == /private/tmp/* ]]; then
    listener_root_status="forbidden-tmp-root"
  elif [ "${listener_cwd}" = "unavailable" ] || [ "${listener_cwd}" = "missing" ]; then
    listener_root_status="unknown"
  else
    listener_root_status="wrong-root"
  fi

  if homepage_probe_output="$(cd "${MAC_MINI_ROOT}" && node --import tsx scripts/startup-guard.ts verify-base-url --kind standalone --base-url "$(mac_mini_app_url | sed 's#/$##')" --format env 2>/dev/null || true)"; then
    homepage_probe_status="$(printf '%s\n' "${homepage_probe_output}" | awk -F= '/^homepage_probe_ok=/ { print $2; exit }')"
    homepage_probe_summary="$(printf '%s\n' "${homepage_probe_output}" | awk -F= '/^homepage_failures=/ { print $2; exit }')"
  fi
fi

printf 'port=%s\n' "${PORT}"
printf 'listener_present=%s\n' "$([ -n "${listener_pid}" ] && echo yes || echo no)"
printf 'listener_pid=%s\n' "${listener_pid:-missing}"
printf 'listener_command=%s\n' "${listener_command}"
printf 'listener_user=%s\n' "${listener_user}"
printf 'listener_command_line=%s\n' "${listener_command_line}"
printf 'listener_cwd=%s\n' "${listener_cwd}"
printf 'listener_root_status=%s\n' "${listener_root_status}"
printf 'homepage_probe_ok=%s\n' "${homepage_probe_status}"
printf 'homepage_probe_failures=%s\n' "${homepage_probe_summary}"

if [ -z "${listener_pid}" ]; then
  echo "guidance=No process is listening on the PAT port. Start PAT from ${MAC_MINI_CANONICAL_ROOT}."
  exit 0
fi

if [ "${listener_root_status}" = "canonical" ] && [ "${homepage_probe_status}" = "yes" ]; then
  echo "guidance=The listener is rooted at the canonical PAT repo and its homepage proof passed. No stale-process cleanup is needed."
  exit 0
fi

echo "guidance=This listener should be treated as stale until proven otherwise. Review the PID, cwd, and homepage proof above."
echo "suggested_manual_stop=kill -9 ${listener_pid}"
echo "suggested_follow_up=cd ${MAC_MINI_CANONICAL_ROOT} && pnpm standalone:local:check"
echo "note=This script does not kill processes. It only proves ownership and prints the manual cleanup command."
