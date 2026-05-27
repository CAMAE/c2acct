# PAT Rollback Restore (2026-04-02)

## Decision

Rollback won.

This file records a dated rollback snapshot only. Current checkout truth now lives in `docs/active-repo-map.md` and `README.md`.

The canonical recovery root for this snapshot was `/Users/camerongarrett/work/c2acct-live` on the dated recovery baseline branch created for the rollback exercise.

- Exact rollback baseline commit: `078a41f6816e81e599b94423faf501d10c2aa70c`
- Current branch head after recording rollback artifacts: `5052be3`
- The only changes above the baseline are audit, inventory, and manifest-seed artifacts. PAT product surfaces remain restored from the 2026-03-31 baseline.

## Root matrix

| Root | Branch | SHA | Dirty state | Classification |
| --- | --- | --- | --- | --- |
| `/Users/camerongarrett/work/c2acct-live` | dated recovery baseline branch | `5052be3` head on baseline `078a41f6816e81e599b94423faf501d10c2aa70c` | clean after rollback capture and commit | canonical PAT recovery root at snapshot time |
| `/Users/camerongarrett/work/c2acct` | `feat/mac-mini-ops-hardening` | `078a41f6816e81e599b94423faf501d10c2aa70c` | dirty | development-only, non-live |
| `/private/tmp/c2acct-main-auth` | `release-pat-launch-rc-2026-04-01` | `c6e39d967cf27d002918e503cd4ff61db06af72a` | dirty | mixed, quarantined, non-live |

## Why rollback won

- The claimed post-2026-03-31 runtime and release hardening existed only as dirty local edits in `c2acct-live`.
- `c2acct-live` therefore could not be promoted as clean auditable release truth without first restoring a known-good committed baseline.
- `/Users/camerongarrett/work/c2acct` is the development workspace and remains intentionally non-live.
- `/private/tmp/c2acct-main-auth` is a mixed release copy with divergent release-line content and remains explicitly quarantined.
- The last known-good PAT baseline that can be proven from committed file contents is `078a41f6816e81e599b94423faf501d10c2aa70c`.

## Baseline restore actions

1. Captured the full pre-rollback dirty diff to `artifacts/recovery/c2acct-live-dirty.patch`.
2. Captured the pre-rollback dirty file inventory to `artifacts/recovery/post-3-31-file-inventory.txt`.
3. Created the dated recovery baseline branch at `078a41f6816e81e599b94423faf501d10c2aa70c`.
4. Stashed the later local edits for later slice recovery after the rollback baseline was re-established.
5. Restored only the recovery artifacts needed for audit continuity.
6. Refreshed `/private/tmp/c2acct-main-auth/.QUARANTINED_MIXED_RELEASE_DO_NOT_DEPLOY`.

## PAT-critical files restored by the rollback baseline

Verified PAT-positive source-of-truth surfaces:

- `app/page.tsx`
- `app/layout.tsx`
- `app/sign-in/page.tsx`
- `app/login/page.tsx`
- `app/components/header/AppHeader.tsx`
- `app/components/pat/MeetPatContent.tsx`
- `app/components/pat/PatRouteCard.tsx`
- `app/components/pat/PortalPanelSelector.tsx`
- `app/components/pat/RoleRoutePage.tsx`
- `app/components/pat/RoleSignInPage.tsx`
- `app/vendor/**`
- `app/firm/**`
- `app/user/**`
- `app/admin/**`
- `package.json`
- `next.config.ts`
- `auth.config.ts`
- `scripts/mac-mini/app-start.sh`
- `scripts/mac-mini/common.sh`
- `scripts/mac-mini/launchd-install.sh`

## Verified PAT baseline surfaces

- Home: `app/page.tsx` renders the PAT wordmark, links to `/pat`, and links to `/sign-in`.
- Shell/nav: `app/layout.tsx` renders the PAT shell and nav for `Home`, `Meet PAT`, `Sign in`, `Vendor`, `Firm`, `Individual`, and conditional `C2Core`.
- Sign-in hub: `app/sign-in/page.tsx` is the active PAT role-oriented sign-in hub.

Rollback note:

- `app/login/page.tsx` remains a first-class legacy auth page on this 2026-03-31 baseline.
- `auth.config.ts` still points `pages.signIn` at `/login` on this baseline.
- `next.config.ts` remains baseline-empty, so later standalone runtime hardening is not part of this restored truth.

Those are intentional consequences of restoring the exact 2026-03-31 PAT baseline. They are preserved for later explicit recovery work, not silently rewritten here.

## Dirty local files preserved for later recovery

The complete preserved list is tracked in `artifacts/recovery/post-3-31-file-inventory.txt`.

Preserved paths:

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

## Recovery artifacts

- Dirty patch: `artifacts/recovery/c2acct-live-dirty.patch`
- Dirty file inventory: `artifacts/recovery/post-3-31-file-inventory.txt`
- PAT marker seed: `ops/release/pat-surface-manifest.json`

## Classification result

- `/Users/camerongarrett/work/c2acct-live` is the only candidate release root.
- `/Users/camerongarrett/work/c2acct` is explicitly development-only and non-live.
- `/private/tmp/c2acct-main-auth` is mixed, quarantined, and non-live.
