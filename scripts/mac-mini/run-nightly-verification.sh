#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || {
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "nightly-verification" \
    "Run scripts/verify/run-verification-suite.sh" \
    "Run build verification" \
    "Write status, heartbeat, stdout, and stderr artifacts"
  exit 0
fi

macmini_run_job \
  "nightly-verification" \
  3600 \
  2 \
  "${ROOT_DIR}/artifacts/audit-bundles/latest/verification" \
  bash -lc "cd '${ROOT_DIR}' && ./scripts/verify/run-verification-suite.sh && npm run build"
