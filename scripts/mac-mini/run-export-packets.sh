#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || {
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "export-packets" \
    "Generate the current-build audit bundle" \
    "Generate the verification bundle" \
    "Write export job artifacts and status files"
  exit 0
fi

macmini_run_job \
  "export-packets" \
  2400 \
  2 \
  "${EXPORT_DIR}" \
  bash -lc "cd '${ROOT_DIR}' && ./scripts/export/generate-audit-bundle.sh && ./scripts/export/generate-verification-bundle.sh"
