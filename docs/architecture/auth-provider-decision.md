# Auth Provider Decision (Task 1)

## 1. Executive recommendation
Choose **GitHub OAuth** as the single Auth.js provider path for Phase 1.

## 2. Why this is best for THIS repo right now
- Fits the current Task 1 constraints in `docs/architecture/auth-rbac-phase1-file-plan.md`: Auth.js v5, JWT sessions, no Prisma adapter, no auth schema migration.
- Minimizes moving parts for pre-paid-beta: no SMTP infrastructure, no password lifecycle, no verification-token tables.
- Works cleanly with current `prisma/schema.prisma` user model (`User.email`, `User.role`, `User.companyId`) for claim mapping and RBAC checks.
- Keeps build risk low: one provider, small env surface, straightforward login page implementation.
- Supports hardening-first by enabling fast route protection rollout (`/admin` early, then company endpoints and APIs) from `docs/architecture/auth-rbac-implementation-checklist.md`.

## 3. Why the other three are worse right now
### Google OAuth
- More setup variability for app registration/consent details in early beta.
- No clear repo requirement for Google-specific identity benefits at this stage.
- Similar value to GitHub OAuth but with more onboarding friction for this codebase phase.

### Email magic link
- Adds email delivery dependency (SMTP/provider reliability, templates, deliverability).
- Usually implies verification-token persistence complexity that conflicts with current no-adapter/no-migration Phase 1 constraint.
- Higher operational fragility for smallest-correct-path hardening sprint.

### Credentials bootstrap
- Fastest to wire but weakest security posture and highest rework risk.
- Introduces password handling concerns (hashing/reset/rotation/abuse) that are out of scope for Task 1.
- Contradicts hardening-first intent from the audit because it creates avoidable auth debt.

## 4. Required env vars
Required runtime auth/env variables are defined in:
- `docs/architecture/auth-env-contract.md`

Use that file as the single source of truth for:
- `AUTH_SECRET` vs `AUTH_GITHUB_SECRET` semantics
- local `.env.local` usage
- rotation guidance boundaries

## 5. Required external setup
- Create one GitHub OAuth App for this environment.
- Configure callback URL to Auth.js route (`/api/auth/callback/github`) for local/staging hosts.
- Generate client ID/secret and store in environment variables above.
- Restrict app visibility/use to intended beta org/team as needed.

## 6. Identity mapping to Prisma `User` rows
- Canonical identity key: `User.email` (`prisma/schema.prisma` has `email @unique`).
- On successful GitHub OAuth sign-in, map session identity by normalized email lookup in `User`.
- Populate session claims from DB user row: `id`, `email`, `role`, `companyId`.
- If OAuth email is missing or no matching `User` row exists, deny protected access.

## 7. First OWNER/admin bootstrap
- Pre-create first operator user row directly in DB/seed path with:
- `role = OWNER`
- valid `email` matching GitHub account
- non-null `companyId` for scoped operations
- Additional admins are explicit DB assignments (`ADMIN`) during beta.

## 8. Policy for `companyId = null`
- **Deny protected routes** when authenticated user has `companyId = null`.
- Return `403` (authenticated but not authorized for company-scoped data).
- Exception only for explicitly global admin-only operations if later defined; not needed for current Task 1 gate.

## 9. What this decision changes in implementation targets
### `auth.config.ts`
- Use Auth.js GitHub provider only.
- JWT session strategy.
- Session callback must enrich token/session with `role` and `companyId` from Prisma `User`.

### `app/login/page.tsx`
- Single sign-in action/button for GitHub OAuth.
- Minimal UX copy for beta access and denied-user handling.

### Smoke testing
- `scripts/smoke-golden-path.ps1` cannot assume anonymous API access anymore.
- Add authenticated test precondition (valid beta user session) before protected route checks.
- Validate expected `401`/`403` behavior in unauthenticated/cross-company scenarios.

## 10. Final decision
**Do not code yet** until two prerequisites are complete:
1. GitHub OAuth app credentials are created and available in environment variables.
2. First OWNER user row (email + role + companyId) is seeded/verified in DB.

After those two are ready, proceed with Phase 1 code implementation in the approved order.