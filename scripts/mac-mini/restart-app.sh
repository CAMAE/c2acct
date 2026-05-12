#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_ensure_dirs
mac_mini_load_env

if ! mac_mini_has_launchctl; then
  echo "launchctl unavailable; cannot restart app safely." >&2
  exit 1
fi

launchctl kickstart -k "gui/${UID}/${MAC_MINI_APP_LABEL}"
sleep 2
bash "${SCRIPT_DIR}/status.sh"
