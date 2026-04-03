# PAT Rebuild Slices From 2026-03-31

## Scope

This file is the ordered recovery matrix for all known post-2026-03-31 work above rollback baseline `078a41f6816e81e599b94423faf501d10c2aa70c`.

It is grounded in four evidence sources:

- dated build-guide intent in `docs/CORE_BUILD_AAE.md`
- preserved dirty diff in `artifacts/recovery/c2acct-live-dirty.patch`
- preserved dirty file list in `artifacts/recovery/post-3-31-file-inventory.txt`
- direct inventory from quarantined mixed copy `/private/tmp/c2acct-main-auth`

It does not authorize bulk restore from either preserved source. It is a file-by-file recovery plan only.

## Slice Summary

| Slice | Theme | Current status on rollback branch | Launch timing | Why |
| --- | --- | --- | --- | --- |
| Slice A | auth and seed hygiene | deferred | safe post-launch while GitHub-mode launch remains acceptable | credentials-first, password hashing, bootstrap seed cleanup, and invitee-path cleanup are not required for PAT-surface-correct go-live under the current `github` runtime contract |
| Slice B | admin/authz/protected-route parity | landed | launch-critical and already restored | `/sign-in` canonicalization, `/login` compatibility-only behavior, redirect parity, and admin gating are part of the launch contract |
| Slice C | operator and Mac mini ops layer | landed | launch-critical and already restored | canonical root enforcement, standalone runtime, release gates, fingerprinting, nightly verify, rollback metadata, and host-cutover proof are part of deterministic launch |
| Slice D | product utility and activation | partially landed | safe post-launch except for the two already validated subslices and anything that would touch protected PAT shell or top-level surfaces, which is rejected until separately proven | two runtime-only product subslices are already restored; remaining utility/activation work is not required for launch-surface correctness and mixed-copy top-level surfaces remain unsafe |

## Launch Timing Decision

### Before go-live

- Keep Slice B and Slice C exactly as landed.
- Do not add Slice A unless the launch decision changes away from GitHub-mode.
- Do not add any remaining Slice D work before clean PAT launch beyond the already validated landed subslices.

### After clean PAT launch

- Recover Slice A in a dedicated credentials/seed review if and only if the product wants to change the auth contract away from `github`.
- Recover any remaining Slice D work in small product-utility batches, starting only after clean PAT launch and only from non-shell runtime/operator-safe pieces.

## Slice A — Auth And Seed Hygiene

### Decision

Deferred. Slice A does **not** have to land before launch as long as GitHub-mode launch remains the accepted production contract.

### Source evidence

- Build guide sections:
  - `docs/CORE_BUILD_AAE.md` “Auth and local review access first”
  - `docs/CORE_BUILD_AAE.md` “Identity model and tenancy boundary”
- Dirty patch evidence:
  - `artifacts/recovery/c2acct-live-dirty.patch` lines covering `/sign-in` local-review text, auth-secret guidance, and deterministic local-review language
- Quarantined mixed-copy evidence:
  - `/private/tmp/c2acct-main-auth/lib/auth/credentials.ts`
  - `/private/tmp/c2acct-main-auth/lib/auth/passwords.ts`
  - `/private/tmp/c2acct-main-auth/lib/auth/signInActions.ts`
  - `/private/tmp/c2acct-main-auth/prisma/seed.ts`
  - `/private/tmp/c2acct-main-auth/prisma/migrations/20260401133000_add_user_password_hash/migration.sql`

### Files in Slice A

Safe post-launch:

- `lib/auth/env.ts`
- `lib/auth/runtime.ts`
- `lib/auth/session.ts`
- `lib/auth/localReview.ts`
- `lib/auth/localReviewActions.ts`
- `/private/tmp/c2acct-main-auth/lib/auth/credentials.ts`
- `/private/tmp/c2acct-main-auth/lib/auth/passwords.ts`
- `/private/tmp/c2acct-main-auth/lib/auth/signInActions.ts`
- `/private/tmp/c2acct-main-auth/prisma/seed.ts`
- `/private/tmp/c2acct-main-auth/prisma/migrations/20260401133000_add_user_password_hash/migration.sql`
- `/private/tmp/c2acct-main-auth/lib/invitee/access.ts`

