# PAT Post-3/31 Recovery Inventory (2026-04-02)

## Purpose

This file preserves the exact local work that existed after the 2026-03-31 PAT baseline and before the rollback restore. It is the slice-recovery index for later audited porting work.

## Recovery source artifacts

- Patch artifact: `artifacts/recovery/c2acct-live-dirty.patch`
- File inventory: `artifacts/recovery/post-3-31-file-inventory.txt`

Patch size:

- `117631` bytes

Inventory count:

- `39` tracked file paths

## Recovery categories

Auth and routing:

- `auth.config.ts`
- `lib/auth/env.ts`
- `lib/auth/runtime.ts`
- `lib/auth/session.ts`
- `lib/authz.ts`
- `proxy.ts`
- `app/login/page.tsx`
- `app/sign-in/page.tsx`
- `app/api/auth/local-reset/route.ts`

PAT shell and protected surfaces:

- `app/layout.tsx`
- `app/components/pat/RoleSignInPage.tsx`
- `app/survey/[key]/page.tsx`
- `app/components/assessment/AssessmentModuleClient.tsx`
- `app/platform/layout.tsx`

Admin and control plane:

- `app/admin/actions.ts`
- `lib/adminControlPlane.ts`

Ops and runtime:

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
- `.github/workflows/ci.yml`

Docs and tests:

- `docs/CORE_BUILD_AAE.md`
- `docs/active-repo-map.md`
- `docs/architecture/auth-env-contract.md`
- `docs/architecture/auth-provider-decision.md`
- `docs/architecture/core-build-guide-source-of-truth.md`
- `docs/architecture/golden-path-repair-plan.md`
- `e2e/local-review-auth.spec.ts`
- `e2e/pat-critical-paths.spec.ts`
- `tests/auth-env.contract.test.ts`

Other preserved paths:

- `app/api/health/db/route.ts`
- `app/components/EnsureCompanySelected.tsx`

## Exact preserved path list

```text
.github/workflows/ci.yml
app/admin/actions.ts
app/api/auth/local-reset/route.ts
app/api/health/db/route.ts
app/components/EnsureCompanySelected.tsx
app/components/assessment/AssessmentModuleClient.tsx
app/components/pat/RoleSignInPage.tsx
app/layout.tsx
app/login/page.tsx
app/platform/layout.tsx
app/sign-in/page.tsx
app/survey/[key]/page.tsx
auth.config.ts
docs/CORE_BUILD_AAE.md
docs/active-repo-map.md
docs/architecture/auth-env-contract.md
docs/architecture/auth-provider-decision.md
docs/architecture/core-build-guide-source-of-truth.md
docs/architecture/golden-path-repair-plan.md
e2e/local-review-auth.spec.ts
e2e/pat-critical-paths.spec.ts
lib/adminControlPlane.ts
lib/auth/env.ts
lib/auth/runtime.ts
lib/auth/session.ts
lib/authz.ts
next.config.ts
ops/mac-mini/README.md
ops/mac-mini/launchd/com.c2acct.app.plist.template
ops/mac-mini/launchd/com.c2acct.verify.plist.template
package.json
proxy.ts
scripts/mac-mini/app-start.sh
scripts/mac-mini/common.sh
scripts/mac-mini/launchd-check.sh
scripts/mac-mini/launchd-install.sh
scripts/mac-mini/nightly-verify.sh
scripts/mac-mini/status.sh
tests/auth-env.contract.test.ts
```

## Recovery rule

Do not reapply this patch wholesale.

Any later recovery must port changes one file or one tightly scoped slice at a time into the canonical recovery root after explicit PAT-surface review.
