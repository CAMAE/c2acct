# Product-aware unlock policy

## Current state
- Survey submissions persist required `companyId` and nullable `productId`.
- Results reads support default company-root latest and optional `productId` filtering.
- Badge awards are currently company-root via `CompanyBadge`.
- Unlocked insights are currently company-root and driven by company badge state.
- Auth/company cookie selection logic remains company-root and must not change in this policy batch.

## Decision
- Keep company-root behavior as default when no product context is provided.
- Enable optional product-aware badge and unlock reads only when explicit product context is present.
- Preserve results product-aware support already implemented.

## Rationale
- This is the smallest safe rollout with the least churn and lowest regression risk.
- Existing unlock behavior and outputs expectations are company-scoped.
- Product-aware unlocks require policy definition first (aggregation and precedence across products).
- Current product-aware value is already delivered through results filtering without changing unlock contracts.

## Smallest safe staged rollout order
1. Policy freeze and telemetry checkpoint: keep existing company-root unlock behavior unchanged while measuring product-filter usage in results.
2. Design-only spec for product-aware unlock semantics (no code): define whether product unlocks should be additive, isolated, or promoted to company-level.
3. Optional data-model extension for product-aware badges only if policy requires it.
4. Optional unlocked-insights adaptation only after badge semantics are finalized and validated.

## Required schema/API changes for the chosen policy
- First implementation pass:
  - extend `CompanyBadge` with nullable `productId` and `Product` relation,
  - persist badge awards with `productId` when submit context includes a product,
  - keep company-root badge awards at `productId = null`,
  - add optional `productId` reads in badges/insights routes with default company-root behavior.

## Routes/files touched in the first implementation batch
- `prisma/schema.prisma`
- `app/api/survey/submit/route.ts`
- `app/api/badges/earned/route.ts`
- `app/api/insights/unlocked/route.ts`
- `lib/assessmentTarget.ts`
- `docs/architecture/product-aware-unlock-policy.md`

## Explicit non-goals
- No outputs UI changes.
- No auth/company selection logic changes.
- No cookie/session widening.
