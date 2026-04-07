#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd pnpm
mac_mini_ensure_dirs
mac_mini_prune_artifacts
mac_mini_load_contract
mac_mini_load_env

timestamp="$(mac_mini_timestamp)"
report_dir="${MAC_MINI_REPORT_DIR}/${timestamp}"
summary_file="${MAC_MINI_REPORT_DIR}/nightly-summary-${timestamp}.txt"
failure_count=0
failed_steps=()
mkdir -p "${report_dir}"

run_and_capture() {
  local name="$1"
  shift
  local output_file="${report_dir}/${name}.log"

  if (cd "${MAC_MINI_ROOT}" && "$@") >"${output_file}" 2>&1; then
    printf 'ok %s\n' "${name}" >> "${summary_file}"
    return 0
  fi

  printf 'fail %s\n' "${name}" >> "${summary_file}"
  failed_steps+=("${name}")
  return 1
}

{
  printf 'timestamp=%s\n' "$(mac_mini_now_utc)"
  printf 'repo=%s\n' "${MAC_MINI_ROOT}"
  printf 'branch=%s\n' "$(mac_mini_git_branch)"
  printf 'commit=%s\n' "$(mac_mini_git_commit)"
  printf 'git_dirty=%s\n' "$(mac_mini_git_dirty)"
  printf 'host=%s\n' "${MAC_MINI_HOST}"
  printf 'port=%s\n' "${PORT}"
  printf '%s\n' "$(mac_mini_preflight_summary)"
} > "${summary_file}"

if ! run_and_capture build pnpm build; then
  failure_count=$((failure_count + 1))
else
  mac_mini_write_release_state "nightly-verify"
  node --import tsx "${MAC_MINI_ROOT}/scripts/release/read-release-fingerprint.ts" > "${MAC_MINI_STATE_DIR}/expected-live-release.json"
fi

if ! run_and_capture lint pnpm lint; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture source_integrity node scripts/release/validate-source-integrity.mjs --root "${MAC_MINI_ROOT}"; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture approved_pat_markers node scripts/release/verify-approved-pat-markers.mjs --root "${MAC_MINI_ROOT}"; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture health bash "${SCRIPT_DIR}/health-check.sh"; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture status bash "${SCRIPT_DIR}/status.sh"; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture host_cutover_proof bash "${SCRIPT_DIR}/port-owner-proof.sh" --check; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture live_pat_surfaces node scripts/release/validate-pat-surfaces.mjs --root "${MAC_MINI_ROOT}" --base-url "$(mac_mini_app_url | sed 's#/$##')"; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture disk df -h .; then
  failure_count=$((failure_count + 1))
fi

mac_mini_load_release_state || true
printf 'release_build_id=%s\n' "${BUILD_ID:-missing}" >> "${summary_file}"
printf 'release_build_time=%s\n' "${BUILD_TIME_UTC:-unknown}" >> "${summary_file}"
printf 'release_build_reason=%s\n' "${BUILD_REASON:-unknown}" >> "${summary_file}"
printf 'failures=%s\n' "${failure_count}" >> "${summary_file}"
if [ "${#failed_steps[@]}" -gt 0 ]; then
  printf 'failed_steps=%s\n' "$(IFS=,; printf '%s' "${failed_steps[*]}")" >> "${summary_file}"
fi

if [ -f "${report_dir}/health.log" ]; then
  printf 'health_summary=%s\n' "$(tr '\n' ' ' < "${report_dir}/health.log" | sed 's/[[:space:]]\+/ /g')" >> "${summary_file}"
fi

if [ -f "${report_dir}/status.log" ]; then
  printf 'status_summary=%s\n' "$(grep -E '^(branch|commit|listen|health|build_id|build_time|release_id|fingerprint_commit_sha|fingerprint_auth_mode|launchd_service_state|live_port_owner_state|live_port_owner_pid|live_release_id|ownership_check|ownership_failures|last_verify)=' "${report_dir}/status.log" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')" >> "${summary_file}"
fi

if [ -f "${report_dir}/host_cutover_proof.log" ]; then
  printf 'host_cutover_summary=%s\n' "$(grep -E '^(launchd_service_state|live_port_owner_state|live_port_owner_pid|live_release_probe_http|live_release_id|expected_release_id|ownership_check|ownership_failures)=' "${report_dir}/host_cutover_proof.log" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')" >> "${summary_file}"
fi

if [ "${failure_count}" -eq 0 ] && [ -f "${MAC_MINI_STATE_DIR}/expected-live-release.json" ]; then
  if [ -f "${MAC_MINI_STATE_DIR}/last-known-good-release.json" ]; then
    cp "${MAC_MINI_STATE_DIR}/last-known-good-release.json" "${MAC_MINI_STATE_DIR}/previous-known-good-release.json"
  fi
  cp "${MAC_MINI_STATE_DIR}/expected-live-release.json" "${MAC_MINI_STATE_DIR}/last-known-good-release.json"
fi

cp "${summary_file}" "${MAC_MINI_STATE_DIR}/latest-nightly-summary.txt"
printf 'summary=%s\n' "${summary_file}"
if [ "${failure_count}" -gt 0 ]; then
  exit 1
fi
