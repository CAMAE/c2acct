# Core Build Guide Source Of Truth

The uploaded build-guide files remain editorial history:

- `Core Build AAE Guide.pages`
- `/mnt/data/Pasted text.txt`

The authoritative PAT implementation truth is now the recovery branch in the canonical repo:

- repo root: `/Users/camerongarrett/work/c2acct-live`
- branch: `recovery/pat-2026-03-31-baseline`
- current HEAD: `252b7f39ec77b5459c26791769410b87c4048cec`

## Authority rule

- Use the uploaded AAE guide only for historical intent.
- Use the local recovery repo and PAT audit docs for actual launch truth.
- Do not treat `origin/main` as authoritative for PAT shell, PAT auth routing, PAT runtime proofing, or PAT host cutover state.
- Do not use `/private/tmp/c2acct-main-auth` as a restore or publish source for PAT shell files.

## Current PAT truth

- `/` is PAT.
- `/sign-in` is canonical.
- `/login` is compatibility-only and must redirect into `/sign-in`.
- PAT shell, PAT header, PAT cards, PAT brand assets, and release fingerprint endpoint are part of launch truth.
- The validated isolated runtime proof is local PAT truth.
- The live host on port `3000` is still wrong until it is launchd-owned from the canonical root and serves the same PAT fingerprint and PAT routes.

## Source-of-truth docs

- `docs/active-repo-map.md`
- `docs/audit/PAT_rollback_restore_2026-04-02.md`
- `docs/audit/PAT_route_surface_reconciliation_2026-04-02.md`
- `docs/audit/PAT_prelaunch_green_proof_2026-04-02.md`
- `docs/audit/PAT_host_cutover_proof_2026-04-02.md`
- `docs/audit/PAT_live_host_cutover_2026-04-02.md`
- `docs/audit/PAT_full_launch_owner_audit_2026-04-02.md`
- `docs/release/PAT_launch_blocker_matrix_2026-04-02.md`

## Recovery-branch publication rule

- The correct published branch name remains `recovery/pat-2026-03-31-baseline`.
- Publish that branch directly from the canonical repo root.
- Do not merge stale `origin/main` into the recovery branch.
- Do not fast-forward `main` to the recovery branch in this track.
- Do not push while the working tree is dirty.

## Remaining gap after source reconciliation

Even after the recovery branch is documented as the source of truth, the live host remains behind source truth until all of these are true:

1. installed launch agents point at `/Users/camerongarrett/work/c2acct-live`
2. `com.c2acct.app` is loaded by `launchd`
3. port `3000` is owned by that launchd app, not a stale manual listener
4. live `/api/release-fingerprint` exists and matches the validated PAT release id
5. live `/`, `/sign-in`, `/login`, and protected route redirects match the PAT contract
