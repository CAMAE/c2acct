#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || {
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "sync-checks" \
    "Run membership/viewer-context verification" \
    "Run visibility matrix verification" \
    "Run repo hygiene verification"
  exit 0
fi

macmini_run_job \
  "sync-checks" \
  1800 \
  2 \
  "${MAC_MINI_ROOT}/runs/sync-checks" \
  bash -lc "cd '${ROOT_DIR}' && npm run verify:membership-viewer-context && npm run verify:visibility-matrix && npm run verify:repo-hygiene"
