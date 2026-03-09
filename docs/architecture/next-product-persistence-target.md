# Next schema-backed PRODUCT persistence batch target

## Working recommendation
- Add nullable productId to SurveySubmission.
- Keep companyId required.
- Keep /api/results company-root for the first persistence pass.
- Do not change auth/company cookie logic.
- Do not change outputs/results UX in this batch.

## Reason
- Lowest-churn path.
- Submit route already validates targetProductId.
- Persistence currently happens in one place: app/api/survey/submit/route.ts.
- Results can remain company-root while we begin capturing product-target context.

## Next implementation should likely touch
- prisma/schema.prisma
- app/api/survey/submit/route.ts
- optional: app/api/results/route.ts only if selecting/returning productId is desired later, not required in first pass

## Update
- `/api/results` now accepts optional `productId` and returns latest by `{ companyId, productId }` when provided.
- Default latest selection remains company-root by `companyId` when `productId` is absent.
- Insights and badges read paths remain company-root for now.

## Next smallest safe downstream-read step
- Keep current results behavior as-is unless product-filter usage indicates additional UI affordances are needed.
- Do not introduce product-aware insights/badges reads until product-scoped unlock policy is defined.
