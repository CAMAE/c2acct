#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || {
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "recompute-jobs" \
    "Run trusted external-review verification" \
    "Run external-review concurrency verification" \
    "Write job status and heartbeat artifacts"
  exit 0
fi

macmini_run_job \
  "recompute-jobs" \
  1800 \
  2 \
  "${MAC_MINI_ROOT}/runs/recompute-jobs" \
  bash -lc "cd '${ROOT_DIR}' && npm run verify:external-review-trust && npm run verify:external-review-concurrency"
