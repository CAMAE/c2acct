#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3001}"
ROOT_DIR="${PWD}"
TMP_ROOT="${TMPDIR:-/tmp}"
PLAYWRIGHT_REPO_DIR="$(mktemp -d "${TMP_ROOT}/c2acct-playwright.XXXXXX")"

cleanup() {
  rm -rf "${PLAYWRIGHT_REPO_DIR}"
}

trap cleanup EXIT

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required to start the isolated Playwright dev server." >&2
  exit 1
fi

rsync -a \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude 'playwright-report' \
  --exclude 'test-results' \
  --exclude 'blob-report' \
  --exclude 'coverage' \
  "${ROOT_DIR}/" "${PLAYWRIGHT_REPO_DIR}/"

ln -s "${ROOT_DIR}/node_modules" "${PLAYWRIGHT_REPO_DIR}/node_modules"

if [ -f "${ROOT_DIR}/.env" ]; then
  ln -s "${ROOT_DIR}/.env" "${PLAYWRIGHT_REPO_DIR}/.env"
fi

if [ -f "${ROOT_DIR}/.env.local" ]; then
  ln -s "${ROOT_DIR}/.env.local" "${PLAYWRIGHT_REPO_DIR}/.env.local"
fi

cd "${PLAYWRIGHT_REPO_DIR}"
npx next dev --webpack -H 127.0.0.1 -p "${PORT}"
