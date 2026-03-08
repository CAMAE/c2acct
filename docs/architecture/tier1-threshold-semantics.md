# Tier 1 Threshold Semantics

Date: 2026-03-08

Decision:
- Tier 1 badge award is based on raw submission score, not integrity-adjusted score.

Current runtime behavior:
- `app/api/survey/submit/route.ts` compares `createdSubmission.score` against `BadgeRule.minScore` for required badge rules.
- `signalIntegrityScore` is stored on submission, but is not used in badge-award threshold comparison.

Why this is intentional:
- `score` is the canonical normalized scoring contract used for threshold rules.
- `signalIntegrityScore` is a quality/confidence signal for transparency and presentation, not a separate award gate.
