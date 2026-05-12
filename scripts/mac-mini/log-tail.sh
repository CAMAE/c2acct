#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_ensure_dirs

tail_lines="${1:-${MAC_MINI_CHATOPS_MAX_LOG_LINES}}"

for file in \
  "${MAC_MINI_LOG_DIR}/app.stderr.log" \
  "${MAC_MINI_LOG_DIR}/app.stdout.log" \
  "${MAC_MINI_LOG_DIR}/nightly.stderr.log"; do
  printf 'file=%s\n' "${file}"
  if [ -f "${file}" ]; then
    tail -n "${tail_lines}" "${file}"
  else
    echo "missing"
  fi
  echo
done
