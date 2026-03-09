# Next downstream read batch

## Decision
- Product-aware results filtering already provides immediate value with low churn.
- Keep insights and badges company-root for now.
- Keep auth/company cookie logic unchanged.
- Keep outputs unchanged.

## Smallest next batch after this checkpoint
- No additional downstream route changes required immediately.
- Run a short stabilization pass only:
  - verify `/api/results` default company-root latest behavior when `productId` is absent
  - verify optional filtered latest behavior when `productId` is present
  - keep `app/api/insights/unlocked/route.ts` and `app/api/badges/earned/route.ts` unchanged until product-scoped badge/insight policy is defined

## Scope guardrails
- No schema edits.
- No route/UI edits in this checkpoint.
- No auth/company select/default edits.
