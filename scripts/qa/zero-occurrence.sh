#!/bin/bash
# 3f WORK 9: zero-occurrence greps over the WORK 8 paths (app, lib, prisma, scripts, data and
# ~/work/preview-accounts.txt). Prints a count per phrase with the matches; exit 1 if any phrase
# is found. "Combined evidence" counts rendered headings only (the flag-off prop default in
# InsightDetailShell stays, per the box); this script excludes itself.
cd "$(dirname "$0")/../.."
PATHS="app lib prisma scripts data"
EXTRA="$HOME/work/preview-accounts.txt"
SELF="scripts/qa/zero-occurrence.sh"
rc=0
for phrase in "Current operating picture" "Trust Center" "Informational, not professional advice" "peer-validated" "PAT is summarizing" "Combined evidence" "Return to C2Acct" "C2Acct" "C2 Acct"; do
  hits=$(grep -rnF -- "$phrase" $PATHS $EXTRA 2>/dev/null | grep -v "node_modules\|^$SELF:")
  if [ "$phrase" = "Combined evidence" ]; then hits=$(echo "$hits" | grep -v 'combinedEvidenceLabel = "Combined evidence"' | grep -v "^$"); fi
  n=$(echo -n "$hits" | grep -c "^" )
  echo "$phrase: $n"
  [ -n "$hits" ] && echo "$hits" | cut -c1-140 | sed 's/^/   /'
  [ "$n" != "0" ] && rc=1
done
inf=$(grep -rn "c2acct" $PATHS $EXTRA 2>/dev/null | grep -v "node_modules\|^$SELF:" | wc -l | tr -d ' ')
echo "c2acct (case-sensitive; infrastructure identifiers only: repo path, container/db name, launchd label, Vercel host, export names): $inf"
grep -rn "c2acct" $PATHS $EXTRA 2>/dev/null | grep -v "node_modules\|^$SELF:" | cut -d: -f1 | sort | uniq -c
exit $rc
