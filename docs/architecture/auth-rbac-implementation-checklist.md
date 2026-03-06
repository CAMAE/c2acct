# Task 1 Auth/RBAC Implementation Checklist

## 1. Executive goal
Close the Task 1 auth/RBAC gate by enforcing authenticated, company-scoped authorization on protected API reads/writes and restricting `/admin` to `OWNER`/`ADMIN`, without broad refactors or non-essential feature work.

## 2. Why this is the current gate before Mac mini
From `docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md`, the top Critical risk is missing authentication/authorization on company-scoped endpoints and `/admin` (BOLA risk); this is explicitly listed as the existential hardening lane item that must be solved before pre-Mac-mini readiness.

## 3. Exact files to create
- `auth.config.ts`
- `auth.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `lib/auth/session.ts`
- `lib/authz.ts`
- `middleware.ts`
- `app/login/page.tsx`
- `docs/architecture/auth-rbac-test-matrix.md` (optional but recommended for repeatable gate checks)

## 4. Exact files to change
- `package.json` (add minimal auth dependencies/scripts)
- `.env.example` (document auth env variables)
- `app/api/survey/submit/route.ts`
- `app/api/results/route.ts`
- `app/api/badges/earned/route.ts`
- `app/api/insights/unlocked/route.ts`
- `app/admin/page.tsx`
- `app/api/company/select/route.ts`
- `app/api/company/default/route.ts`
- `lib/companyContext.ts`
- `app/components/EnsureCompanySelected.tsx`
- `scripts/smoke-golden-path.ps1` (auth-aware smoke inputs)

## 5. Route-by-route enforcement plan

### `app/api/survey/submit/route.ts`
Current state:
- Accepts client `companyId` directly from payload and writes submission.

Plan:
- Require authenticated session before payload processing.
- Resolve actor from session (`userId`, `role`, `companyId`).
- Enforce company boundary: actor must be member of target company.
- For smallest safe beta path, override request `companyId` with session company unless actor is privileged and explicit cross-company is permitted.
- Return `401` unauthenticated, `403` unauthorized.

### `app/api/results/route.ts`
Current state:
- Uses `resolveCompanyId` from query/cookie/dev fallback and reads latest submission.

Plan:
- Require authenticated session.
- Resolve companyId, then authorize membership for that company.
- Remove protected-route use of dev fallback (`first company`) from `lib/companyContext.ts` for this route.
- Return `401`/`403` deterministically.

### `app/api/badges/earned/route.ts`
Current state:
- Uses `resolveCompanyId` and returns company badges without auth.

Plan:
- Require authenticated session.
- Enforce company membership/role against resolved company.
- Keep current response contract, only add access control behavior.

### `app/api/insights/unlocked/route.ts`
Current state:
- Uses `resolveCompanyId` and returns unlocked insights without auth.

Plan:
- Require authenticated session.
- Enforce company membership/role against resolved company.
- Keep query/read logic intact while adding access controls.

### `app/admin/page.tsx`
Current state:
- Public page; server action can create company with no auth/role check.

Plan:
- Require authenticated session at page entry.
- Require `role in [OWNER, ADMIN]` to render and to execute `createOrganization` server action.
- Return/redirect on `401` and hard deny (`403`) for insufficient role.

### `app/api/company/select/route.ts`
Current state:
- Any caller can set `aae_companyId` cookie to arbitrary value.

Plan:
- Require authenticated session.
- Validate requested `companyId` is allowed for session user.
- Deny arbitrary cross-company cookie writes (`403`).

### `app/api/company/default/route.ts`
Current state:
- Returns first company when cookie missing.

Plan:
- Require authenticated session.
- Return session-scoped default company only.
- Do not return global first-company fallback for protected flows.

## 6. Session/auth approach recommended for THIS repo
Recommended approach: Auth.js with JWT sessions (no adapter in first pass).

Why this is the smallest correct path here:
- Repo is Next.js App Router with route handlers (`app/api/**/route.ts`) and server components (`app/admin/page.tsx`), which Auth.js supports directly.
- Existing Prisma `User` model already contains `email`, `role`, `companyId` (`prisma/schema.prisma`), so session claims can be populated without immediate schema expansion.
- JWT session strategy avoids adding extra auth tables/migrations in this gate-closing pass.
- Keeps operational footprint small for pre-paid-beta hardening-first scope.

## 7. Authorization model for THIS repo
Roles (from `prisma/schema.prisma` enum `UserRole`):
- `MEMBER`: may read/write only within their own `companyId`.
- `ADMIN`: same company boundary as `MEMBER`, plus `/admin` access.
- `OWNER`: same as `ADMIN` for this phase.

Company boundary rules:
- Protected route access requires authenticated user with non-null `companyId` unless endpoint is global admin-only by design.
- Company-scoped endpoints must enforce `targetCompanyId === session.companyId`.
- Cookie/query company selectors are hints, never authority.
- Server-side checks in each handler are mandatory even if middleware is present.

## 8. Must be production-correct now vs can be stubbed temporarily
Must be production-correct now:
- Session integrity (signed JWT/session via Auth.js).
- Server-side authorization checks in all Task 1 protected routes.
- `/admin` role gate on both render path and server action.
- Deterministic `401` vs `403` behavior.
- No protected-route first-company fallback.

Can be stubbed temporarily:
- Login UX polish and branding.
- Password reset/invite workflow.
- Multi-company switcher UX.
- Fine-grained permission matrix beyond `MEMBER/ADMIN/OWNER`.

## 9. Ordered implementation sequence
1. Add auth foundation files (`auth.config.ts`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx`).
2. Add centralized session/authorization helpers (`lib/auth/session.ts`, `lib/authz.ts`).
3. Add `middleware.ts` for broad path protection (`/admin`, protected API prefixes).
4. Enforce route-level guards in company-scoped APIs:
   - `app/api/results/route.ts`
   - `app/api/badges/earned/route.ts`
   - `app/api/insights/unlocked/route.ts`
   - `app/api/survey/submit/route.ts`
