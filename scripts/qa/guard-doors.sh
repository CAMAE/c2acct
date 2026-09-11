#!/bin/bash
# Link inventory guard runner (production-baseline box, 2026-09-11).
# Starts the built standalone twice — (1) production's flag set, (2) the Preview flag set —
# and runs tests/link-inventory.contract.test.ts against each. Fails if .next/standalone is
# missing (run `pnpm build` first) or if either run loses a production control without a ruling.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
[ -f .next/standalone/server.js ] || { echo "guard:doors: .next/standalone/server.js missing — run pnpm build first" >&2; exit 2; }
if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi
PROD_FLAGS="PAT_ENABLE_ALIGNMENT_BOARD=1 PAT_ENABLE_BATTLECARD=1 PAT_ENABLE_CONSULTANT_ACCESS=1 PAT_ENABLE_PAT_ASSISTANT=1 PAT_ENABLE_PINGS=1 PAT_ENABLE_SELF_SIGNUP=1"
PREVIEW_FLAGS="$PROD_FLAGS PAT_ENABLE_NEW_FRONT_DOOR=1 PAT_ENABLE_FOLLOWUP_MC=1 PAT_ENABLE_REGISTRY_MEMO=1"
status=0
run_one() { # label port flags
  local label=$1 port=$2 flags=$3
  env PAT_ENABLE_LOCAL_REVIEW_AUTH=1 $flags PORT=$port HOSTNAME=127.0.0.1 node .next/standalone/server.js > "/tmp/guard-doors-$label.log" 2>&1 &
  local pid=$!
  for i in $(seq 1 60); do sleep 1; curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$port/trust" | grep -q 200 && break; done
  LINK_INVENTORY_BASE_URL="http://127.0.0.1:$port" LINK_INVENTORY_LABEL="$label" pnpm exec vitest run tests/link-inventory.contract.test.ts || status=1
  kill $pid 2>/dev/null; wait $pid 2>/dev/null
}
run_one flags-off 3031 "$PROD_FLAGS"
run_one flags-as-preview 3032 "$PREVIEW_FLAGS"
exit $status
