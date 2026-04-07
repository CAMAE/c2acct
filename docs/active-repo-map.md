# Active Repo Map

## Authoritative source of truth

- Canonical repo root: `/Users/camerongarrett/work/c2acct-live`
- Current checkout truth comes from `git branch --show-current`, `git rev-parse HEAD`, and `git status --short`.
- Dated 2026-04-02 audit and release docs still reference rollback branches and heads from that day. Those values are historical evidence, not guaranteed current checkout truth.
- Shared `origin/main` is not authoritative for PAT launch state and remains stale AAE-era comparison truth.

## Release-root classification

- `/Users/camerongarrett/work/c2acct-live`: canonical PAT runtime root and only candidate live root.
- `/Users/camerongarrett/work/c2acct`: development-only workspace and currently the stale root still referenced by older host notes.
- `/private/tmp/c2acct-main-auth`: mixed release copy, quarantined, non-live.

## PAT-critical top-level runtime path

- `app/page.tsx`: canonical PAT homepage.
- `app/layout.tsx`: canonical PAT shell and shared header frame.
- `app/sign-in/page.tsx`: canonical PAT sign-in hub.
- `app/login/page.tsx`: compatibility-only redirect into `/sign-in`; do not treat it as the primary auth surface.
- `app/vendor/page.tsx`: canonical PAT vendor entry.
- `app/firm/page.tsx`: canonical PAT firm entry.
- `app/user/page.tsx`: canonical PAT user entry.
- `app/admin/page.tsx`: canonical PAT admin/operator entry.
- `app/admin/consultants/page.tsx`: gated consultant management surface inside C2Core; only intended for proof environments with `PAT_ENABLE_CONSULTANT_ACCESS=1`.
- `app/consultants/page.tsx`: gated scoped consultant overview entry.
- `app/components/header/AppHeader.tsx`: canonical PAT header.
- `app/components/pat/*`: canonical PAT landing and sign-in shell components.
- `app/globals.css`: PAT visual system and shell styling.

## Auth and route contract

- `auth.ts` and `auth.config.ts`: GitHub-mode auth wiring and session hydration.
- `proxy.ts`: PAT protected-route gate.
- `/`: PAT
- `/sign-in`: canonical sign-in route
- `/sign-in?view=consultant`: consultant sign-in view only when `PAT_ENABLE_CONSULTANT_ACCESS=1`
- `/consultants`: scoped consultant briefing surface only when `PAT_ENABLE_CONSULTANT_ACCESS=1`
- `/login`: compatibility-only redirect to `/sign-in`
- unauthenticated `/vendor`, `/firm`, `/user`, `/admin`, `/consultants`: canonical `307` redirects into `/sign-in`

## Release and runtime proofing

- `ops/release/canonical-root.json`: canonical root and runtime contract.
- `ops/release/pat-surface-manifest.json`: PAT marker/source manifest used by release validation.
- `ops/release/release-critical-files.json`: release-critical source inventory.
- `scripts/release/validate-source-integrity.mjs`: source-of-truth and dirty-tree gate.
- `scripts/release/validate-pat-surfaces.mjs`: rendered PAT surface and fingerprint validator.
- `scripts/release/verify-approved-pat-markers.mjs`: PAT marker verification.
- `scripts/release/read-release-fingerprint.ts`: operator-side fingerprint reader.
- `scripts/mac-mini/app-start.sh`: guarded canonical runtime start path using `node .next/standalone/server.js`.
- `scripts/mac-mini/launchd-install.sh`: guarded launch agent install path.
- `scripts/mac-mini/launchd-check.sh`: launchd, root, and ownership validation.
- `scripts/mac-mini/status.sh`: operator status summary.
- `scripts/mac-mini/nightly-verify.sh`: nightly release/host verifier.
- `scripts/mac-mini/port-owner-proof.sh`: host ownership and live fingerprint proof.

Package-script truth:

- `pnpm start`: canonical packaged standalone runtime start.
- `pnpm start:next`: non-canonical `next start` path for debugging only.
- `pnpm standalone:local`: local standalone launcher with PAT-specific loopback auth defaults.
- `pnpm validate:launch`: full repo/runtime/browser validation path.
- `pnpm release:prelaunch`: narrower release-artifact and PAT surface proof.
- `pnpm validate:release-surfaces`: explicit alias for `release:prelaunch`.

## PAT audit and release docs

- `docs/audit/PAT_rollback_restore_2026-04-02.md`: rollback anchor restore proof.
- `docs/audit/PAT_route_surface_reconciliation_2026-04-02.md`: PAT-critical route reconciliation.
- `docs/audit/PAT_prelaunch_green_proof_2026-04-02.md`: dated green prelaunch proof snapshot.
- `docs/audit/PAT_host_cutover_proof_2026-04-02.md`: host ownership proofing contract.
- `docs/audit/PAT_live_host_cutover_2026-04-02.md`: dated live-host failure proof.
- `docs/audit/PAT_full_launch_owner_audit_2026-04-02.md`: launch-owner audit and recommendation.
- `docs/release/PAT_launch_blocker_matrix_2026-04-02.md`: dated launch blocker register.

## Source-vs-host truth rule

- Local source in `/Users/camerongarrett/work/c2acct-live` is the authoritative PAT code truth.
- The current checked-out branch and commit win over any dated doc pin.
- `origin/main` is a stale comparison target, not a restore source for PAT shell or launch state.
- Live host `127.0.0.1:3000` is only authoritative after launchd ownership, rendered PAT validation, and release fingerprint agreement are proven.