5. Protect `/admin` page + server action in `app/admin/page.tsx`.
6. Harden company selection flows (`app/api/company/select/route.ts`, `app/api/company/default/route.ts`, `lib/companyContext.ts`).
7. Adjust client-side company selector behavior for unauthorized states (`app/components/EnsureCompanySelected.tsx`).
8. Update smoke checks (`scripts/smoke-golden-path.ps1`) and run build/lint to keep gate green.

## 10. Acceptance checklist
- [ ] Unauthenticated request to each protected API route returns `401`:
  - [ ] `app/api/survey/submit/route.ts`
  - [ ] `app/api/results/route.ts`
  - [ ] `app/api/badges/earned/route.ts`
  - [ ] `app/api/insights/unlocked/route.ts`
- [ ] Authenticated `MEMBER` cannot access or mutate another company (`403`).
- [ ] Authenticated `MEMBER` can access only own company data.
- [ ] `/admin` denies `MEMBER` and allows only `ADMIN`/`OWNER`.
- [ ] `app/api/company/select/route.ts` rejects unauthorized company cookie set.
- [ ] `app/api/company/default/route.ts` no longer exposes global first-company fallback in protected flows.
- [ ] `pnpm build` passes.
- [ ] `pnpm lint` passes within current project tolerance.

## 11. Rollback / regression watchouts
- `app/components/EnsureCompanySelected.tsx` currently assumes unauthenticated access to company-default endpoints; auth changes can cause reload loops or silent no-op unless handled explicitly.
- `lib/companyContext.ts` currently includes dev fallback to first company; removing/limiting this can break current demo scripts if not updated.
- `scripts/smoke-golden-path.ps1` currently calls APIs without auth; must be updated to avoid false failures.
- `app/admin/page.tsx` server action currently executes unguarded; partial guard implementation can leave mutation path exposed.

## 12. Final recommendation: smallest correct path
Implement Auth.js (JWT session mode) + centralized `lib/authz.ts` guards + route-level enforcement in the seven Task 1 targets, and defer all non-gate auth UX/features; this is the minimum operationally simple change set that closes the audit’s Critical auth/BOLA risk while keeping pre-paid-beta delivery and build stability intact.