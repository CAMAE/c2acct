# Scoring And Badge Threshold Semantics

Date: 2026-03-08

## Canonical Contract
- Survey answer scale is `1..5` in both UI and submit-route validation.
- Canonical raw score is computed from that `1..5` scale and persisted as `surveySubmission.score`.
- `signalIntegrityScore` is persisted as a separate quality signal for transparency and adjusted display views.

## Badge Award Gate
- Badge threshold checks currently use raw submission score (`surveySubmission.score`).
- Badge threshold checks do not currently use integrity-adjusted score.
- In `app/api/survey/submit/route.ts`, award evaluation compares `createdSubmission.score` against `badgeRule.minScore` for required rules.

## Why This Split Exists
- Threshold logic needs one stable canonical score input for deterministic rule evaluation.
- Integrity score is a confidence/quality modifier for reporting UX and review, not a second award gate.

## Future Change Note
- If policy later changes to integrity-adjusted gating, that should be introduced as an explicit versioned rule contract migration, not an implicit scoring behavior change.
