# Product-target audit checkpoint

## Findings
- Module scope is already available from app/api/survey/module/[key]/route.ts and consumed by app/survey/[key]/page.tsx.
- Current submit payload in app/survey/[key]/page.tsx sends only:
  - moduleKey
  - answers
- Current submit persistence in app/api/survey/submit/route.ts is still company-root only.
- Current assessment seam helper in lib/assessmentTarget.ts is the correct future extension point.
- app/results/page.tsx can remain company-root initially even after first PRODUCT submit support.
- scripts/test-submission.js is company-root only today and should be updated later for PRODUCT-path testing.

## Locked recommendation for later PRODUCT batch
1. Extend lib/assessmentTarget.ts first.
2. Update app/api/survey/submit/route.ts to load module scope during submit resolution.
3. Update app/survey/[key]/page.tsx to include optional targetProductId only for PRODUCT-scoped modules.
4. Keep results read path company-root in first pass.
5. Update scripts/test-submission.js last to support PRODUCT-scoped test submissions.

## Likely later files
- lib/assessmentTarget.ts
- app/api/survey/submit/route.ts
- app/survey/[key]/page.tsx
- scripts/test-submission.js

## Notes
- No auth.ts change needed in first PRODUCT batch.
- No company select/default route change needed in first PRODUCT batch.
- No outputs/results UX change needed in first PRODUCT batch.
