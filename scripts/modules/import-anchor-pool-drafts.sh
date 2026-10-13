#!/usr/bin/env bash
# anchor-pool (R66, item 7): re-import the seven tagged bank headers as DRAFT
# templates ALONGSIDE the approved ones. Every template key carries the suffix
# "-pool", so no APPROVED template (and no row under it) is touched; a DRAFT
# template never serves. Dry run first, then --apply; stops on the first failure.
#
# Requires a DATABASE_URL already in the environment (the preview env pulled to a
# temp file and sourced, or the local .env.local through applyRepoEnv). Never
# prints an env value: the db host only.
#
#   bash scripts/modules/import-anchor-pool-drafts.sh            # dry run
#   bash scripts/modules/import-anchor-pool-drafts.sh --apply    # writes (idempotent)
set -euo pipefail
cd "$(dirname "$0")/../.."

APPLY=""
if [[ "${1:-}" == "--apply" ]]; then APPLY="--apply"; fi

echo "================ ANCHOR POOL DRAFTS — ${APPLY:-DRY RUN} ================"
echo "db host: $(node -e 'try{console.log(new URL(process.env.DATABASE_URL||"").hostname)}catch{console.log("(from .env.local)")}')"

LEGAL=docs/elite-sprint/legal
declare -a LEGAL_BANKS=(
  "OPERATING-MODEL|operating-model|Operating Model & Workflow Discipline|Operating Model and Workflow Discipline (Legal): Diagnostic v1, anchor pool draft"
  "AUTOMATION-AI|automation-ai|Automation & AI Readiness|Automation and AI Readiness (Legal): Diagnostic v1, anchor pool draft"
  "DATA-FLOW|data-flow|Integration & Data Flow Maturity|Integration and Data Flow Maturity (Legal): Diagnostic v1, anchor pool draft"
  "GOVERNANCE|governance|Governance & Controls|Governance, Controls and Vendor Risk (Legal): Diagnostic v1, anchor pool draft"
  "STRATEGY|strategy|Strategy & Change Readiness|Strategy, Change Readiness and Market Alignment (Legal): Diagnostic v1, anchor pool draft"
)
for spec in "${LEGAL_BANKS[@]}"; do
  IFS='|' read -r FILE SLUG CATEGORY TITLE <<<"$spec"
  echo; echo "---- legal $SLUG (qbank-legal-$SLUG-v1-pool) ----"
  PAT_ENABLE_VERTICAL_PACKS=1 PAT_DEFAULT_VERTICAL=legal \
  PAT_QBANK_DOC="$LEGAL/PATALIGN-QBANK-LEGAL-$FILE-V1-2026-09-29-IMPORT.md" \
  PAT_QBANK_TEMPLATE_KEY="qbank-legal-$SLUG-v1-pool" \
  PAT_QBANK_MODULE_TYPE=DIAGNOSTIC \
  PAT_QBANK_CATEGORY="$CATEGORY" \
  PAT_QBANK_TARGET_PATTERN="baseline-$SLUG-diagnostic" \
  PAT_QBANK_TITLE="$TITLE" \
  node --import tsx scripts/modules/import-qbank.ts $APPLY
done

echo; echo "---- accounting governance (qbank-gov-v1-pool) ----"
PAT_QBANK_DOC="docs/elite-sprint/PATALIGN-QBANK-GOVERNANCE-V1-2026-07-08.md" \
PAT_QBANK_TEMPLATE_KEY="qbank-gov-v1-pool" \
PAT_QBANK_MODULE_TYPE=DIAGNOSTIC \
PAT_QBANK_CATEGORY="Governance & Controls" \
PAT_QBANK_TARGET_PATTERN="baseline-governance-diagnostic" \
PAT_QBANK_TITLE="Governance, Controls and Vendor Risk: Diagnostic v1, anchor pool draft" \
node --import tsx scripts/modules/import-qbank.ts $APPLY

echo; echo "---- accounting integration (qbank-int-v1-pool) ----"
PAT_QBANK_DOC="docs/elite-sprint/PATALIGN-QBANK-INTEGRATION-V1-2026-07-08.md" \
PAT_QBANK_TEMPLATE_KEY="qbank-int-v1-pool" \
PAT_QBANK_MODULE_TYPE=STRENGTH \
PAT_QBANK_CATEGORY="Integration & Data Flow Maturity" \
PAT_QBANK_TARGET_PATTERN="baseline-integration-strength" \
PAT_QBANK_TITLE="Integration and Data Flow Maturity: Strength v1, anchor pool draft" \
node --import tsx scripts/modules/import-qbank.ts $APPLY

echo; echo "Anchor pool drafts complete (${APPLY:-DRY RUN}). Every template above is DRAFT with the -pool suffix; the approved templates are untouched."
