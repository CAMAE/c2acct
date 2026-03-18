#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAMP="${AUDIT_BUNDLE_TIMESTAMP:-$(date -u +"%Y%m%dT%H%M%SZ")}"
BUNDLE_ROOT="${ROOT_DIR}/artifacts/audit-bundles/${STAMP}"
LATEST_ROOT="${ROOT_DIR}/artifacts/audit-bundles/latest"

rm -rf "${BUNDLE_ROOT}"
mkdir -p "${BUNDLE_ROOT}/current-build-audit" "${BUNDLE_ROOT}/audit-docs" "${BUNDLE_ROOT}/final-docs" "${BUNDLE_ROOT}/research" "${BUNDLE_ROOT}/learning" "${BUNDLE_ROOT}/ops/mac-mini"

AUDIT_OUT_DIR="${BUNDLE_ROOT}/current-build-audit" bash "${ROOT_DIR}/scripts/audit/generate-current-build-audit.sh"

cp "${ROOT_DIR}"/audit/*.md "${BUNDLE_ROOT}/audit-docs/"
cp "${ROOT_DIR}"/FINAL_*.md "${BUNDLE_ROOT}/final-docs/"
cp "${ROOT_DIR}"/research/*.md "${BUNDLE_ROOT}/research/"
cp -R "${ROOT_DIR}/content/user-learning" "${BUNDLE_ROOT}/learning/"
cp -R "${ROOT_DIR}/ops/mac-mini" "${BUNDLE_ROOT}/ops/"
cp -R "${ROOT_DIR}/scripts/mac-mini" "${BUNDLE_ROOT}/ops/"

cat > "${BUNDLE_ROOT}/README.md" <<EOF
# Audit Bundle

Bundle timestamp: ${STAMP}

Sections:

- \`current-build-audit/\`
- \`audit-docs/\`
- \`final-docs/\`
- \`research/\`
- \`learning/user-learning/\`
- \`ops/mac-mini/\`
- \`ops/scripts/mac-mini/\`

This packet is deterministic by timestamp and excludes secrets.
EOF

rm -rf "${LATEST_ROOT}"
mkdir -p "${ROOT_DIR}/artifacts/audit-bundles"
cp -R "${BUNDLE_ROOT}" "${LATEST_ROOT}"
printf '%s\n' "${STAMP}" > "${ROOT_DIR}/artifacts/audit-bundles/LATEST_BUNDLE.txt"
printf '%s\n' "${BUNDLE_ROOT}" > "${ROOT_DIR}/artifacts/audit-bundles/LATEST_BUNDLE_PATH.txt"

echo "Audit bundle generated at ${BUNDLE_ROOT}"
