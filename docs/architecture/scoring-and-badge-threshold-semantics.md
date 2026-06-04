# PAT Scoring And Unlock Semantics

Date: 2026-03-24

## Canonical score contract

- `surveySubmission.score` is the canonical raw normalized percent score.
- `surveySubmission.weightedAvg` is the raw weighted average on the module answer scale.
- `surveySubmission.signalIntegrityScore` is a separate confidence signal in the `0..1` range.
- Confidence-adjusted values are reporting aids only. They do not replace the canonical raw score in award logic.

## Badge award contract

- Badge award rules use `BadgeRule.minScore`.
- `app/api/survey/submit/route.ts` evaluates `BadgeRule.minScore` against the persisted raw score percent.
- Signal integrity does not silently modify badge thresholds.

## Insight unlock contract

- Insights are unlocked through explicit rule data.
- `InsightUnlockRule` ties an insight to one or more required badges.
- `InsightCapabilityRule` remains available for future capability-driven unlocks.
- `lib/insights/evaluateUnlocked.ts` returns unlock evidence so operators can see which badge or capability rules were satisfied or missing.

## UI language contract

- Results and outputs must label raw values as canonical.
- Confidence-adjusted values must be labeled as display or review values.
- UI copy must not imply that confidence-adjusted values drive unlocks unless policy changes explicitly.

## Phase 2 direction

- Add versioned unlock policy for capability-first outputs.
- Expose unlock evidence directly in operator dashboards.
- If confidence-adjusted gating is ever introduced, it must ship as a versioned rule change instead of a hidden formula change.
