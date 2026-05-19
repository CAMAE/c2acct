#!/usr/bin/env bash
set -euo pipefail

# AUDIT-D18-002 closer (Day-19 Block 1): switch the Playwright webServer
# from `next dev --webpack` to a standalone-built `node .next/standalone/server.js`.
# That's how parallel workers become safe (no per-request JIT contention)
# and the local-review runtime drops from ~3m to ~1m.
#
# Invoked from playwright.config.ts as the webServer command. Inherits the
# env Playwright was launched with (test:e2e:local-review sets
# PLAYWRIGHT_PORT, AUTH_URL, NEXTAUTH_URL, AUTH_SECRET,
# PAT_ENABLE_LOCAL_REVIEW_AUTH, PAT_ENABLE_CONSULTANT_ACCESS,
# PAT_LOCAL_REVIEW_PASSWORD). This wrapper adds:
#   - DATABASE_URL loaded from .env.local (next dev auto-loads; standalone
#     server does not)
#   - PORT, HOSTNAME, NODE_ENV
#   - Defaults for the auth/review env vars in case the caller didn't set
#     them (matches scripts/local-standalone.ts's resolveStandaloneEnv)
#
# Replaces the Day-14 isolated-tmp-dir + `next dev --webpack` pattern in
# scripts/run-playwright-dev.sh. The standalone server runs IN the
# canonical root (no rsync to tmp), which is required by the startup-guard.

# Capture the Playwright-requested port BEFORE sourcing .env.local
# (which has PORT=3000 for dev-mode local-standalone and would clobber).
PLAYWRIGHT_PORT_VALUE="${PLAYWRIGHT_PORT:-3001}"

# AUDIT-WS11-H-001: Capture AUTH_URL / NEXTAUTH_URL from the inherited
# Playwright env BEFORE sourcing .env.local. .env.local carries dev-mode
# values (http://127.0.0.1:3000) and `set -a` below would otherwise
# export those into our shell, overriding the test:e2e:local-review
# values from package.json. The defensive `${AUTH_URL:-default}` below
# only fires when AUTH_URL is empty/unset; if .env.local has made it
# non-empty, the defaults are skipped and the standalone server
# advertises port 3000 while binding port 3001 — ECONNREFUSED for any
# test using browser.newContext() (which doesn't inherit Playwright's
# baseURL and follows the auth-callback cookie to localhost:3000).
PLAYWRIGHT_AUTH_URL_VALUE="${AUTH_URL:-}"
PLAYWRIGHT_NEXTAUTH_URL_VALUE="${NEXTAUTH_URL:-}"

ROOT_DIR="${PWD}"
STANDALONE_SERVER="${ROOT_DIR}/.next/standalone/server.js"

if [ ! -f "${STANDALONE_SERVER}" ]; then
  echo "PAT e2e standalone webServer needs a fresh build; running pnpm build..." >&2
  pnpm build >&2
fi

if [ ! -f "${STANDALONE_SERVER}" ]; then
  echo "FATAL: ${STANDALONE_SERVER} still missing after pnpm build. Aborting." >&2
  exit 1
fi

# Load .env.local for DATABASE_URL and friends. next dev does this
# automatically; the standalone server does not.
if [ -f "${ROOT_DIR}/.env.local" ]; then
  # shellcheck disable=SC2046
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env.local"
  set +a
fi

# .env.local carries GitHub OAuth credentials for the standalone:local
# proof path. The e2e suite (specifically e2e/release-integrity.spec.ts:43
# "/login remains compatibility-only") asserts the sign-in page does NOT
# render the GitHub provider button. Under `next dev` this test passed
# because dev-mode Auth.js behavior differs; under the standalone server
# the GitHub provider is fully enabled when AUTH_GITHUB_ID/SECRET are set,
# breaking the assertion. Strip the GitHub creds from the e2e webServer
# env to match the local-review-auth-only contract the suite expects.
unset AUTH_GITHUB_ID AUTH_GITHUB_SECRET

# Now apply the e2e overrides AFTER .env.local so they win. macOS bash
# sets HOSTNAME to the machine hostname by default ("Camerons-Mini"),
# which Next.js would bind to a non-loopback interface — force loopback.
export PORT="${PLAYWRIGHT_PORT_VALUE}"
export HOSTNAME="127.0.0.1"
export NODE_ENV="production"
export AUTH_URL="${PLAYWRIGHT_AUTH_URL_VALUE:-http://127.0.0.1:${PORT}}"
export NEXTAUTH_URL="${PLAYWRIGHT_NEXTAUTH_URL_VALUE:-http://127.0.0.1:${PORT}}"
export AUTH_SECRET="${AUTH_SECRET:-pat-local-auth-secret}"
export PAT_ENABLE_LOCAL_REVIEW_AUTH="${PAT_ENABLE_LOCAL_REVIEW_AUTH:-1}"
export PAT_LOCAL_REVIEW_PASSWORD="${PAT_LOCAL_REVIEW_PASSWORD:-pat-local-review}"

cd "${ROOT_DIR}"
exec node "${STANDALONE_SERVER}"
