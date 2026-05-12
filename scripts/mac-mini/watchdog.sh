#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd bash
mac_mini_ensure_dirs
mac_mini_load_env

if bash "${SCRIPT_DIR}/health-check.sh" >/dev/null 2>&1; then
  mac_mini_record_watchdog_state "ok" "health-check-passed"
  exit 0
fi

printf '[%s] watchdog detected health failure; attempting single restart\n' "$(mac_mini_now_utc)" > "${MAC_MINI_CHATOPS_FAILURE_FILE}"

if bash "${SCRIPT_DIR}/restart-app.sh" >> "${MAC_MINI_CHATOPS_FAILURE_FILE}" 2>&1; then
  if bash "${SCRIPT_DIR}/health-check.sh" >> "${MAC_MINI_CHATOPS_FAILURE_FILE}" 2>&1; then
    mac_mini_record_watchdog_state "recovered" "restart-succeeded"
    exit 0
  fi
fi

mac_mini_record_watchdog_state "failed" "restart-did-not-recover"
exit 1
