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
MAC_MINI_RELEASE_FILE="${MAC_MINI_STATE_DIR}/release-state.env"
MAC_MINI_REQUIRED_ENV_VARS=(
  DATABASE_URL
  NEXTAUTH_SECRET
  AUTH_GITHUB_ID
  AUTH_GITHUB_SECRET
)

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
  find "${MAC_MINI_REPORT_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true
  find "${MAC_MINI_REPORT_DIR}" -type f -mtime +30 -delete 2>/dev/null || true

  # Keep only the 10 newest nightly summaries for fast phone inspection.
  local summaries
  summaries="$(ls -1t "${MAC_MINI_REPORT_DIR}"/nightly-summary-*.txt 2>/dev/null || true)"
  if [ -n "${summaries}" ]; then
    printf '%s\n' "${summaries}" | awk 'NR>10' | while IFS= read -r old_summary; do
      [ -n "${old_summary}" ] && rm -f "${old_summary}"
    done
  fi
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

mac_mini_has_launchctl() {
  command -v launchctl >/dev/null 2>&1
}

mac_mini_git_branch() {
  git -C "${MAC_MINI_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown
}

mac_mini_git_commit() {
  git -C "${MAC_MINI_ROOT}" rev-parse --short HEAD 2>/dev/null || echo unknown
}

mac_mini_git_dirty() {
  if git -C "${MAC_MINI_ROOT}" diff --quiet --ignore-submodules HEAD >/dev/null 2>&1; then
    echo clean
  else
    echo dirty
  fi
}

mac_mini_missing_env_vars() {
  local missing=()
  local var_name
  for var_name in "${MAC_MINI_REQUIRED_ENV_VARS[@]}"; do
    if [ -z "${!var_name:-}" ]; then
      missing+=("${var_name}")
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    printf '%s\n' "${missing[@]}"
  fi
}

mac_mini_assert_env_ready() {
  local missing
  missing="$(mac_mini_missing_env_vars || true)"
  if [ -n "${missing}" ]; then
    echo "Missing required environment variables:" >&2
    printf '%s\n' "${missing}" >&2
    exit 1
  fi
}

mac_mini_build_is_present() {
  [ -f "${MAC_MINI_ROOT}/.next/BUILD_ID" ]
}

mac_mini_write_release_state() {
  local build_reason="$1"
  local build_id="missing"

  if mac_mini_build_is_present; then
    build_id="$(cat "${MAC_MINI_ROOT}/.next/BUILD_ID" 2>/dev/null || echo missing)"
  fi

  cat > "${MAC_MINI_RELEASE_FILE}" <<EOF
BUILD_TIME_UTC=$(mac_mini_now_utc)
BUILD_REASON=${build_reason}
BRANCH=$(mac_mini_git_branch)
COMMIT=$(mac_mini_git_commit)
GIT_DIRTY=$(mac_mini_git_dirty)
BUILD_ID=${build_id}
EOF
}

mac_mini_load_release_state() {
  if [ -f "${MAC_MINI_RELEASE_FILE}" ]; then
    set -a
    # shellcheck disable=SC1090
    . "${MAC_MINI_RELEASE_FILE}"
    set +a
    return 0
  fi

  return 1
}

mac_mini_build_age_human() {
  if [ ! -f "${MAC_MINI_ROOT}/.next/BUILD_ID" ]; then
    echo missing
    return
  fi

  stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S %Z" "${MAC_MINI_ROOT}/.next/BUILD_ID" 2>/dev/null || echo unknown
}

mac_mini_build_if_needed() {
  local reason="existing-build"
  if ! mac_mini_build_is_present; then
    reason="missing-build"
    mac_mini_log "No usable build artifact found; running pnpm build."
    (
      cd "${MAC_MINI_ROOT}"
      pnpm build
    )
  fi

  mac_mini_write_release_state "${reason}"
}

mac_mini_preflight_summary() {
  local missing
  missing="$(mac_mini_missing_env_vars || true)"
  if [ -f "${MAC_MINI_ROOT}/.env.local" ] || [ -f "${MAC_MINI_ROOT}/.env" ]; then
    printf 'env_file=present\n'
  else
    printf 'env_file=missing\n'
  fi

  if [ -d "${MAC_MINI_ROOT}/node_modules" ]; then
    printf 'node_modules=present\n'
  else
    printf 'node_modules=missing\n'
  fi

  if mac_mini_build_is_present; then
    printf 'build=present\n'
  else
    printf 'build=missing\n'
  fi

  if [ -n "${missing}" ]; then
    printf 'env_ready=no missing=%s\n' "$(printf '%s' "${missing}" | tr '\n' ',' | sed 's/,$//')"
  else
    printf 'env_ready=yes\n'
  fi
}
