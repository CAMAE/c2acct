#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || {
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "bootstrap-mac-mini" \
    "Validate required commands and writable artifact paths" \
    "Run prisma generate" \
    "Run launch verification and baseline hardening verifiers"
  exit 0
fi

require_command node
require_command npm
require_command npx

macmini_run_job \
  "bootstrap-mac-mini" \
  1800 \
  1 \
  "${MAC_MINI_ROOT}" \
  bash -lc "cd '${ROOT_DIR}' && npx prisma generate && npm run verify:launch && npm run verify:ops-hardening && npm run verify:visibility-matrix"
