#!/bin/bash

set -euo pipefail

MAC_MINI_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MAC_MINI_ARTIFACTS_DIR="${MAC_MINI_ROOT}/artifacts/mac-mini"
MAC_MINI_LOG_DIR="${MAC_MINI_ARTIFACTS_DIR}/logs"
MAC_MINI_REPORT_DIR="${MAC_MINI_ARTIFACTS_DIR}/reports"
MAC_MINI_STATE_DIR="${MAC_MINI_ARTIFACTS_DIR}/state"
MAC_MINI_LAUNCHD_DIR="${MAC_MINI_ARTIFACTS_DIR}/launchd"
MAC_MINI_DEFAULT_PORT="${MAC_MINI_PORT:-${PORT:-3000}}"
MAC_MINI_DEFAULT_HOST="${MAC_MINI_HOST:-127.0.0.1}"
MAC_MINI_APP_LABEL="${MAC_MINI_APP_LABEL:-com.c2acct.app}"
MAC_MINI_VERIFY_LABEL="${MAC_MINI_VERIFY_LABEL:-com.c2acct.verify}"

mac_mini_now_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

mac_mini_timestamp() {
  date -u +"%Y%m%dT%H%M%SZ"
}

mac_mini_ensure_dirs() {
  mkdir -p \
    "${MAC_MINI_LOG_DIR}" \
    "${MAC_MINI_REPORT_DIR}" \
    "${MAC_MINI_STATE_DIR}" \
    "${MAC_MINI_LAUNCHD_DIR}"
}

mac_mini_load_env() {
  if [ -f "${MAC_MINI_ROOT}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "${MAC_MINI_ROOT}/.env"
    set +a
  fi

  if [ -f "${MAC_MINI_ROOT}/.env.local" ]; then
    set -a
    # shellcheck disable=SC1091
    . "${MAC_MINI_ROOT}/.env.local"
    set +a
  fi

  export PORT="${PORT:-${MAC_MINI_DEFAULT_PORT}}"
  export MAC_MINI_PORT="${PORT}"
  export MAC_MINI_HOST="${MAC_MINI_HOST:-${MAC_MINI_DEFAULT_HOST}}"
}

mac_mini_log() {
  printf '[%s] %s\n' "$(mac_mini_now_utc)" "$*"
}

mac_mini_require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

mac_mini_prune_artifacts() {
  find "${MAC_MINI_LOG_DIR}" -type f -mtime +14 -delete 2>/dev/null || true
  find "${MAC_MINI_REPORT_DIR}" -type f -mtime +30 -delete 2>/dev/null || true
}

mac_mini_health_url() {
  printf 'http://%s:%s/api/health/db' "${MAC_MINI_HOST:-${MAC_MINI_DEFAULT_HOST}}" "${PORT:-${MAC_MINI_DEFAULT_PORT}}"
}

mac_mini_app_url() {
  printf 'http://%s:%s/' "${MAC_MINI_HOST:-${MAC_MINI_DEFAULT_HOST}}" "${PORT:-${MAC_MINI_DEFAULT_PORT}}"
}

mac_mini_latest_verify_summary() {
  local latest
  latest="$(ls -1t "${MAC_MINI_REPORT_DIR}"/nightly-summary-*.txt 2>/dev/null | head -n 1 || true)"
  if [ -n "${latest}" ]; then
    printf '%s' "${latest}"
  fi
}

mac_mini_launch_agent_path() {
  printf '%s/Library/LaunchAgents/%s.plist' "${HOME}" "$1"
}
