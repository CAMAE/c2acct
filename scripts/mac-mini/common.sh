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
MAC_MINI_CONTRACT_FILE="${MAC_MINI_ROOT}/ops/release/canonical-root.json"
MAC_MINI_CANONICAL_STATE_FILE="${MAC_MINI_STATE_DIR}/canonical-root.json"
MAC_MINI_DEV_ROOT="/Users/camerongarrett/work/c2acct"
MAC_MINI_CANONICAL_ROOT=""
MAC_MINI_AUTH_MODE=""
MAC_MINI_RUNTIME_SOURCE_TYPE=""
MAC_MINI_START_COMMAND=""

mac_mini_now_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

mac_mini_timestamp() {
  date -u +"%Y%m%dT%H%M%SZ"
}

mac_mini_require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

mac_mini_contract_value() {
  local field="$1"
  node --input-type=module -e "import fs from 'node:fs'; const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); const value = data[process.argv[2]]; if (Array.isArray(value)) { console.log(value.join('\n')); } else if (value !== undefined && value !== null) { console.log(String(value)); }" "${MAC_MINI_CONTRACT_FILE}" "${field}"
}

mac_mini_load_contract() {
  MAC_MINI_CANONICAL_ROOT="$(mac_mini_contract_value canonicalRoot)"
  MAC_MINI_AUTH_MODE="$(mac_mini_contract_value authMode)"
  MAC_MINI_RUNTIME_SOURCE_TYPE="$(mac_mini_contract_value runtimeSourceType)"
  MAC_MINI_START_COMMAND="$(mac_mini_contract_value startCommand)"
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

mac_mini_prune_artifacts() {
  find "${MAC_MINI_LOG_DIR}" -type f -mtime +14 -delete 2>/dev/null || true
  find "${MAC_MINI_REPORT_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true
  find "${MAC_MINI_REPORT_DIR}" -type f -mtime +30 -delete 2>/dev/null || true

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

mac_mini_plist_working_directory() {
  local plist_path="$1"
  if [ ! -f "${plist_path}" ]; then
    return 1
  fi

  sed -n '/<key>WorkingDirectory<\/key>/{n;s#.*<string>\(.*\)</string>.*#\1#;p;q;}' "${plist_path}"
}

mac_mini_plist_root_status() {
  local plist_path="$1"
  local root

  if [ ! -f "${plist_path}" ]; then
    printf 'missing'
    return 0
  fi

  root="$(mac_mini_plist_working_directory "${plist_path}" || true)"
  if [ -z "${root}" ]; then
    printf 'unknown'
    return 0
  fi

  if [ "${root}" = "${MAC_MINI_CANONICAL_ROOT}" ]; then
    printf 'canonical'
  else
    printf 'mismatch'
  fi
}

mac_mini_has_launchctl() {
  command -v launchctl >/dev/null 2>&1
}

mac_mini_git_branch() {
  git -C "${MAC_MINI_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown
}

mac_mini_git_commit() {
  # Pinned to 7 chars to match the JS side. lib/release/fingerprint.ts:200
  # and scripts/release/prepare-standalone-runtime.mjs:96 both compute the
  # commit short as commitSha.slice(0, 7). `git rev-parse --short HEAD`
  # without `=7` lets git's auto-extend heuristic return 8+ chars when the
  # prefix isn't unique enough, which then trips
  # validate-source-integrity.mjs's release_state_COMMIT_mismatch check
  # (e.g. expected=fc69af0 actual=fc69af0b). `--short=7` pins both sides
  # to the same shape.
  git -C "${MAC_MINI_ROOT}" rev-parse --short=7 HEAD 2>/dev/null || echo unknown
}

mac_mini_git_commit_full() {
  git -C "${MAC_MINI_ROOT}" rev-parse HEAD 2>/dev/null || echo unknown
}

mac_mini_git_dirty() {
  (
    cd "${MAC_MINI_ROOT}"
    node --import tsx scripts/release/read-release-git-dirty.ts --root "${MAC_MINI_ROOT}" --format state
  )
}

mac_mini_missing_env_vars() {
  local missing=()

  [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
  if [ -z "${AUTH_SECRET:-}" ] && [ -z "${NEXTAUTH_SECRET:-}" ]; then
    missing+=("AUTH_SECRET_OR_NEXTAUTH_SECRET")
  fi
  if [ -z "${AUTH_URL:-}" ] && [ -z "${NEXTAUTH_URL:-}" ]; then
    missing+=("AUTH_URL_OR_NEXTAUTH_URL")
  fi

  if [ "${MAC_MINI_AUTH_MODE}" = "github" ]; then
    [ -n "${AUTH_GITHUB_ID:-}" ] || missing+=("AUTH_GITHUB_ID")
    [ -n "${AUTH_GITHUB_SECRET:-}" ] || missing+=("AUTH_GITHUB_SECRET")
  fi

  if [ "${PAT_ENABLE_LOCAL_REVIEW_AUTH:-0}" = "1" ] && [ -z "${PAT_LOCAL_REVIEW_PASSWORD:-}" ]; then
    missing+=("PAT_LOCAL_REVIEW_PASSWORD")
  fi

  if [ "${#missing[@]}" -gt 0 ]; then
    printf '%s\n' "${missing[@]}"
  fi
}

mac_mini_origin_is_loopback() {
  case "$1" in
    http://127.0.0.1:*|https://127.0.0.1:*|http://localhost:*|https://localhost:*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

mac_mini_local_review_runtime_allowed() {
  local origin

  for origin in \
    "${AUTH_URL:-}" \
    "${NEXTAUTH_URL:-}" \
    "${PAT_LOCAL_ORIGIN:-}" \
    "${MAC_MINI_PUBLIC_ORIGIN:-}"
  do
    if [ -n "${origin}" ] && mac_mini_origin_is_loopback "${origin}"; then
      return 0
    fi
  done

  return 1
}

mac_mini_assert_runtime_root_allowed() {
  if [ "${MAC_MINI_ROOT}" != "${MAC_MINI_CANONICAL_ROOT}" ]; then
    echo "Runtime root mismatch: expected ${MAC_MINI_CANONICAL_ROOT}, got ${MAC_MINI_ROOT}" >&2
    exit 1
  fi

  if [ "${MAC_MINI_ROOT}" = "${MAC_MINI_DEV_ROOT}" ]; then
    echo "Development workspace is forbidden as a live root." >&2
    exit 1
  fi

  case "${MAC_MINI_ROOT}" in
    /private/tmp/*)
      echo "Temporary roots are forbidden for live runtime." >&2
      exit 1
      ;;
  esac
}

mac_mini_assert_clean_root() {
  if [ "$(mac_mini_git_dirty)" != "clean" ]; then
    echo "Dirty git tree is forbidden for startup." >&2
    exit 1
  fi
}

mac_mini_startup_dirty_verdict() {
  (
    cd "${MAC_MINI_ROOT}"
    node --import tsx scripts/release/read-release-git-dirty.ts --root "${MAC_MINI_ROOT}" --format startup
  )
}

# Like mac_mini_assert_clean_root, with ONE exact-path exemption: a working tree
# whose entire diff is PATALIGN-MEMORY/SESSION-LEDGER.md starts.
#
# The launch gate exists to stop unbuilt code from starting. The session ledger
# is an out-of-band record that appends on its own cadence, independent of the
# build — it has appended DURING a fifteen-minute validate:launch and failed the
# final step on a tree whose every other gate had passed. Banking right before a
# run only shrinks that window; exempting the one path removes the race.
#
# Sole-file only. Ledger + anything else is still forbidden, because once real
# work is in the tree the original reason applies again and the ledger must not
# launder it.
#
# USED BY EXACTLY TWO SCRIPTS, and the pairing is the whole point:
#
#   restart-app.sh — decides whether to kickstart.
#   app-start.sh   — what launchd actually spawns, and the real enforcement point.
#
# Exempting only the first was a foot-gun, and shipping it proved so: restart
# passed the gate, `launchctl kickstart -k` killed the running app, and the
# respawned app-start.sh refused the same ledger-dirty tree and crash-looped
# ~40k times with no listener. The exemption has to live where the gate is
# actually enforced, or it converts "refuse to restart, app keeps running" into
# "kill the app and fail to bring it back".
#
# launchd-install.sh, rollback-release.sh and validate-runtime-contract.sh keep
# the strict check.
mac_mini_assert_clean_root_allowing_ledger() {
  local verdict
  verdict="$(mac_mini_startup_dirty_verdict)"
  case "${verdict}" in
    clean) return 0 ;;
    ledger-only)
      echo "[startup] working tree carries only PATALIGN-MEMORY/SESSION-LEDGER.md; treating as clean." >&2
      return 0
      ;;
    *)
      echo "Dirty git tree is forbidden for startup." >&2
      exit 1
      ;;
  esac
}

mac_mini_assert_env_ready() {
  local missing
  missing="$(mac_mini_missing_env_vars || true)"
  if [ -n "${missing}" ]; then
    echo "Missing required environment variables:" >&2
    printf '%s\n' "${missing}" >&2
    exit 1
  fi

  if [ "${PAT_ENABLE_LOCAL_REVIEW_AUTH:-0}" = "1" ] && ! mac_mini_local_review_runtime_allowed; then
    echo "PAT_ENABLE_LOCAL_REVIEW_AUTH=1 is allowed only for loopback-local PAT runtimes." >&2
    exit 1
  fi
}

mac_mini_build_is_present() {
  [ -f "${MAC_MINI_ROOT}/.next/BUILD_ID" ]
}

mac_mini_standalone_server_path() {
  printf '%s/.next/standalone/server.js' "${MAC_MINI_ROOT}"
}

mac_mini_standalone_server_present() {
  [ -f "$(mac_mini_standalone_server_path)" ]
}

mac_mini_standalone_static_present() {
  [ -d "${MAC_MINI_ROOT}/.next/standalone/.next/static" ]
}

mac_mini_standalone_public_present() {
  [ -d "${MAC_MINI_ROOT}/.next/standalone/public" ]
}

mac_mini_prepare_runtime_assets() {
  (
    cd "${MAC_MINI_ROOT}"
    node scripts/release/prepare-standalone-runtime.mjs >/dev/null
  )
}

mac_mini_release_fingerprint_seed() {
  printf '%s|%s|%s|%s' \
    "${MAC_MINI_CANONICAL_ROOT}" \
    "$(mac_mini_git_commit_full)" \
    "${MAC_MINI_AUTH_MODE}" \
    "${MAC_MINI_RUNTIME_SOURCE_TYPE}" \
    | shasum -a 256 | awk '{print $1}'
}

mac_mini_existing_release_value() {
  local key="$1"
  if [ ! -f "${MAC_MINI_RELEASE_FILE}" ]; then
    return 1
  fi

  awk -F= -v key="${key}" '$1 == key { print substr($0, length(key) + 2); exit }' "${MAC_MINI_RELEASE_FILE}"
}

mac_mini_build_time_for_release_state() {
  local branch="$1"
  local commit="$2"
  local git_dirty="$3"
  local build_id="$4"
  local existing_build_time

  existing_build_time="$(mac_mini_existing_release_value BUILD_TIME_UTC || true)"
  if [ -n "${existing_build_time}" ] \
    && [ "$(mac_mini_existing_release_value BRANCH || true)" = "${branch}" ] \
    && [ "$(mac_mini_existing_release_value COMMIT || true)" = "${commit}" ] \
    && [ "$(mac_mini_existing_release_value GIT_DIRTY || true)" = "${git_dirty}" ] \
    && [ "$(mac_mini_existing_release_value BUILD_ID || true)" = "${build_id}" ]; then
    printf '%s\n' "${existing_build_time}"
    return 0
  fi

  mac_mini_now_utc
}

mac_mini_write_release_state() {
  local build_reason="$1"
  local build_id="missing"
  local branch
  local commit
  local git_dirty
  local build_time

  if mac_mini_build_is_present; then
    build_id="$(cat "${MAC_MINI_ROOT}/.next/BUILD_ID" 2>/dev/null || echo missing)"
  fi

  branch="$(mac_mini_git_branch)"
  commit="$(mac_mini_git_commit)"
  git_dirty="$(mac_mini_git_dirty)"
  build_time="$(mac_mini_build_time_for_release_state "${branch}" "${commit}" "${git_dirty}" "${build_id}")"

  cat > "${MAC_MINI_RELEASE_FILE}" <<EOF
BUILD_TIME_UTC=${build_time}
BUILD_REASON=${build_reason}
BRANCH=${branch}
COMMIT=${commit}
GIT_DIRTY=${git_dirty}
BUILD_ID=${build_id}
EOF
}

mac_mini_write_canonical_state() {
  local build_reason="$1"
  mac_mini_ensure_dirs
  # Atomic write via tmp+mv. The heredoc body invokes mac_mini_git_dirty
  # and mac_mini_release_fingerprint_seed, both of which spawn
  # `node --import tsx ...` (1-3s each). Redirecting `cat > "$FILE"`
  # truncates the destination before the body finishes evaluating, which
  # leaves the file briefly empty on disk — a launchd-restart's RootLayout
  # render landing inside that window reads "" and JSON.parse throws.
  # Writing to a sibling temp file and renaming makes the publish atomic
  # so concurrent readers never see a truncated state file.
  local tmp_file="${MAC_MINI_CANONICAL_STATE_FILE}.tmp.$$"
  cat > "${tmp_file}" <<EOF
{
  "schemaVersion": 1,
  "canonicalRoot": "${MAC_MINI_CANONICAL_ROOT}",
  "authMode": "${MAC_MINI_AUTH_MODE}",
  "runtimeSourceType": "${MAC_MINI_RUNTIME_SOURCE_TYPE}",
  "startCommand": "${MAC_MINI_START_COMMAND}",
  "branch": "$(mac_mini_git_branch)",
  "commitSha": "$(mac_mini_git_commit_full)",
  "gitDirty": "$(mac_mini_git_dirty)",
  "releaseFingerprintSeed": "$(mac_mini_release_fingerprint_seed)",
  "writtenAt": "$(mac_mini_now_utc)",
  "buildReason": "${build_reason}"
}
EOF
  mv -f "${tmp_file}" "${MAC_MINI_CANONICAL_STATE_FILE}"
}

mac_mini_write_expected_live_release() {
  mac_mini_ensure_dirs
  # Same atomic-publish discipline as mac_mini_write_canonical_state: the
  # redirected node invocation can take 1-2s to emit JSON, so writing
  # directly to the destination exposes a truncated-file race.
  local tmp_file="${MAC_MINI_STATE_DIR}/expected-live-release.json.tmp.$$"
  (
    cd "${MAC_MINI_ROOT}"
    node --import tsx scripts/release/read-release-fingerprint.ts
  ) > "${tmp_file}"
  mv -f "${tmp_file}" "${MAC_MINI_STATE_DIR}/expected-live-release.json"
  mac_mini_sync_release_proof_to_standalone
}

mac_mini_assert_release_artifacts_agree() {
  (
    cd "${MAC_MINI_ROOT}"
    node scripts/release/validate-source-integrity.mjs --root "${MAC_MINI_ROOT}" >/dev/null
  )
}

mac_mini_sync_release_proof_to_standalone() {
  local standalone_root="${MAC_MINI_ROOT}/.next/standalone"
  local standalone_state_dir="${standalone_root}/artifacts/mac-mini/state"
  local standalone_ops_dir="${standalone_root}/ops"

  if [ ! -d "${standalone_root}" ]; then
    return 0
  fi

  mkdir -p "${standalone_state_dir}" "${standalone_ops_dir}"
  rm -rf "${standalone_ops_dir}/release"
  cp -R "${MAC_MINI_ROOT}/ops/release" "${standalone_ops_dir}/release"

  for state_file in \
    release-state.env \
    canonical-root.json \
    expected-live-release.json \
    last-known-good-release.json
  do
    if [ -f "${MAC_MINI_STATE_DIR}/${state_file}" ]; then
      cp "${MAC_MINI_STATE_DIR}/${state_file}" "${standalone_state_dir}/${state_file}"
    fi
  done
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
  if ! mac_mini_standalone_server_present; then
    reason="missing-build"
    mac_mini_log "No usable standalone build artifact found; running pnpm build."
    (
      cd "${MAC_MINI_ROOT}"
      pnpm build
    )
  fi

  if ! mac_mini_standalone_server_present; then
    echo "Standalone server artifact is missing after build." >&2
    exit 1
  fi

  if ! mac_mini_standalone_static_present || ! mac_mini_standalone_public_present; then
    mac_mini_log "Standalone runtime assets are incomplete; repairing static and public packaging."
  fi
  mac_mini_prepare_runtime_assets

  if ! mac_mini_standalone_static_present; then
    echo "Standalone static assets are missing after packaging repair." >&2
    exit 1
  fi

  if ! mac_mini_standalone_public_present; then
    echo "Standalone public assets are missing after packaging repair." >&2
    exit 1
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

  if mac_mini_standalone_server_present; then
    printf 'standalone=present\n'
  else
    printf 'standalone=missing\n'
  fi

  printf 'canonical_root=%s\n' "${MAC_MINI_CANONICAL_ROOT}"
  printf 'auth_mode=%s\n' "${MAC_MINI_AUTH_MODE}"
  printf 'start_command=%s\n' "${MAC_MINI_START_COMMAND}"

  if [ -n "${missing}" ]; then
    printf 'env_ready=no missing=%s\n' "$(printf '%s' "${missing}" | tr '\n' ',' | sed 's/,$//')"
  else
    printf 'env_ready=yes\n'
  fi
}

mac_mini_check_mode() {
  mac_mini_require_cmd node
  mac_mini_require_cmd git
  mac_mini_require_cmd shasum
  mac_mini_load_contract
  mac_mini_load_env
  mac_mini_assert_runtime_root_allowed
  mac_mini_assert_clean_root
  mac_mini_assert_env_ready
  printf '%s\n' "$(mac_mini_preflight_summary)"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  mode="check"
  for arg in "$@"; do
    case "${arg}" in
      --check) mode="check" ;;
      --dry-run) mode="dry-run" ;;
      *) ;;
    esac
  done

  mac_mini_check_mode
  printf 'mode=%s\n' "${mode}"
fi
