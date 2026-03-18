#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAMP="${AUDIT_BUNDLE_TIMESTAMP:-$(date -u +"%Y%m%dT%H%M%SZ")}"
BUNDLE_ROOT="${ROOT_DIR}/artifacts/audit-bundles/${STAMP}"
OUT_DIR="${BUNDLE_ROOT}/verification"
mkdir -p "${OUT_DIR}/logs"

run_capture() {
  local name="$1"
  shift
  local log_path="${OUT_DIR}/logs/${name}.log"
  if "$@" > "${log_path}" 2>&1; then
    printf '%s\t0\t%s\n' "${name}" "${log_path}" >> "${OUT_DIR}/command-results.tsv"
  else
    local exit_code=$?
    printf '%s\t%s\t%s\n' "${name}" "${exit_code}" "${log_path}" >> "${OUT_DIR}/command-results.tsv"
  fi
}

: > "${OUT_DIR}/command-results.tsv"

run_capture "tsc" npx tsc --noEmit
run_capture "build" npm run build
run_capture "lint" npm run lint -- --no-cache
run_capture "verify_ops_hardening" npm run verify:ops-hardening
run_capture "verify_visibility_matrix" npm run verify:visibility-matrix
run_capture "verify_external_review_trust" npm run verify:external-review-trust
run_capture "verify_external_review_concurrency" npm run verify:external-review-concurrency
run_capture "verify_membership_viewer_context" npm run verify:membership-viewer-context
run_capture "verify_product_intelligence_gates" npm run verify:product-intelligence-gates
run_capture "verify_product_intelligence_unification" npm run verify:product-intelligence-unification
run_capture "verify_learning_content" npm run verify:learning-content
run_capture "verify_repo_hygiene" npm run verify:repo-hygiene
run_capture "verify_audit_closure" npm run verify:audit-closure
run_capture "verify_read_path_purity" node --experimental-strip-types scripts/verify-read-path-purity.ts
run_capture "verify_operator_surface_auth" node --experimental-strip-types scripts/verify-operator-surface-auth.ts
run_capture "verify_admin_operator_auth" node --experimental-strip-types scripts/verify-admin-operator-auth.ts

if node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.test ? 0 : 1)"; then
  run_capture "test" npm test
else
  printf 'test\tmissing\tno npm test script present\n' >> "${OUT_DIR}/command-results.tsv"
fi

cat > "${OUT_DIR}/VERIFICATION_PACKET_INDEX.md" <<EOF
# Verification Packet Index

Bundle timestamp: ${STAMP}

Command results are in \`command-results.tsv\`.
Detailed logs are in \`logs/\`.

If a command is marked \`missing\`, the repo did not expose that script.
EOF

echo "Verification bundle generated at ${OUT_DIR}"
