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
http_code="$(curl -sS -o "${tmp_output}" -w '%{http_code}' --max-time 10 "${health_url}" 2>/dev/null || true)"
body_compact=""

if [ -f "${tmp_output}" ]; then
  body_compact="$(tr '\n' ' ' < "${tmp_output}" | sed 's/[[:space:]]\+/ /g')"
fi

if [ "${http_code}" = "200" ]; then
  printf 'status=ok url=%s http=%s\n' "${health_url}" "${http_code}"
  if [ -n "${body_compact}" ]; then
    printf 'body=%s\n' "${body_compact}"
  fi
  rm -f "${tmp_output}"
  exit 0
fi

printf 'status=fail url=%s http=%s\n' "${health_url}" "${http_code:-000}"
if [ -n "${body_compact}" ]; then
  printf 'body=%s\n' "${body_compact}"
fi
rm -f "${tmp_output}"
exit 1
