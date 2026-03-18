#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || {
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "healthcheck" \
    "Check required directories and shell scripts" \
    "Check node/npm/git/bash availability" \
    "Check .env.local presence and summarize current status files"
  exit 0
fi

missing=0
for dir in "${LOG_DIR}" "${STATUS_DIR}" "${HEARTBEAT_DIR}" "${RUN_DIR}" "${ROOT_DIR}/ops/mac-mini/launchd"; do
  if [[ ! -d "${dir}" ]]; then
    echo "Missing directory: ${dir}" >&2
    missing=1
  fi
done

for script_path in \
  "${ROOT_DIR}/scripts/mac-mini/setup-mac-mini.sh" \
  "${ROOT_DIR}/scripts/mac-mini/bootstrap-mac-mini.sh" \
  "${ROOT_DIR}/scripts/mac-mini/run-nightly-verification.sh" \
  "${ROOT_DIR}/scripts/mac-mini/run-export-packets.sh" \
  "${ROOT_DIR}/scripts/mac-mini/run-smoke-suite.sh"; do
  if [[ ! -f "${script_path}" ]]; then
    echo "Missing script: ${script_path}" >&2
    missing=1
  fi
done

for tool in bash git node npm; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "Missing tool: ${tool}" >&2
    missing=1
  fi
done

if [[ ! -f "${ROOT_DIR}/.env.local" ]]; then
  echo "Missing .env.local at ${ROOT_DIR}/.env.local" >&2
  missing=1
fi

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

echo "Mac mini repo-side healthcheck passed."
echo "Status directory: ${STATUS_DIR}"
echo "Heartbeat directory: ${HEARTBEAT_DIR}"