Rejected until separately proven because they could silently reshape the live auth UX:

- `/private/tmp/c2acct-main-auth/app/login/page.tsx`
- `/private/tmp/c2acct-main-auth/app/sign-in/page.tsx`
- `/private/tmp/c2acct-main-auth/app/sign-in/vendor/page.tsx`
- `/private/tmp/c2acct-main-auth/app/sign-in/firm/page.tsx`
- `/private/tmp/c2acct-main-auth/app/sign-in/user/page.tsx`
- `/private/tmp/c2acct-main-auth/app/sign-in/invitee/page.tsx`

### Dependencies

- current `github` auth contract must be kept stable until Slice A is reviewed
- deterministic seed plan for local review or credentials bootstrap
- migration review for password-hash schema changes

### Validation required

- `npm run build`
- auth unit tests
- local-review or credentials smoke tests
- `node scripts/release/validate-source-integrity.mjs --root /Users/camerongarrett/work/c2acct-live`
- `node scripts/release/validate-pat-surfaces.mjs --root /Users/camerongarrett/work/c2acct-live --port 3310`

### Launch outcome

Can remain deferred for launch. Current launch recommendation stays `github` auth plus existing non-production local-review path.

## Slice B — Admin Boundary And Protected-Route Parity

### Decision

Landed. Slice B is launch-critical and already restored on the rollback branch.

### Source evidence

- Dirty patch inventory:
  - `auth.config.ts`
  - `app/login/page.tsx`
  - `app/sign-in/page.tsx`
  - `proxy.ts`
  - `app/admin/actions.ts`
  - `app/api/auth/local-reset/route.ts`
  - `app/platform/layout.tsx`
  - `app/survey/[key]/page.tsx`
  - `app/components/EnsureCompanySelected.tsx`
  - `app/components/assessment/AssessmentModuleClient.tsx`
  - `lib/authz.ts`
  - `lib/adminControlPlane.ts`
- Current landed branch evidence:
  - commit `2e0a56af79e45056ea45650a68ee7a1252110ead`

### Files in Slice B

Landed:

- `auth.config.ts`
- `app/login/page.tsx`
- `app/sign-in/page.tsx`
- `proxy.ts`
- `app/admin/actions.ts`
- `app/api/auth/local-reset/route.ts`
- `app/platform/layout.tsx`
- `app/survey/[key]/page.tsx`
- `app/components/EnsureCompanySelected.tsx`
- `app/components/assessment/AssessmentModuleClient.tsx`
- `lib/auth/routes.ts`
- `lib/authz.ts`
- `lib/adminControlPlane.ts`

### Dependencies

- rollback-baseline PAT surfaces remain authoritative
- `/sign-in` must remain canonical
- `/login` must remain compatibility-only

### Validation required

- `npm run build`
- `npm run test:unit -- tests/auth.signin-canonical.test.ts tests/auth.login-compat.test.ts tests/auth-env.contract.test.ts tests/local-review-auth.contract.test.ts`
- role-route and redirect validation through rendered PAT surface gate

### Launch outcome

Already part of launch truth.

## Slice C — Operator And Mac Mini Ops Layer

### Decision

Landed. Slice C is launch-critical and already restored on the rollback branch.

### Source evidence

- Dirty patch inventory:
  - `next.config.ts`
  - `package.json`
  - `scripts/mac-mini/*`
  - `.github/workflows/ci.yml`
  - `app/api/health/db/route.ts`
  - `app/layout.tsx`
- Current landed branch evidence:
  - runtime contract repair
  - PAT prelaunch green proof
  - host cutover proof

### Files in Slice C

Landed:

- `next.config.ts`
- `package.json`
- `ops/release/canonical-root.json`
- `ops/release/pat-surface-manifest.json`
- `ops/release/release-critical-files.json`
- `scripts/release/validate-source-integrity.mjs`
- `scripts/release/validate-pat-surfaces.mjs`
- `scripts/release/prelaunch-gate.mjs`
- `scripts/release/verify-approved-pat-markers.mjs`
- `scripts/release/check-release-critical-changes.mjs`
- `scripts/release/read-release-fingerprint.ts`
- `lib/release/fingerprint.ts`
- `app/api/release-fingerprint/route.ts`
- `app/api/health/db/route.ts`
- `app/layout.tsx`
- `scripts/mac-mini/common.sh`
- `scripts/mac-mini/app-start.sh`
- `scripts/mac-mini/launchd-install.sh`
- `scripts/mac-mini/launchd-check.sh`
- `scripts/mac-mini/status.sh`
- `scripts/mac-mini/nightly-verify.sh`
- `scripts/mac-mini/rollback-release.sh`
- `scripts/mac-mini/port-owner-proof.sh`
- `.github/workflows/ci.yml`
- `e2e/release-integrity.spec.ts`
- `tests/release-surface-validator.test.ts`

Quarantine-only operator additions that remain deferred until separately reviewed:

- `/private/tmp/c2acct-main-auth/scripts/mac-mini/chatops-dispatch.ts`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/chatops-self-test.sh`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/current-revision.sh`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/latest-deploy.sh`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/launch-readiness.sh`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/log-tail.sh`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/recent-failures.sh`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/restart-app.sh`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/telegram-bot.sh`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/telegram-bot.ts`
- `/private/tmp/c2acct-main-auth/scripts/mac-mini/watchdog.sh`
- `/private/tmp/c2acct-main-auth/lib/macMiniOperatorState.ts`

### Dependencies

- canonical root must remain `/Users/camerongarrett/work/c2acct-live`
- standalone build discipline
- fingerprint contract across browser, API, and ops
- launchd ownership proof on host

### Validation required

- `npm run build`
- `npm run release:prelaunch`
- `bash scripts/mac-mini/launchd-check.sh`
- `bash scripts/mac-mini/status.sh`
- `bash scripts/mac-mini/nightly-verify.sh`
- host cutover proof on real Mac mini

### Launch outcome

Already part of launch truth.

## Slice D — Product Utility And Activation

### Decision

Partially landed. Two non-shell Slice D subslices are already restored and validated on the recovery branch. All remaining Slice D work stays deferred post-launch unless separately proven. Anything that touches the PAT shell, homepage, header, sign-in hub, or top-level route chrome from the mixed `/private/tmp` copy is rejected until separately proven because it risks PAT surface drift.

### Source evidence

- Build guide sections:
  - `docs/CORE_BUILD_AAE.md` “Vendor and product utility taxonomy”
  - `docs/CORE_BUILD_AAE.md` “Product assessment blueprint and perspective reuse”
  - `docs/CORE_BUILD_AAE.md` “Membership and portal gating”
  - `docs/CORE_BUILD_AAE.md` “C2Core admin/operator control plane”
- Quarantined mixed-copy files:
  - `/private/tmp/c2acct-main-auth/lib/productUtilityRegistry.ts`
  - `/private/tmp/c2acct-main-auth/lib/vendorProductAssessmentPlan.ts`
  - `/private/tmp/c2acct-main-auth/lib/vendorProductInsightEngine.ts`
  - `/private/tmp/c2acct-main-auth/lib/vendorProductInsightActivation.ts`
  - `/private/tmp/c2acct-main-auth/lib/vendorProfileAdapter.ts`
  - `/private/tmp/c2acct-main-auth/lib/firmInsightEngine.ts`
  - `/private/tmp/c2acct-main-auth/app/api/vendor/product-assessment/submit/route.ts`
  - `/private/tmp/c2acct-main-auth/app/api/firm/product-assessment/submit/route.ts`
  - `/private/tmp/c2acct-main-auth/app/vendor/product-*`
  - `/private/tmp/c2acct-main-auth/app/firm/product-assessments/*`
  - `/private/tmp/c2acct-main-auth/app/admin/products/*`
  - `/private/tmp/c2acct-main-auth/app/admin/briefings/*`
  - `/private/tmp/c2acct-main-auth/prisma/migrations/20260401010000_add_user_profile/migration.sql`
  - `/private/tmp/c2acct-main-auth/prisma/migrations/20260401110000_add_billing_foundation/migration.sql`

### Files in Slice D

Already landed and validated:

- `lib/productUtilityRegistry.ts`
- `tests/product-utility-integrity.contract.test.ts`
- `lib/productAssessmentRuntime.ts`
- `lib/vendorProductAssessmentPlan.ts`
- `lib/vendorProductInsightEngine.ts`
- `tests/vendor-product-insight.contract.test.ts`
- `tests/vendor-product.contract.test.ts`
- `tests/vendor-product-assessment.contract.test.ts`
- `scripts/smoke-vendor-product-signal.ts`

Deferred post-launch:

- `/private/tmp/c2acct-main-auth/lib/productUtilityRegistry.ts`
- `/private/tmp/c2acct-main-auth/lib/productAssessmentRuntime.ts`
- `/private/tmp/c2acct-main-auth/lib/vendorProductAssessmentPlan.ts`
- `/private/tmp/c2acct-main-auth/lib/vendorProductQuestionBank.ts`
- `/private/tmp/c2acct-main-auth/lib/vendorProductInsightEngine.ts`
- `/private/tmp/c2acct-main-auth/lib/vendorProductInsightActivation.ts`
- `/private/tmp/c2acct-main-auth/lib/vendorProductInsightCards.ts`
- `/private/tmp/c2acct-main-auth/lib/vendorProfileAdapter.ts`
- `/private/tmp/c2acct-main-auth/lib/firmInsightEngine.ts`
- `/private/tmp/c2acct-main-auth/lib/firmProductAssessmentSchemas.ts`
- `/private/tmp/c2acct-main-auth/lib/membership.ts`
- `/private/tmp/c2acct-main-auth/lib/membershipContent.ts`
- `/private/tmp/c2acct-main-auth/lib/membershipContext.ts`
- `/private/tmp/c2acct-main-auth/lib/billing.ts`
- `/private/tmp/c2acct-main-auth/app/api/vendor/product-assessment/submit/route.ts`
- `/private/tmp/c2acct-main-auth/app/api/firm/product-assessment/submit/route.ts`
- `/private/tmp/c2acct-main-auth/app/components/assessment/ProductAssessmentRuntimeClient.tsx`
- `/private/tmp/c2acct-main-auth/app/components/vendor/VendorProductAssessmentClient.tsx`
- `/private/tmp/c2acct-main-auth/app/components/vendor/VendorProductAssessmentDashboard.tsx`
- `/private/tmp/c2acct-main-auth/app/components/firm/FirmProductAssessmentClient.tsx`
- `/private/tmp/c2acct-main-auth/app/components/firm/FirmProductAssessmentCatalogCard.tsx`
- `/private/tmp/c2acct-main-auth/app/components/membership/MembershipCard.tsx`
- `/private/tmp/c2acct-main-auth/app/components/membership/MembershipPageShell.tsx`
- `/private/tmp/c2acct-main-auth/app/components/membership/MembershipPaymentProcessingPanel.tsx`
- `/private/tmp/c2acct-main-auth/app/components/membership/MembershipPlanPanel.tsx`
- `/private/tmp/c2acct-main-auth/app/vendor/product-assessment/page.tsx`
- `/private/tmp/c2acct-main-auth/app/vendor/product-assessment/[productId]/page.tsx`
- `/private/tmp/c2acct-main-auth/app/vendor/product-insight/page.tsx`
- `/private/tmp/c2acct-main-auth/app/vendor/product-insight/[productId]/page.tsx`
- `/private/tmp/c2acct-main-auth/app/vendor/product-insight/[productId]/[cardKey]/page.tsx`
- `/private/tmp/c2acct-main-auth/app/firm/product-assessments/page.tsx`
- `/private/tmp/c2acct-main-auth/app/firm/product-assessments/[productId]/page.tsx`
- `/private/tmp/c2acct-main-auth/app/admin/products/page.tsx`
- `/private/tmp/c2acct-main-auth/app/admin/products/[productId]/page.tsx`
- `/private/tmp/c2acct-main-auth/app/admin/briefings/page.tsx`
- `/private/tmp/c2acct-main-auth/app/admin/briefings/[companyId]/page.tsx`
- `/private/tmp/c2acct-main-auth/app/admin/briefings/[companyId]/products/[productId]/page.tsx`
- `/private/tmp/c2acct-main-auth/prisma/migrations/20260401010000_add_user_profile/migration.sql`
- `/private/tmp/c2acct-main-auth/prisma/migrations/20260401110000_add_billing_foundation/migration.sql`

Rejected because they directly risk PAT surface drift from the mixed copy:

- `/private/tmp/c2acct-main-auth/app/page.tsx`
- `/private/tmp/c2acct-main-auth/app/layout.tsx`
- `/private/tmp/c2acct-main-auth/app/login/page.tsx`
- `/private/tmp/c2acct-main-auth/app/sign-in/page.tsx`
- `/private/tmp/c2acct-main-auth/app/components/header/AppHeader.tsx`
- `/private/tmp/c2acct-main-auth/app/components/pat/MeetPatContent.tsx`
- `/private/tmp/c2acct-main-auth/app/components/pat/PatRouteCard.tsx`
- `/private/tmp/c2acct-main-auth/app/components/pat/PortalPanelSelector.tsx`
- `/private/tmp/c2acct-main-auth/app/components/pat/RoleRoutePage.tsx`
- `/private/tmp/c2acct-main-auth/app/components/pat/RoleSignInPage.tsx`
- `/private/tmp/c2acct-main-auth/app/outputs/page.tsx`
- `/private/tmp/c2acct-main-auth/app/profiles/page.tsx`
- `/private/tmp/c2acct-main-auth/app/results/page.tsx`

### Dependencies

- keep rollback-baseline PAT shell as source of truth
- preserve PAT surface manifest before any product-runtime import
- require matching Prisma migration plan for any profile or billing changes

### Validation required

- `npm run build`
- relevant unit tests for vendor/firm/product runtime
- source-integrity gate
- rendered PAT surface gate
- role-route validation
- targeted operator/admin smoke for product runtime additions

### Landed Slice D sub-slices

1. Product utility registry / integrity
   - local files:
     - `lib/productUtilityRegistry.ts`
     - `tests/product-utility-integrity.contract.test.ts`
   - landed at:
     - `c7f90aa`
   - validation:
     - `npm run test:unit -- tests/product-utility-integrity.contract.test.ts`

2. Vendor product insight runtime
   - local files:
     - `lib/productAssessmentRuntime.ts`
     - `lib/vendorProductAssessmentPlan.ts`
     - `lib/vendorProductInsightEngine.ts`
     - `tests/vendor-product-insight.contract.test.ts`
     - `tests/vendor-product.contract.test.ts`
     - `tests/vendor-product-assessment.contract.test.ts`
     - `scripts/smoke-vendor-product-signal.ts`
   - landed at:
     - `9dea36b`
   - validation:
     - `npm run test:unit -- tests/vendor-product-insight.contract.test.ts tests/vendor-product.contract.test.ts tests/vendor-product-assessment.contract.test.ts`

### Current validation status on HEAD `252b7f39ec77b5459c26791769410b87c4048cec`

Passed on current head:

- `node scripts/release/verify-approved-pat-markers.mjs --root .`
- `npm run test:unit -- tests/product-utility-integrity.contract.test.ts tests/vendor-product-insight.contract.test.ts tests/vendor-product.contract.test.ts tests/vendor-product-assessment.contract.test.ts`

Not green on current dirty/sandboxed tree:

- `npm run release:prelaunch`

Reason:

- `sourceIntegrity.ok: false` because unrelated critical dirty entries remain in `scripts/mac-mini/common.sh`, `scripts/mac-mini/nightly-verify.sh`, and `scripts/mac-mini/status.sh`
- `patSurfaces.ok: false` in this sandbox because isolated runtime bind on `127.0.0.1:3310` returned `listen EPERM`

This current prelaunch failure is not evidence of Slice D regression.

### Launch outcome

Only the two documented Slice D subslices are landed. All remaining Slice D work stays deferred until after clean PAT launch. Do not batch-import from `/private/tmp/c2acct-main-auth`.

## Preserved Dirty Inventory Classification

### Slice B

- `auth.config.ts`
- `app/login/page.tsx`
- `app/sign-in/page.tsx`
- `proxy.ts`
- `app/admin/actions.ts`
- `app/api/auth/local-reset/route.ts`
- `app/platform/layout.tsx`
- `app/survey/[key]/page.tsx`
- `app/components/EnsureCompanySelected.tsx`
- `app/components/assessment/AssessmentModuleClient.tsx`
- `lib/authz.ts`
- `lib/adminControlPlane.ts`

### Slice C

- `.github/workflows/ci.yml`
- `app/api/health/db/route.ts`
- `app/layout.tsx`
- `next.config.ts`
- `package.json`
- `scripts/mac-mini/app-start.sh`
- `scripts/mac-mini/common.sh`
- `scripts/mac-mini/launchd-check.sh`
- `scripts/mac-mini/launchd-install.sh`
- `scripts/mac-mini/nightly-verify.sh`
- `scripts/mac-mini/status.sh`
- `ops/mac-mini/README.md`
- `ops/mac-mini/launchd/com.c2acct.app.plist.template`
- `ops/mac-mini/launchd/com.c2acct.verify.plist.template`

### Slice A

- `lib/auth/env.ts`
- `lib/auth/runtime.ts`
- `lib/auth/session.ts`
- `tests/auth-env.contract.test.ts`
- `e2e/local-review-auth.spec.ts`

### Rejected from dirty inventory because they are documentation or PAT-shell text that no longer outranks current launch truth

- `docs/CORE_BUILD_AAE.md`
- `docs/active-repo-map.md`
- `docs/architecture/auth-env-contract.md`
- `docs/architecture/auth-provider-decision.md`
- `docs/architecture/core-build-guide-source-of-truth.md`
- `docs/architecture/golden-path-repair-plan.md`
- `app/components/pat/RoleSignInPage.tsx`
- `e2e/pat-critical-paths.spec.ts`

These are not unsafe in themselves, but they are not a deferred runtime slice to be recovered. They are either already superseded by the current branch or need separate doc/test review rather than slice restore.

## Ordered Recovery Recommendation

1. Do not touch Slice A before launch unless the launch decision changes away from GitHub-mode.
2. Keep Slice B and Slice C fixed as the validated launch baseline.
3. After clean launch, recover remaining Slice D work in this order:
   - already landed: utility registry and vendor product runtime
   - next candidate: vendor and firm product-assessment submit/runtime paths
   - then: admin products and admin briefings
   - last and still explicitly deferred: membership and billing foundation
4. Recover Slice A only after Slice D or as a separate auth-contract program, because it changes the runtime contract rather than only adding product utility.

## Hard Rule

No file from `/private/tmp/c2acct-main-auth` that affects:

- homepage
- layout
- sign-in hub
- PAT header/nav
- compatibility routes

may be promoted without explicit PAT-surface proof against the current rollback branch.
