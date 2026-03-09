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
