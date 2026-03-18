#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || {
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "smoke-suite" \
    "Run launch verification" \
    "Run ops-hardening verification" \
    "Write smoke status and logs"
  exit 0
fi

macmini_run_job \
  "smoke-suite" \
  1800 \
  2 \
  "${MAC_MINI_ROOT}/runs/smoke-suite" \
  bash -lc "cd '${ROOT_DIR}' && npm run verify:launch && npm run verify:ops-hardening"
