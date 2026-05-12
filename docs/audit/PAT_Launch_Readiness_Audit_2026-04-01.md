# PAT Launch Readiness Audit

Date: 2026-04-01

## Scope

This audit reviews the live PAT codebase state after the recent auth, launch-hardening, and Mac mini operator-layer changes. It focuses on launch readiness for `patalign.com`, current auth and authorization behavior, canonical role-based PAT flows, product-assessment runtime, operator tooling, test coverage, and historical debris that can still distort launch execution.

Primary source-of-truth inputs:

- `docs/CORE_BUILD_AAE.md`
- `docs/architecture/core-build-guide-source-of-truth.md`
- `docs/active-repo-map.md`
- `docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md`
- `docs/architecture/pat-domain-phase1.md`

Key runtime and launch files reviewed:

- `proxy.ts`
- `auth.config.ts`
- `auth.ts`
- `lib/auth/*`
- `lib/authz.ts`
- `lib/platformRollout.ts`
- `lib/adminControlPlane.ts`
- `app/admin/*`
- `app/vendor/*`
- `app/firm/*`
- `app/user/*`
- `app/api/*`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `scripts/seed-pat-runtime.ts`
- `scripts/mac-mini/*`
- `scripts/validate-launch.ts`
- `tests/*`
- `e2e/*`

## Validation Performed

- `npx vitest run tests/auth-env.contract.test.ts tests/admin-control-plane.contract.test.ts tests/local-review-auth.contract.test.ts tests/product-assessment-runtime.contract.test.ts tests/vendor-product-insight.contract.test.ts tests/portal-panels.contract.test.ts tests/membership-content.contract.test.ts`
  - Result: 7 files passed, 35 tests passed

Additional current-state validations from the same working session:

- `npm run build`
  - Result: passed
- `npm run typecheck`
  - Result: passed
- `npm run validate:patalign:prod`
  - Result: passed with explicit `https://patalign.com` production-origin checks
- `npm run ops:mac-mini:chatops:self-test`
  - Result: passed

## Executive Risk Register

### P0. Production seed path still creates deterministic review/bootstrap users

Severity: Critical  
Files:

- `lib/auth/localReview.ts`
- `prisma/seed.ts`
- `scripts/seed-pat-runtime.ts`

What is true now:

- `shouldSeedLocalReviewUsers()` currently returns `true`.
- `prisma/seed.ts` always calls `ensureLocalReviewUsers(prisma)`.
- `scripts/seed-pat-runtime.ts` always calls `ensureLocalReviewUsers(prisma)`.

Why it matters:

- The same seed path used to prepare runtime or production data can create deterministic review accounts such as `review.vendor@pat.local`, `review.firm@pat.local`, `review.individual@pat.local`, and `review.admin@pat.local`.
- Once credentials auth is the production sign-in path, seeded review users are no longer harmless fixtures. They become real login-capable identities if a bootstrap password exists.

Launch decision:

- Must fix before launch.

### P0. Admin authorization is enforced by layout presentation, not by a hard data boundary

Severity: Critical  
Files:

- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/runtime/page.tsx`
- `lib/adminControlPlane.ts`

What is true now:

- `app/admin/layout.tsx` checks admin access and renders an “Operator access required” shell for non-admin users.
- `app/admin/page.tsx` directly calls `getAdminOverviewData()` and `buildOperatorBriefings()` without calling `requireAdminSession()`.
- `app/admin/runtime/page.tsx` directly loads `portal`, `operatorAuditEvent`, and runtime overview data without calling `requireAdminSession()`.
- `requireAdminSession()` exists but is not the hard gate for these pages.

Why it matters:

- Layout-level UI gating is not the same thing as a hard server-side authorization boundary around control-plane data access.
- The current code structure allows admin data loading logic to remain reachable outside an explicit admin-only guard.

Launch decision:

- Must fix before launch.

### P1. Protected API intent and middleware matcher coverage are out of sync

Severity: High  
Files:

- `proxy.ts`
- `lib/authz.ts`
- `app/api/firm/product-assessment/draft/route.ts`
- `app/api/vendor/product-assessment/draft/route.ts`

What is true now:

- `lib/authz.ts` lists the draft product-assessment APIs as protected PAT APIs.
- `proxy.ts` does not include those draft endpoints in the middleware matcher.
- The route handlers themselves do auth checks, so the endpoints are not openly writable, but middleware-level protection is inconsistent with the declared protection model.

Why it matters:

- The codebase currently expresses two different truths about what is protected.
- Launch debugging becomes harder when route protection depends on handler-local checks for some surfaces and middleware checks for others.

Launch decision:

- Fix in the next sprint if P0 work lands first, or fold into the same auth-hardening pass if touching route protection anyway.

### P1. Canonical sign-in routing still depends on a compatibility alias

Severity: High  
Files:

- `lib/authz.ts`
- `auth.config.ts`
- `app/login/page.tsx`
- `app/sign-in/page.tsx`

What is true now:

- `buildLoginRedirectPath()` still generates `/login?...`.
- Auth.js is still configured with `pages.signIn = "/login"`.
- `/login` now exists primarily as a compatibility hop to `/sign-in`.

Why it matters:

- The live runtime still treats a compatibility route as the auth system’s canonical sign-in boundary.
- This is exactly the kind of compatibility shadowing that creates stale docs, stale tests, and stale operator assumptions.

Launch decision:

- Fix in the next sprint unless bundled into the P0 auth cleanup immediately.

### P1. Launch validation does not assert the actual launch-critical boundaries

Severity: High  
Files:

- `scripts/validate-launch.ts`
- `e2e/pat-critical-paths.spec.ts`
- `e2e/local-review-auth.spec.ts`

What is true now:

- `scripts/validate-launch.ts` runs a broad sequence of DB reset, build, typecheck, tests, and e2e.
- The current e2e critical path covers signed-out redirects, locale persistence, and hiding local-review controls in production-style mode.
- The current e2e set does not prove the production credentials path for vendor, firm, user, and admin on a launch-like environment.
- The current launch validation does not assert seed hygiene, admin access denial, or compatibility-route containment.

Why it matters:

- A green launch validation can still miss the exact failures that would matter most on launch day.

Launch decision:

- Must be added before calling the launch process complete.

### P1. Phase-1 compatibility bridges remain active in the live runtime and need tighter containment

Severity: High  
Files:

- `lib/platformRollout.ts`
- `lib/subjectContext.ts`
- `lib/userPat.ts`
- `app/api/survey/submit/route.ts`

What is true now:

- The system still dual-reads `pat_companyId` and `aae_companyId`.
- Subject-aware behavior still falls back to legacy company-backed behavior when newer subject-layer schema is missing locally.
- The codebase is explicit about this, but the compatibility path is still active in live runtime code rather than isolated to migration tooling.

Why it matters:

- This is an acknowledged phase-1 compromise, not an accidental bug.
- It is still a launch risk because it expands the number of runtime states operators and tests need to reason about.

Launch decision:

- Next sprint. Do not block launch if the compatibility contract is explicitly documented and validated, but do not let it remain fuzzy.

### P1. Vendor insight empty-state path under-delivers product value

Severity: High  
Files:

- `app/vendor/product-insight/page.tsx`
- `app/vendor/page.tsx`
- `app/vendor/product-assessment/page.tsx`

What is true now:

- If the vendor has no insightable products, `/vendor/product-insight` renders a passive empty state.
- The workspace already supports product creation and product assessment, but the insight surface does not turn the empty state into a guided next action.

Why it matters:

- This weakens the launch story exactly where the product is supposed to demonstrate value.
- A vendor can reach an important product-value surface and receive no guided path to create signal.

Launch decision:

- Next sprint, but it is a launch-value driver and should not be ignored.

### P2. Historical archive material is correctly quarantined but still voluminous enough to confuse audits

Severity: Moderate  
Files:

- `docs/archive/audit-logs-2026-03-05/*`
- `scripts/archive/*`
- `docs/architecture/archived-one-off-scripts-2026-03-08.md`

What is true now:

- The repo no longer appears to carry active `.bak` product files in the live tree.
- It does still carry a large number of archived audit logs and one-off scripts.

Why it matters:

- The archive is not a direct launch blocker, but it increases review noise and makes “current truth” harder to see quickly.

Launch decision:

- Strategic cleanup after launch-hardening work.

## Must Fix Before Launch

1. Stop deterministic local-review/bootstrap users from being seeded by any production or shared runtime seed path.
2. Put the admin control plane behind hard server-side authorization at the page/data boundary, not layout-only presentation gating.
3. Add launch validation that explicitly proves:
   - production credentials sign-in works for vendor, firm, user, and admin
   - non-admin users cannot read admin control-plane data
   - production seed paths do not create review/demo auth users

## Next Sprint

1. Align middleware matcher coverage with the declared protected API list.
2. Move canonical auth redirects from `/login` to `/sign-in` so compatibility aliases stop acting like primary routes.
3. Reduce the operational ambiguity of dual-read company cookies and legacy company-backed fallback behavior.
4. Improve the vendor product-insight empty state so it drives product creation or assessment completion instead of dead-ending.
5. Expand launch validation from broad “green suite” execution to launch-specific assertions.

## Strategic Future Risks

1. Subject-layer and company-layer coexistence remains operationally honest, but it is still complexity debt until one canonical access model wins.
2. Archived operational debris is contained, but the volume of historical logs and one-offs still increases review friction.
3. Compatibility routes (`/survey`, `/results`, `/outputs`, `/profiles`) remain intentionally live; if not continuously documented, they will keep pulling runtime and docs back toward mixed-truth behavior.

## Missing Value Drivers

1. Vendor product insight does not convert empty-state traffic into the next meaningful action.
2. Launch validation proves generic health better than real launch outcomes; it should demonstrate signed-in value delivery, not just infrastructure readiness.
3. The admin runtime surface does not yet appear to expose the new Mac mini watchdog/chat-ops state as a first-class operator launch panel, even though the underlying health surface now emits some of that data.

## Dead Code, Compatibility Shadowing, and Debris

1. `/login` remains in active auth redirect generation even though `/sign-in` is the intended canonical sign-in route.
2. `proxy.ts` and `lib/authz.ts` express different truths about protected draft APIs.
3. `docs/archive/` and `scripts/archive/` are properly quarantined, but they remain large enough to slow human audit work.
4. Historical launch/audit docs still exist beside current truth docs; future audits must keep privileging `docs/CORE_BUILD_AAE.md` and `docs/architecture/core-build-guide-source-of-truth.md`.

## Audit Conclusion

The repo is materially closer to launch-ready than the 2026-03-05 audit baseline. The largest previous concerns around brittle OAuth, vague production domain handling, and the missing Mac mini operator layer have been substantially reduced. The remaining serious launch blockers are narrower and more actionable:

- production seed hygiene for review/bootstrap accounts
- hard admin authorization at the data boundary
- launch validation that proves the real production path rather than a broad green build

If those are corrected, the remaining findings become manageable P1 follow-on work rather than reasons to delay a controlled launch.
