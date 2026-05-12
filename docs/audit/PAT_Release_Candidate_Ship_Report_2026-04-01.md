# PAT Release Candidate Ship Report

Date: 2026-04-01

## Executive summary

Release-candidate code validation is green. The updated auth path, admin boundary enforcement, protected-route parity, PAT utility/integrity work, launch docs, and Mac mini operator layer all validate in the repo.

Production cutover is still **no-go** until the live Mac mini host state is brought into compliance. The current host reports a failed loopback health check on `127.0.0.1:3000`, missing `PAT_BOOTSTRAP_DEFAULT_PASSWORD`, and missing Telegram chat-ops env plus unloaded chat-ops/watchdog launch agents.

## Validation results

Passed:

- `npm install`
- `npx prisma generate`
- `npm run db:recreate`
- `npm run prisma:migrate:local`
- `PAT_BOOTSTRAP_DEFAULT_PASSWORD=pat-bootstrap-pass npm run seed:pat-runtime`
- `npm run test:unit`
- `npm run test:e2e:launch-production`
- `npm run test:e2e:local-review`
- `npm run validate:launch`
- `AUTH_URL=https://patalign.com NEXTAUTH_URL=https://patalign.com AUTH_SECRET=pat-prod-secret PAT_PRODUCTION_DOMAIN=patalign.com MAC_MINI_PUBLIC_ORIGIN=https://patalign.com MAC_MINI_HOST=127.0.0.1 PORT=3000 PAT_BOOTSTRAP_DEFAULT_PASSWORD=pat-bootstrap-pass npm run validate:patalign:prod`
- `npm run ops:mac-mini:status`
- `npm run ops:mac-mini:launchd:check`
- `npm run ops:mac-mini:chatops:self-test`

Failed on current host state:

- `npm run ops:mac-mini:health`
  - failure: `status=fail url=http://127.0.0.1:3000/api/health/db http=000`
- `npm run ops:mac-mini:launch-readiness`
  - failure: missing `PAT_BOOTSTRAP_DEFAULT_PASSWORD`

## Decisive ship call

Repo state: **go**

Production cutover on `patalign.com`: **no-go**

Reason: no remaining launch-critical repo failures were found, but the actual Mac mini operating state is not yet healthy enough for cutover.

## Remaining blockers

P0 host blockers still open:

- No healthy app response on `http://127.0.0.1:3000/api/health/db`
- `PAT_BOOTSTRAP_DEFAULT_PASSWORD` is missing from the active Mac mini env
- `TELEGRAM_BOT_TOKEN` is missing from the active Mac mini env
- `TELEGRAM_ALLOWED_CHAT_ID` is missing from the active Mac mini env
- `com.c2acct.chatops` is not loaded
- `com.c2acct.watchdog` is not loaded

## Exact production conditions required for safe cutover

All of the following must be true on the Mac mini before cutover:

1. `AUTH_URL=https://patalign.com`
2. `NEXTAUTH_URL=https://patalign.com`
3. `PAT_PRODUCTION_DOMAIN=patalign.com`
4. `MAC_MINI_PUBLIC_ORIGIN=https://patalign.com`
5. `MAC_MINI_HOST=127.0.0.1`
6. `PORT=3000`
7. `AUTH_SECRET` is set to a production secret
8. `DATABASE_URL` points to the production database
9. `PAT_BOOTSTRAP_DEFAULT_PASSWORD` is set
10. `TELEGRAM_BOT_TOKEN` is set
11. `TELEGRAM_ALLOWED_CHAT_ID` is set
12. `com.c2acct.app` is loaded
13. `com.c2acct.verify` is loaded
14. `com.c2acct.chatops` is loaded
15. `com.c2acct.watchdog` is loaded
16. `curl http://127.0.0.1:3000/api/health/db` returns a healthy response
17. `npm run ops:mac-mini:health` passes
18. `npm run ops:mac-mini:launch-readiness` passes

## Exact changed file inventory

The release-candidate currently includes changes across auth, admin, vendor product assessment/insight, launch docs, Mac mini ops, tests, and migrations. The exact modified and untracked file set at signoff time is the current `git status --short` snapshot below.

