# GitHub Main Reconciliation (2026-04-02)

## Scope

Reconcile the authoritative local PAT checkout at the time against `origin/main` without merging stale AAE main into the release line.

## Authoritative local source

- repo root: `/Users/camerongarrett/work/c2acct-live`
- branch at snapshot time: the dated recovery-line branch used on 2026-04-02
- HEAD at snapshot time: the then-current recovery-line head used on 2026-04-02

## Remote comparison

Commands:

```bash
git fetch origin --prune
git rev-list --left-right --count origin/main...HEAD
git diff --name-status origin/main...HEAD
git log --oneline --decorate origin/main..HEAD
git ls-remote --heads origin <historical-recovery-line-name>
```

Results:

- ahead/behind vs `origin/main`: `0 28`
- local release line at snapshot time is `28` commits ahead of `origin/main`
- remote historical recovery branch was not present on `origin`
- raw drift artifacts:
  - `artifacts/reports/origin-main-vs-head.diff.txt`
  - `artifacts/reports/origin-main-vs-head.log`

## PAT-critical items present locally but absent or stale on origin/main

### PAT surface truth

- `app/page.tsx`
- `app/layout.tsx`
- `app/sign-in/page.tsx`
- `app/login/page.tsx`
- `app/firm/page.tsx`
- `app/vendor/page.tsx`
- `app/user/page.tsx`
- `app/admin/page.tsx`
- `app/components/header/AppHeader.tsx`
- `app/components/pat/MeetPatContent.tsx`
- `app/components/pat/PatRouteCard.tsx`
- `app/components/pat/PortalPanelSelector.tsx`
- `app/components/pat/RoleRoutePage.tsx`
- `app/components/pat/RoleSignInPage.tsx`

### PAT auth/runtime contract

- `auth.ts`
- `auth.config.ts`
- `proxy.ts`
- `next.config.ts`
- `package.json`

### PAT release validation and host proofing

- `ops/release/canonical-root.json`
- `ops/release/pat-surface-manifest.json`
- `ops/release/release-critical-files.json`
- `scripts/release/check-release-critical-changes.mjs`
- `scripts/release/prelaunch-gate.mjs`
- `scripts/release/read-release-fingerprint.ts`
- `scripts/release/validate-pat-surfaces.mjs`
- `scripts/release/validate-source-integrity.mjs`
- `scripts/release/verify-approved-pat-markers.mjs`
- `scripts/mac-mini/app-start.sh`
- `scripts/mac-mini/common.sh`
- `scripts/mac-mini/health-check.sh`
- `scripts/mac-mini/launchd-check.sh`
- `scripts/mac-mini/launchd-install.sh`
- `scripts/mac-mini/nightly-verify.sh`
- `scripts/mac-mini/status.sh`
- `scripts/mac-mini/validate-runtime-contract.sh`
- `scripts/mac-mini/port-owner-proof.sh`

### PAT audit and operator docs

- `docs/active-repo-map.md`
- `docs/architecture/core-build-guide-source-of-truth.md`
- `docs/audit/PAT_rollback_restore_2026-04-02.md`
- `docs/audit/PAT_route_surface_reconciliation_2026-04-02.md`
- `docs/audit/PAT_prelaunch_green_proof_2026-04-02.md`
- `docs/audit/PAT_host_cutover_proof_2026-04-02.md`
- `docs/audit/PAT_live_host_cutover_2026-04-02.md`
- `docs/audit/PAT_full_launch_owner_audit_2026-04-02.md`
- `docs/release/PAT_launch_blocker_matrix_2026-04-02.md`

## What origin/main still represents

`origin/main` still exposes stale AAE-era shared truth, including:

- AAE home copy and navigation on `/`
- no canonical `/sign-in` PAT surface
- no live PAT release-fingerprint endpoint contract
- no PAT host-cutover proofing layer

`origin/main` is therefore a comparison target only. It is not an acceptable restore or launch source for PAT shell files.

## Recovery branch naming

At the time of this snapshot, the recovery-line name matched the rollback anchor date and audit trail.

That naming matched:

- the rollback anchor date
- the PAT recovery audit trail
- the last clean prelaunch proof docs

## Publish status

The release line captured in this snapshot was **not yet publishable in this working tree** because the tree was dirty.

Current dirty entries include:

- PAT audit docs
- `package.json`
- `scripts/mac-mini/common.sh`
- `scripts/mac-mini/launchd-check.sh`
- `scripts/mac-mini/nightly-verify.sh`
- `scripts/mac-mini/status.sh`
- untracked PAT host/runtime proof files

Track rule says:

- do not push a dirty tree

Because of that rule, the historical recovery-line push was not executed from this dirty state.

## Exact remaining gap between source truth and live host truth

Source truth for this snapshot is the local PAT checkout line in `/Users/camerongarrett/work/c2acct-live`.

Live host truth is still wrong because:

1. installed launch agents still point at `/Users/camerongarrett/work/c2acct`
2. `com.c2acct.app` is not loaded in launchd
3. port `3000` is owned by stale PID `25059`, not the launchd PAT app
4. live `http://127.0.0.1:3000/api/release-fingerprint` returns `404`
5. live `/` renders AAE, not PAT
6. live `/sign-in` returns `404`
7. live `/login` returns `200`, not `307 -> /sign-in`
8. live protected-route redirects still point to `/login`
9. live env readiness is still missing `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`

## Conclusion

The local PAT checkout line is the real PAT source of truth for this snapshot. `origin/main` is stale. Any publication target must be driven from a clean working tree, not from stale comparison history.
