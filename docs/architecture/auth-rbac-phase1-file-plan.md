# Auth/RBAC Phase 1 File Plan (Task 1 Only)

## Scope and guardrails
- Planning artifact only for Task 1 auth/RBAC gate.
- No app behavior changes in this step.
- No route edits in this step.
- No package install in this step.
- Source of truth: `docs/architecture/auth-rbac-implementation-checklist.md` and `docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md`.
- Execution order below intentionally protects `/admin` earlier than broad API rollout.

## Phase 1 implementation order (enforced)
1. Auth foundation
2. Shared auth helpers
3. Protect `/admin` early
4. Protect company-selection endpoints
5. Protect read APIs
6. Protect write API last (`/api/survey/submit`)
7. Harden company resolution/client handling

## Exact files to create in Step 1 (Auth foundation)
- `auth.config.ts`
- `auth.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/login/page.tsx`

## Exact files to create in Step 2 (Shared auth helpers)
- `lib/auth/session.ts`
- `lib/authz.ts`

## Exact files planned for later phase edits (not now)
Step 3:
- `app/admin/page.tsx`

Step 4:
- `app/api/company/select/route.ts`
- `app/api/company/default/route.ts`

Step 5:
- `app/api/results/route.ts`
- `app/api/badges/earned/route.ts`
- `app/api/insights/unlocked/route.ts`

Step 6:
- `app/api/survey/submit/route.ts`

Step 7:
- `lib/companyContext.ts`
- `app/components/EnsureCompanySelected.tsx`
- `scripts/smoke-golden-path.ps1`

## Exact package changes required (planned, not applied)
Current `package.json` has no auth dependency.

Planned dependency additions:
- `next-auth` (Auth.js v5 package)

Planned script changes:
- No mandatory new npm scripts required for Phase 1.
- Optional: add a short auth smoke script only if needed after route protections are in place.

## Env vars required (planned)
Create/update `.env.example` (file does not currently exist) with:
- `AUTH_SECRET` (required)
- `AUTH_URL` (recommended for stable callback URL behavior)
- Provider-specific variables (choose after uncertainty checks below), e.g.:
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` or equivalent provider pair

Runtime envs already present and still required:
- `DATABASE_URL`

## Repo-specific uncertainty to resolve before provider details
1. Provider choice for pre-paid-beta sign-in:
- Need final decision on provider used for beta users (GitHub, Google, email magic link, credentials bootstrap).
- This determines exact `AUTH_*` env set and login UX behavior in `app/login/page.tsx`.

2. Beta user mapping policy to existing Prisma `User` rows (`prisma/schema.prisma`):
- Confirm whether auth identity key is strictly `User.email`.
- Confirm whether users with `companyId = null` are denied protected routes (recommended yes).

3. Admin bootstrap policy:
- Confirm how first `OWNER` is established in data before full onboarding tooling.

4. Cookie/selector compatibility:
- `app/api/company/select/route.ts` currently sets `aae_companyId` without auth checks.
- Confirm whether cookie remains selector-only hint after auth hardening (recommended yes).

## Why this order
- Step 1 and Step 2 create a stable authz foundation once, minimizing repeated logic across handlers.
- Step 3 protects highest-risk mutation surface early (`app/admin/page.tsx` currently public with server action writes).
- Step 4 secures company-selection endpoints before downstream read APIs to avoid trust in arbitrary cookie/query company selection.
- Step 5 protects read APIs as a grouped rollout for consistent `401/403` behavior.
- Step 6 protects write API last because it requires stricter company derivation semantics (must not trust inbound `companyId`).
- Step 7 cleans up resolver/client/smoke behavior after enforcement so regressions are fixed in one focused pass.

## Known regression traps
- `lib/companyContext.ts` currently has a dev fallback to first company; leaving this active in protected flows can violate company boundary.
- `app/components/EnsureCompanySelected.tsx` may loop/reload incorrectly when endpoints start returning `401/403`.
- `app/admin/page.tsx` has both page render and server action surfaces; guarding only one is insufficient.
- `scripts/smoke-golden-path.ps1` currently assumes unauthenticated API access and can fail after auth is introduced unless updated.
- Route contract drift risk if auth changes are mixed with non-auth refactors in same pass.

## Phase 1 done definition (planning-level)
- File creation and planned edit sequence are approved exactly in this order.
- Provider uncertainty is resolved before coding starts.
- No code edits are performed until this plan is accepted.

## Smallest-correct-path recommendation
- Use Auth.js v5 JWT sessions without Prisma adapter for this pass.
- Keep middleware coarse and route handlers authoritative for authorization.
- Implement only Task 1 surfaces listed above; defer auth UX polish and broader IAM complexity.