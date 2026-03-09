# Post-results product context checkpoint

## Current completed state
- PRODUCT submit path validated.
- SurveySubmission persists nullable productId.
- /api/results now surfaces persisted productId.
- app/results/page.tsx displays Product ID.
- Latest results selection remains company-root by companyId.
- /api/results now supports optional `productId` query filtering for latest-by-company-and-product reads.
- Default behavior remains company-root latest when `productId` is not provided.
- Insights unlocked read path remains company-root.
- Earned badges read path remains company-root.
- Auth/company cookie selection unchanged.
- Outputs unchanged.

## Next decision
Choose the smallest safe downstream-read batch only after confirming whether:
- product-aware results filtering adds immediate value, or
- insights/badges should remain company-root for now.

## Constraint
Do not widen auth/company selection logic in the next batch.
