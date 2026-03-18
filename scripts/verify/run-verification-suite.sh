#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

npx tsc --noEmit
npm run lint -- --no-cache
npm run verify:ops-hardening
npm run verify:visibility-matrix
npm run verify:external-review-trust
