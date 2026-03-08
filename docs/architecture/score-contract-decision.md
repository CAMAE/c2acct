# Score Contract Decision (Repo-State Grounded)

Date: 2026-03-05
Scope: Planning artifact only (no code changes)

## 1. Executive Decision
**Decision:** Minor scoring alignment patch is still needed.

Rationale:
- The browser UI currently constrains slider answers to `1..5`.
- The submit route currently scores with `scaleMin: 0, scaleMax: 5`.
- This is mathematically valid but semantically misaligned with the active UI contract (effective floor becomes 20, not 0).

## 2. Current Observed Contract In Repo
### UI input range
- `app/survey/[key]/page.tsx` renders slider inputs with `min={1}`, `max={5}`, `step={1}`.

### Submit-route scoring range
- `app/api/survey/submit/route.ts` calls:
- `computeScore({ answers, scaleMin: 0, scaleMax: 5 })`

### Normalization behavior
- `lib/scoring.ts` computes:
- `score = round(((weightedAvg - scaleMin) / (scaleMax - scaleMin)) * 100)`
- Stores back `scaleMin`, `scaleMax`, `weightedAvg`, `answeredCount`, and `score`.

### Score shape used by results/outputs
- `app/results/page.tsx` reads protected `/api/results` and renders `result.score` as a percent plus `result.weightedAvg`.
- `app/outputs/page.tsx` reads protected `/api/results` and uses `result.score`, `result.weightedAvg`, and `result.signalIntegrityScore` for raw and integrity-adjusted display.

## 3. Mismatch Analysis
A real (but minor) mismatch still exists.

Exact mismatch:
- `app/survey/[key]/page.tsx` emits values in `1..5`.
- `app/api/survey/submit/route.ts` normalizes as if the domain is `0..5`.

Why this matters:
- With current UI, the lowest selectable answer maps to `20%` instead of `0%`.
- This is likely acceptable for temporary operation, but it is not a clean single-source score contract.

What is already consistent:
- Results and outputs pages consume the same persisted score fields from protected APIs.
- No current client/server disagreement on result payload shape for score display.

## 4. Badge / Threshold Implications
Current runtime does **not** appear to apply score thresholds during submit.

Observed repo behavior:
- `app/api/survey/submit/route.ts` computes/stores score and returns `milestoneReached = false`.
- `app/api/insights/unlocked/route.ts` gates unlocks by existence of a specific earned badge (`"Tier 1 Unlocked"`), not by recalculating score thresholds.
- `app/api/badges/earned/route.ts` only returns earned badges already in `CompanyBadge`.

Schema fields indicating future threshold intent exist but are not observed in active runtime path:
- `prisma/schema.prisma`: `BadgeRule.minScore`, `InsightCapabilityRule.minScore`.

Implication:
- Changing score semantics now is unlikely to break current unlock runtime immediately, but can affect interpretation of newly stored submissions and any future threshold automation.

## 5. Smallest Correct Next Action
Smallest safe implementation order (when edits are allowed):
1. In `app/api/survey/submit/route.ts`, align scoring call to UI contract by using `scaleMin: 1, scaleMax: 5`.
2. Keep `lib/scoring.ts` formula unchanged (already generic and correct for supplied bounds).
3. Preserve API response shape and DB fields; only adjust submitted scale bounds.
4. Rebuild and run manual signed-in browser validation.

## 6. Validation Checklist
1. Submit a survey where all slider answers are `1`; verify persisted/returned score is `0%` after alignment patch (currently would be `20%`).
2. Submit a survey where all slider answers are `5`; verify score is `100%`.
3. Submit a mixed set (for example avg=3); verify expected normalized percent from `1..5` mapping.
4. Confirm `app/results/page.tsx` and `app/outputs/page.tsx` both display the same score for the latest session-scoped result.
5. Confirm protected behavior remains correct: unauthenticated `401`, no-company `403`.
6. Run `pnpm build` and confirm green.

## 7. Final Go / No-Go
**Go**, with caveat.

- Golden path manual signed-in browser validation can proceed now on current repo state.
- The scoring-range alignment should be treated as the next small hardening patch to eliminate semantic drift before relying on score thresholds or external reporting.
