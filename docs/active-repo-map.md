# Active Repo Map

## Authoritative source of truth

- Canonical repo root: `/Users/camerongarrett/work/c2acct-live`
- Authoritative PAT branch: `recovery/pat-2026-03-31-baseline`
- Current authoritative local HEAD: `252b7f39ec77b5459c26791769410b87c4048cec`
- Shared `origin/main` is not authoritative for PAT launch state and remains stale AAE-era truth.

## Release-root classification

- `/Users/camerongarrett/work/c2acct-live`: canonical PAT recovery root and only candidate live root.
- `/Users/camerongarrett/work/c2acct`: development-only workspace and currently the stale root still referenced by installed host launch agents.
- `/private/tmp/c2acct-main-auth`: mixed release copy, quarantined, non-live.

## PAT-critical top-level runtime path

- `app/page.tsx`: canonical PAT homepage.
- `app/layout.tsx`: canonical PAT shell and shared header frame.
- `app/sign-in/page.tsx`: canonical PAT sign-in hub.
- `app/login/page.tsx`: compatibility-only redirect into `/sign-in`; must not be treated as the primary auth surface.
- `app/vendor/page.tsx`: canonical PAT vendor entry.
- `app/firm/page.tsx`: canonical PAT firm entry.
- `app/user/page.tsx`: canonical PAT user entry.
- `app/admin/page.tsx`: canonical PAT admin/operator entry.
- `app/components/header/AppHeader.tsx`: canonical PAT header.
- `app/components/pat/*`: canonical PAT landing and sign-in shell components.
- `app/globals.css`: PAT visual system and shell styling.

## Auth and route contract

- `auth.ts` and `auth.config.ts`: GitHub-mode auth wiring and session hydration.
- `proxy.ts`: PAT protected-route gate.
- `/`: PAT
- `/sign-in`: canonical sign-in route
- `/login`: compatibility-only redirect to `/sign-in`
- unauthenticated `/vendor`, `/firm`, `/user`, `/admin`: canonical `307` redirects into `/sign-in`

## Release and runtime proofing

- `ops/release/canonical-root.json`: canonical root and runtime contract.
- `ops/release/pat-surface-manifest.json`: PAT marker/source manifest used by release validation.
- `ops/release/release-critical-files.json`: release-critical source inventory.
- `scripts/release/validate-source-integrity.mjs`: source-of-truth and dirty-tree gate.
- `scripts/release/validate-pat-surfaces.mjs`: rendered PAT surface and fingerprint validator.
- `scripts/release/verify-approved-pat-markers.mjs`: PAT marker verification.
- `scripts/release/read-release-fingerprint.ts`: operator-side fingerprint reader.
- `scripts/mac-mini/app-start.sh`: guarded canonical runtime start path.
- `scripts/mac-mini/launchd-install.sh`: guarded launch agent install path.
- `scripts/mac-mini/launchd-check.sh`: launchd, root, and ownership validation.
- `scripts/mac-mini/status.sh`: operator status summary.
- `scripts/mac-mini/nightly-verify.sh`: nightly release/host verifier.
- `scripts/mac-mini/port-owner-proof.sh`: host ownership and live fingerprint proof.

## PAT audit and release docs

- `docs/audit/PAT_rollback_restore_2026-04-02.md`: rollback anchor restore proof.
- `docs/audit/PAT_route_surface_reconciliation_2026-04-02.md`: PAT-critical route reconciliation.
- `docs/audit/PAT_prelaunch_green_proof_2026-04-02.md`: last clean green prelaunch proof.
- `docs/audit/PAT_host_cutover_proof_2026-04-02.md`: host ownership proofing contract.
- `docs/audit/PAT_live_host_cutover_2026-04-02.md`: current live-host failure proof.
- `docs/audit/PAT_full_launch_owner_audit_2026-04-02.md`: launch-owner audit and recommendation.
- `docs/release/PAT_launch_blocker_matrix_2026-04-02.md`: launch blocker register.

## Source-vs-host truth rule

- Local recovery source in `/Users/camerongarrett/work/c2acct-live` is the authoritative PAT truth.
- `origin/main` is a stale comparison target, not a restore source for PAT shell or launch state.
- Live host `127.0.0.1:3000` is currently not authoritative because it still serves stale AAE from a non-launchd process and old-root launch-agent installation.
