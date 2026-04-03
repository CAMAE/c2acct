# PAT Launch Blocker Matrix (2026-04-02)

Decision: `FIX_FORWARD_FROM_ROLLBACK_BASELINE`

Exact source of truth:

- local root: `/Users/camerongarrett/work/c2acct-live`
- branch: `recovery/pat-2026-03-31-baseline`
- head: `252b7f39ec77b5459c26791769410b87c4048cec`
- stale comparison branch: `origin/main` at `363436c0e049ff8652c8e6fc1fd5c3bbdce58531`

## Fixed

| ID | Area | Status | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| F1 | Canonical release root | fixed | `ops/release/canonical-root.json` points to `/Users/camerongarrett/work/c2acct-live` and forbids dev/tmp roots | ship |
| F2 | PAT source surfaces | fixed | `app/page.tsx`, `app/layout.tsx`, `app/sign-in/page.tsx`, `app/vendor/page.tsx`, `app/firm/page.tsx`, `app/user/page.tsx`, `app/admin/page.tsx` are PAT/C2Core source truth | ship |
| F3 | Auth route contract | fixed | `auth.config.ts` uses `/sign-in`; `app/login/page.tsx` redirects into canonical sign-in | ship |
| F4 | Standalone runtime contract | fixed | `next.config.ts` uses `output: "standalone"` and `package.json` includes `release:prelaunch` | ship |
| F5 | Release fingerprint contract | fixed | `app/api/release-fingerprint/route.ts` and `lib/release/fingerprint.ts` exist locally | ship |
| F6 | Host proof contract | fixed | `scripts/mac-mini/launchd-check.sh`, `status.sh`, `nightly-verify.sh`, `port-owner-proof.sh` exist and fail closed | ship |
| F7 | GitHub-main reconciliation | fixed | `origin/main` is directly proven stale AAE/auth truth, not launch truth | ship |

## Must Fix Before Launch

| ID | Area | Current state | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| B1 | Source integrity | open | `validate-source-integrity` fails on launch-critical dirty files `scripts/mac-mini/nightly-verify.sh` and `scripts/mac-mini/status.sh` | must fix |
| B2 | Release artifact agreement | open | source-integrity warns `state_commit_out_of_date`; `release-state.env` still reports `COMMIT=01a68f4` while HEAD is `252b7f3` | must fix |
| B3 | Launchd cutover | open | `launchd_service_state=not-loaded`; `launchd_app=not-loaded` | must fix |
| B4 | Port ownership | open | `live_port_owner_state=stale-listener`; `live_port_owner_pid=25059`; `ownership_failures` contains `non_launchd_port_owner` | must fix |
| B5 | Live fingerprint availability | open | `live_release_probe_http=000`; `live_release_endpoint_unavailable` | must fix |
| B6 | Production GitHub env readiness | open | `env_ready=no missing=AUTH_GITHUB_ID,AUTH_GITHUB_SECRET` | must fix |
| B7 | Live rendered PAT proof | open | `validate-pat-surfaces --base-url http://127.0.0.1:3000` failed with `fetch failed`; live PAT is not proven | must fix |

## Defer Prelaunch

| ID | Area | Evidence | Disposition |
| --- | --- | --- | --- |
| D1 | Slice A auth and seed expansion | local docs explicitly defer password-hash, bootstrap-user, and credentials-first work | defer prelaunch |
| D2 | Remaining Slice D work | local docs explicitly defer additional product utility/activation work outside narrow landed sub-slices | defer prelaunch |
| D3 | April 1 audit filename backfill | missing older audit filenames are not required to launch the corrected local PAT source | defer prelaunch |

## Must Not Ship

| ID | Marker | Evidence | Disposition |
| --- | --- | --- | --- |
| N1 | `origin/main` AAE homepage/auth surface | `origin/main:app/page.tsx` still renders `AAE`, `Profiles`, `Top Seven Outputs`; `origin/main:app/login/page.tsx` still renders `pre-approved GitHub accounts` and `Continue with GitHub` | reject mixed-copy surface |
| N2 | `/private/tmp/c2acct-main-auth` top-level surface files | quarantined mixed tree and explicitly forbidden live root | reject mixed-copy surface |
| N3 | `/login` as first-class auth destination | local contract makes `/login` compatibility-only; shipping primary `/login` is regression | reject mixed-copy surface |
| N4 | AAE markers on PAT launch surface | forbidden markers listed in `ops/release/pat-surface-manifest.json` | reject mixed-copy surface |
| N5 | build-only pass as readiness | launch contract requires source integrity, host proof, PAT rendered proof, and fingerprint agreement | reject mixed-copy surface |

## Launch recommendation

`NO-GO` until `B1` through `B7` are cleared on the local recovery branch.

Recommended path:

- do not merge `origin/main`
- do not import `/private/tmp/c2acct-main-auth`
- fix forward from `/Users/camerongarrett/work/c2acct-live`