```text
 M README.md
 M app/admin/actions.ts
 M app/admin/briefings/[companyId]/page.tsx
 M app/admin/briefings/[companyId]/print/page.tsx
 M app/admin/briefings/[companyId]/products/[productId]/page.tsx
 M app/admin/briefings/page.tsx
 M app/admin/insights/page.tsx
 M app/admin/modules/page.tsx
 M app/admin/organizations/[companyId]/page.tsx
 M app/admin/organizations/page.tsx
 M app/admin/page.tsx
 M app/admin/products/[productId]/page.tsx
 M app/admin/products/page.tsx
 M app/admin/runtime/page.tsx
 M app/admin/taxonomy/page.tsx
 M app/admin/users/page.tsx
 M app/api/auth/local-reset/route.ts
 M app/api/firm/product-assessment/submit/route.ts
 M app/api/health/db/route.ts
 M app/api/vendor/product-assessment/submit/route.ts
 M app/components/EnsureCompanySelected.tsx
 M app/components/admin/AdminShell.tsx
 M app/components/assessment/AssessmentModuleClient.tsx
 M app/components/firm/FirmAdminPanels.tsx
 M app/components/firm/FirmPortalContent.tsx
 M app/components/firm/FirmProductAssessmentClient.tsx
 M app/components/membership/MembershipPageShell.tsx
 M app/components/membership/MembershipPlanPanel.tsx
 M app/components/pat/RoleSignInPage.tsx
 M app/components/vendor/VendorPortalContent.tsx
 M app/components/vendor/VendorProductAssessmentClient.tsx
 M app/firm/admin/page.tsx
 M app/firm/admin/user-insight/page.tsx
 M app/firm/membership/checkout/page.tsx
 M app/firm/membership/page.tsx
 M app/firm/page.tsx
 M app/firm/product-assessments/[productId]/page.tsx
 M app/firm/product-assessments/page.tsx
 M app/layout.tsx
 M app/login/page.tsx
 M app/platform/layout.tsx
 D app/sign-in/invitee/actions.ts
 M app/sign-in/invitee/page.tsx
 M app/sign-in/page.tsx
 M app/survey/[key]/page.tsx
 M app/user/membership/checkout/page.tsx
 M app/user/membership/page.tsx
 M app/user/page.tsx
 M app/vendor/admin/page.tsx
 M app/vendor/alignment-insights/[key]/page.tsx
 M app/vendor/alignment-insights/page.tsx
 M app/vendor/membership/checkout/page.tsx
 M app/vendor/membership/page.tsx
 M app/vendor/page.tsx
 M app/vendor/product-assessment/[productId]/page.tsx
 M app/vendor/product-assessment/page.tsx
 M app/vendor/product-insight/[productId]/page.tsx
 M app/vendor/product-insight/page.tsx
 M auth.config.ts
 M auth.ts
 M docs/CORE_BUILD_AAE.md
 M docs/active-repo-map.md
 M docs/architecture/auth-env-contract.md
 M docs/architecture/golden-path-repair-plan.md
 M e2e/local-review-auth.spec.ts
 M e2e/pat-critical-paths.spec.ts
 M lib/adminControlPlane.ts
 M lib/auth/env.ts
 M lib/auth/localReview.ts
 M lib/auth/localReviewActions.ts
 M lib/auth/runtime.ts
 M lib/auth/session.ts
 M lib/authz.ts
 M lib/firmPat.ts
 M lib/membership.ts
 M lib/membershipContent.ts
 M lib/patNavigation.ts
 M lib/platformRollout.ts
 M lib/productUtilityRegistry.ts
 M lib/subjectContext.ts
 M lib/userPat.ts
 M lib/vendorPat.ts
 M lib/vendorProductAssessmentPlan.ts
 M lib/vendorProductInsightEngine.ts
 M lib/vendorProductQuestionBank.ts
 M ops/mac-mini/README.md
 M package.json
 M prisma/schema.prisma
 M prisma/seed.ts
 M proxy.ts
 M scripts/mac-mini/common.sh
 M scripts/mac-mini/health-check.sh
 M scripts/mac-mini/launchd-check.sh
 M scripts/mac-mini/launchd-install.sh
 M scripts/mac-mini/nightly-verify.sh
 M scripts/mac-mini/status.sh
 M scripts/seed-pat-runtime.ts
 M scripts/smoke-score-unlock-contract.ts
 M scripts/smoke-vendor-product-signal.ts
 M scripts/validate-db.ts
 M scripts/validate-launch.ts
 M tests/admin-control-plane.contract.test.ts
 M tests/auth-env.contract.test.ts
 M tests/local-review-auth.contract.test.ts
 M tests/membership-content.contract.test.ts
 M tests/membership-resolver.contract.test.ts
 M tests/vendor-alignment.contract.test.ts
 M tests/vendor-product-assessment.contract.test.ts
 M tests/vendor-product.contract.test.ts
 ?? app/api/billing/
 ?? app/api/firm/product-assessment/draft/
 ?? app/api/vendor/product-assessment/draft/
 ?? app/components/assessment/ProductAssessmentRuntimeClient.tsx
 ?? app/components/firm/FirmManagedUserCard.tsx
 ?? app/components/firm/FirmProductAssessmentCatalogCard.tsx
 ?? app/components/membership/MembershipPaymentProcessingPanel.tsx
 ?? app/components/telemetry/
 ?? app/components/vendor/VendorProductAssessmentDashboard.tsx
 ?? app/error.tsx
 ?? app/firm/admin/users/
 ?? app/firm/membership/payment-processing/
 ?? app/global-error.tsx
 ?? app/user/membership/payment-processing/
 ?? app/vendor/membership/payment-processing/
 ?? app/vendor/product-insight/[productId]/[cardKey]/
 ?? docs/architecture/product-utility-integrity-contract.md
 ?? docs/archive/README.md
 ?? docs/audit/GitHub_Main_Reconciliation_2026-04-01.md
 ?? docs/audit/PAT_Launch_Readiness_Audit_2026-04-01.md
 ?? docs/launch/
 ?? e2e/launch-auth-production.spec.ts
 ?? lib/adminOverview.ts
 ?? lib/analytics.ts
 ?? lib/auth/credentials.ts
 ?? lib/auth/passwords.ts
 ?? lib/billing.ts
 ?? lib/commercialFlags.ts
 ?? lib/firmAdminAccess.ts
 ?? lib/firmProductAssessmentSchemas.ts
 ?? lib/macMiniOperatorState.ts
 ?? lib/portalPanels.ts
 ?? lib/productAssessmentRuntime.ts
 ?? lib/sentry.ts
 ?? lib/transactionalEmail.ts
 ?? lib/vendorAlignmentInsightCards.ts
 ?? lib/vendorProductInsightActivation.ts
 ?? lib/vendorProductInsightCards.ts
 ?? ops/mac-mini/launchd/com.c2acct.chatops.plist.template
 ?? ops/mac-mini/launchd/com.c2acct.watchdog.plist.template
 ?? ops/mac-mini/nginx/
 ?? prisma/migrations/20260401010000_add_user_profile/
 ?? prisma/migrations/20260401110000_add_billing_foundation/
 ?? prisma/migrations/20260401133000_add_user_password_hash/
 ?? scripts/archive/README.md
 ?? scripts/check-product-commercial-contracts.ts
 ?? scripts/check-production-seed-hygiene.ts
 ?? scripts/mac-mini/chatops-dispatch.ts
 ?? scripts/mac-mini/chatops-self-test.sh
 ?? scripts/mac-mini/current-revision.sh
 ?? scripts/mac-mini/latest-deploy.sh
 ?? scripts/mac-mini/launch-readiness.sh
 ?? scripts/mac-mini/log-tail.sh
 ?? scripts/mac-mini/recent-failures.sh
 ?? scripts/mac-mini/restart-app.sh
 ?? scripts/mac-mini/telegram-bot.sh
 ?? scripts/mac-mini/telegram-bot.ts
 ?? scripts/mac-mini/watchdog.sh
 ?? scripts/seed-bootstrap-users.ts
 ?? scripts/smoke-patalign-launch.sh
 ?? scripts/validate-patalign-production.ts
 ?? tests/authz-proxy.contract.test.ts
 ?? tests/billing.contract.test.ts
 ?? tests/firm-admin.contract.test.ts
 ?? tests/firm-product-assessment.contract.test.ts
 ?? tests/mac-mini-operator-state.contract.test.ts
 ?? tests/portal-panels.contract.test.ts
 ?? tests/product-assessment-runtime.contract.test.ts
 ?? tests/product-utility-integrity.contract.test.ts
 ?? tests/vendor-product-insight.contract.test.ts
```
