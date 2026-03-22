#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd pnpm
mac_mini_ensure_dirs
mac_mini_prune_artifacts
mac_mini_load_env

timestamp="$(mac_mini_timestamp)"
report_dir="${MAC_MINI_REPORT_DIR}/${timestamp}"
summary_file="${MAC_MINI_REPORT_DIR}/nightly-summary-${timestamp}.txt"
failure_count=0
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
  return 1
}

{
  printf 'timestamp=%s\n' "$(mac_mini_now_utc)"
  printf 'repo=%s\n' "${MAC_MINI_ROOT}"
  printf 'branch=%s\n' "$(git -C "${MAC_MINI_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  printf 'commit=%s\n' "$(git -C "${MAC_MINI_ROOT}" rev-parse --short HEAD 2>/dev/null || echo unknown)"
  printf 'host=%s\n' "${MAC_MINI_HOST}"
  printf 'port=%s\n' "${PORT}"
} > "${summary_file}"

if ! run_and_capture build pnpm build; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture lint pnpm lint; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture health bash "${SCRIPT_DIR}/health-check.sh"; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture status bash "${SCRIPT_DIR}/status.sh"; then
  failure_count=$((failure_count + 1))
fi

if ! run_and_capture disk df -h .; then
  failure_count=$((failure_count + 1))
fi

printf 'failures=%s\n' "${failure_count}" >> "${summary_file}"
cp "${summary_file}" "${MAC_MINI_STATE_DIR}/latest-nightly-summary.txt"
printf 'summary=%s\n' "${summary_file}"
if [ "${failure_count}" -gt 0 ]; then
  exit 1
fi
