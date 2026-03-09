# PRODUCT submit batch blocker

## Current state
- PRODUCT submit code path is implemented in working tree only:
  - lib/assessmentTarget.ts
  - app/api/survey/submit/route.ts
  - app/survey/[key]/page.tsx
  - scripts/test-submission.js
- Build is green.
- FIRM module test passed.
- PRODUCT path is NOT validated because there are no active PRODUCT-scoped SurveyModule rows.

## Decision
Do not commit the PRODUCT submit batch until a real PRODUCT-scoped module exists and the path is exercised end-to-end.

## Next safest move
Seed a minimal PRODUCT-scoped module + questions for local validation, then rerun:
- scripts/test-submission.js with MODULE_KEY + COMPANY_ID + TARGET_PRODUCT_ID
- manual UI submit through /survey/[key]
