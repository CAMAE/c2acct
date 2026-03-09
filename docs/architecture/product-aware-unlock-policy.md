# Product-aware unlock policy

## Current state
- Survey submissions persist required `companyId` and nullable `productId`.
- Results reads support default company-root latest and optional `productId` filtering.
- Badge awards are currently company-root via `CompanyBadge`.
- Unlocked insights are currently company-root and driven by company badge state.
- Auth/company cookie selection logic remains company-root and must not change in this policy batch.

## Decision
- Keep badges company-root for now.
- Keep unlocked insights company-root for now.
- Do not introduce product-aware unlock semantics in the immediate next implementation batch.

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
- First implementation pass: none.
- If policy later shifts to product-aware badges/insights, expected changes would likely include:
  - schema extension for product-scoped award state (new table or widened uniqueness strategy),
  - badge award read/write API updates,
  - unlocked insights read logic that can resolve company-root vs product-filtered unlock context.

## Routes/files likely touched in the first implementation batch
- Docs only in first pass (no runtime route changes).
- If and only if product-aware unlock policy is approved later, likely first runtime targets:
  - `app/api/badges/earned/route.ts`
  - `app/api/insights/unlocked/route.ts`
  - policy docs under `docs/architecture/`

## Explicit non-goals
- No changes to `prisma/schema.prisma` in this pass.
- No changes to `app/api/insights/unlocked/route.ts` in this pass.
- No changes to `app/api/badges/earned/route.ts` in this pass.
- No outputs UI changes.
- No auth/company selection logic changes.
