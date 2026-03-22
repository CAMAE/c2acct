#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd curl
mac_mini_ensure_dirs
mac_mini_load_env

health_url="$(mac_mini_health_url)"
tmp_output="$(mktemp /tmp/c2acct-mac-mini-health.XXXXXX)"
http_code="$(curl -sS -o "${tmp_output}" -w '%{http_code}' --max-time 10 "${health_url}" || true)"

if [ "${http_code}" = "200" ]; then
  printf 'ok health=%s http=%s\n' "${health_url}" "${http_code}"
  cat "${tmp_output}"
  rm -f "${tmp_output}"
  exit 0
fi

printf 'fail health=%s http=%s\n' "${health_url}" "${http_code:-000}"
if [ -f "${tmp_output}" ]; then
  cat "${tmp_output}"
  rm -f "${tmp_output}"
fi
exit 1
