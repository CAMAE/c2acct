# Core Build Guide Source Of Truth

The uploaded build-guide files remain editorial history:

- `Core Build AAE Guide.pages`
- `/mnt/data/Pasted text.txt`

Current authoritative PAT implementation truth comes from the attached checkout in the canonical repo:

- repo root: `/Users/camerongarrett/work/c2acct-live`
- branch: `fix/local-review-signin-hotfix`
- current HEAD: `668ff249b1e28cfadd206a9e14819dcb416ad365`
- attached release artifact build id: read the current value from the latest release-proof artifacts such as `.next/BUILD_ID`, `/api/release-fingerprint`, or `pnpm standalone:local:check`
- attached release artifact state: `gitDirty=dirty`

## Authority rule

- Use the uploaded AAE guide only for historical intent.
- Use the current checkout branch, commit, and dirty-tree state for actual launch truth.
- Treat the 2026-04-02 recovery, audit, and release docs as historical evidence only.
- Do not treat `origin/main` as authoritative for PAT shell, PAT auth routing, PAT runtime proofing, or PAT host cutover state.
- Do not use `/private/tmp/c2acct-main-auth` as a restore or publish source for PAT shell files.

## Current PAT truth

- `/` is PAT.
- `/sign-in` is canonical.
- `/login` is compatibility-only and must redirect into `/sign-in`.
- PAT shell, PAT header, PAT cards, PAT brand assets, and release fingerprint endpoint are part of launch truth.
- Current checkout truth outranks any dated branch or commit pin recorded in older docs.
- The attached release artifacts and fingerprint surfaces are the build-id source of truth, and the attached tree still shows a dirty state, so release proof is currently blocked.
- The live host on port `3000` is still wrong until it is launchd-owned from the canonical root and serves the same PAT fingerprint and PAT routes.

## Source-of-truth docs

- `docs/active-repo-map.md`
- `docs/audit/PAT_rollback_restore_2026-04-02.md` (historical recovery snapshot)
- `docs/audit/PAT_route_surface_reconciliation_2026-04-02.md` (historical route audit snapshot)
- `docs/audit/PAT_prelaunch_green_proof_2026-04-02.md` (historical prelaunch proof snapshot)
- `docs/audit/PAT_host_cutover_proof_2026-04-02.md` (historical host proof contract)
- `docs/audit/PAT_live_host_cutover_2026-04-02.md` (historical live-host failure snapshot)
- `docs/audit/PAT_full_launch_owner_audit_2026-04-02.md` (historical launch-owner audit)
- `docs/release/PAT_launch_blocker_matrix_2026-04-02.md` (historical blocker snapshot)
- `docs/release/comparison-only-working-tree-exports.md`

## Historical recovery-line note

- The 2026-04-02 recovery-line docs remain part of the audit trail, but they do not override the attached checkout.
- Do not merge stale `origin/main` into the current PAT checkout line.
- Do not treat any dated recovery snapshot as present-day release authority.
- Do not push while the working tree is dirty.

## Remaining gap after source reconciliation

Even after the docs are reconciled, the release remains unproven until all of these are true:

1. installed launch agents point at `/Users/camerongarrett/work/c2acct-live`
2. `com.c2acct.app` is loaded by `launchd`
3. port `3000` is owned by that launchd app, not a stale manual listener
4. live `/api/release-fingerprint` exists and matches the validated PAT release id
5. live `/`, `/sign-in`, `/login`, and protected route redirects match the PAT contract
6. the working tree is clean enough to produce fresh green runtime proof
