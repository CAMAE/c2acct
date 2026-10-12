#!/usr/bin/env bash
# legal-load (R64; audit section 12 WORK 3, delta 1, delta 3): the import shell.
#
# Imports the five legal knowledge banks as DRAFT ModuleTemplates (90 items each,
# the charter-tagged six anchors per bank from the bank's own header line), then
# the legal taxonomy (40 buckets stamped legal), then the unlock rules that make an
# APPROVED legal template reachable (one rule per band for the bank's own module
# category; a DRAFT template stays unreachable, the publish gate is in
# lib/modules/unlock.ts). Dry run first, then --apply; stops on the first failure.
#
# Requires the vertical-packs flag and the legal default vertical in THIS shell
# only (section 12 ENVIRONMENT, import shell column), and a DATABASE_URL already in
# the environment. Never prints an env value.
#
#   bash scripts/modules/import-legal-banks.sh            # dry run of every step
#   bash scripts/modules/import-legal-banks.sh --apply    # writes (idempotent)
set -euo pipefail
cd "$(dirname "$0")/../.."

APPLY=""
if [[ "${1:-}" == "--apply" ]]; then APPLY="--apply"; fi

export PAT_ENABLE_VERTICAL_PACKS=1
export PAT_DEFAULT_VERTICAL=legal

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ABORT: DATABASE_URL is not set in this shell (load the target env first; nothing is printed)." >&2
  exit 1
fi

DOCS=docs/elite-sprint/legal
declare -a BANKS=(
  "OPERATING-MODEL|operating-model|Operating Model & Workflow Discipline|Operating Model and Workflow Discipline (Legal): Diagnostic v1"
  "AUTOMATION-AI|automation-ai|Automation & AI Readiness|Automation and AI Readiness (Legal): Diagnostic v1"
  "DATA-FLOW|data-flow|Integration & Data Flow Maturity|Integration and Data Flow Maturity (Legal): Diagnostic v1"
  "GOVERNANCE|governance|Governance & Controls|Governance, Controls and Vendor Risk (Legal): Diagnostic v1"
  "STRATEGY|strategy|Strategy & Change Readiness|Strategy, Change Readiness and Market Alignment (Legal): Diagnostic v1"
)

echo "================ LEGAL BANKS — ${APPLY:-DRY RUN} ================"
echo "vertical: $PAT_DEFAULT_VERTICAL (PAT_ENABLE_VERTICAL_PACKS=1) · db host: $(node -e 'try{console.log(new URL(process.env.DATABASE_URL).hostname)}catch{console.log("(unparsed)")}')"

for spec in "${BANKS[@]}"; do
  IFS='|' read -r FILE SLUG CATEGORY TITLE <<<"$spec"
  echo
  echo "---- bank $SLUG ----"
  PAT_QBANK_DOC="$DOCS/PATALIGN-QBANK-LEGAL-$FILE-V1-2026-09-29-IMPORT.md" \
  PAT_QBANK_TEMPLATE_KEY="qbank-legal-$SLUG-v1" \
  PAT_QBANK_MODULE_TYPE=DIAGNOSTIC \
  PAT_QBANK_CATEGORY="$CATEGORY" \
  PAT_QBANK_TARGET_PATTERN="baseline-$SLUG-diagnostic" \
  PAT_QBANK_TITLE="$TITLE" \
  node --import tsx scripts/modules/import-qbank.ts $APPLY
done

echo
echo "---- taxonomy legal ----"
node --import tsx scripts/import-accounting-taxonomy.ts --artifact=data/research/legal-software-taxonomy-v1.json --vertical=legal $APPLY

echo
echo "---- unlock rules legal ----"
node --import tsx scripts/modules/seed-legal-unlock-rules.ts $APPLY

echo
echo "Import shell complete (${APPLY:-DRY RUN}). Templates stay DRAFT until the approve line runs."
