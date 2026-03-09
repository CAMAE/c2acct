# PRODUCT submit validated checkpoint

## Completed
- First PRODUCT-scoped submit batch is now validated.
- PRODUCT-scoped test module seeded locally:
  - vendor_product_fit_v1
- PRODUCT submit test passed with:
  - companyId: de43a0bb-c901-4b95-a2d7-0f4bcfca0804
  - targetProductId: 97272c7a-9442-4e93-9e88-4654ddafb1c1
- pnpm build is green.
- Results path remains company-root.
- No schema persistence change yet for targetProductId.

## Current code state
- lib/assessmentTarget.ts resolves PRODUCT-scoped submit authority.
- app/api/survey/submit/route.ts accepts optional targetProductId and validates PRODUCT scope.
- app/survey/[key]/page.tsx can send targetProductId for PRODUCT modules.
- scripts/test-submission.js supports PRODUCT-path validation.
- scripts/seed-product-module-test.mjs seeds local PRODUCT test module/questions.

## Next likely step
Decide and implement persistence shape for product-target submissions:
- either add productId nullable to SurveySubmission
- or add a dedicated submission-target link table
- keep companyId as required org root either way

## Constraint
Do not widen auth/company cookie logic yet.
