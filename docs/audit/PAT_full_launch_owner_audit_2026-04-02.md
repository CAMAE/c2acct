# PAT Full Launch Owner Audit (2026-04-02)

Evidence root for this audit:

- Canonical local release root: `/Users/camerongarrett/work/c2acct-live`
- Canonical branch: `recovery/pat-2026-03-31-baseline`
- Current HEAD at audit time: `252b7f39ec77b5459c26791769410b87c4048cec`
- Rollback baseline named by local docs and release manifest: `078a41f6816e81e599b94423faf501d10c2aa70c`
- `origin/main`: `363436c0e049ff8652c8e6fc1fd5c3bbdce58531` dated `2026-03-08 17:16:59 -0500`
- Ahead/behind versus `origin/main`: `28` ahead, `0` behind

Prompt-referenced files missing in this environment:

- `/mnt/data/Pasted text.txt`
- `/mnt/data/Pasted text (2).txt`
- `/mnt/data/Core Build AAE Guide.pages`
- `docs/audit/GitHub_Main_Reconciliation_2026-04-01.md`
- `docs/audit/PAT_Launch_Readiness_Audit_2026-04-01.md`
- `docs/audit/PAT_Release_Candidate_Ship_Report_2026-04-01.md`

Exact source-of-truth decision for this audit:

- Local recovery source is the only candidate release truth.
- GitHub-visible `origin/main` is stale shared truth only.
- Live host runtime on port `3000` is wrong or incomplete until proven by launchd ownership plus release-fingerprint agreement.

## current risk

Current risk is `high`.

The local source tree is PAT-correct in the files that define the launch surface, but the release is not launch-ready because the current launch-critical gate is red and the host is not cut over. `node scripts/release/validate-source-integrity.mjs --root /Users/camerongarrett/work/c2acct-live` failed on `2026-04-02` with `git_dirty`, driven by launch-critical dirty entries in `scripts/mac-mini/nightly-verify.sh` and `scripts/mac-mini/status.sh`. The host proof on the same date shows `launchd_service_state=not-loaded`, `live_port_owner_state=stale-listener`, `live_port_owner_pid=25059`, and `live_release_probe_http=000`.

The only defensible launch direction is `FIX_FORWARD_FROM_ROLLBACK_BASELINE`: keep `/Users/camerongarrett/work/c2acct-live` as source of truth, do not merge `origin/main`, do not import `/private/tmp/c2acct-main-auth`, and fix the remaining blockers on top of the rollback recovery line.

## release risk

Release risk is `high` because the branch is dirty and the release-state artifacts disagree.

Evidence:

- Branch: `recovery/pat-2026-03-31-baseline`
- HEAD: `252b7f39ec77b5459c26791769410b87c4048cec`
- Dirty entries include:
  - `M scripts/mac-mini/launchd-check.sh`
  - `M scripts/mac-mini/nightly-verify.sh`
  - `M scripts/mac-mini/status.sh`
  - `?? scripts/mac-mini/port-owner-proof.sh`
- Source-integrity warnings show stale recorded state:
  - `state_commit_out_of_date expected=252b7f39ec77b5459c26791769410b87c4048cec actual=01a68f4f09d4523f9f5db35814d2419157cdd8af`
  - `state_fingerprint_seed_out_of_date`
- `artifacts/mac-mini/state/canonical-root.json` has been rewritten to current HEAD, but `artifacts/mac-mini/state/release-state.env` still reports `COMMIT=01a68f4` and `BUILD_ID=dSLY1LiY8b0PPPk-gfrLG`, while `.next/BUILD_ID` is `fBUhtnyBzIXuKNflFKKkF`.

Conclusion: the repo contains the right release machinery, but the release proof set is not synchronized to a clean launch candidate yet.

## runtime risk

Runtime risk is `high`.

Local isolated rendered-PAT validation could not be freshly proven in this sandboxed session. Running `node scripts/release/validate-pat-surfaces.mjs --root /Users/camerongarrett/work/c2acct-live --port 3310` failed with `listen EPERM: operation not permitted 127.0.0.1:3310`, so this session could not bind an ephemeral standalone runtime for a fresh local browser-level proof.

Live runtime proof is worse:

- `node scripts/release/validate-pat-surfaces.mjs --root /Users/camerongarrett/work/c2acct-live --base-url http://127.0.0.1:3000` failed with `runtime_error:unknown:fetch failed`
- direct `curl` to `http://127.0.0.1:3000/`, `/sign-in`, and `/login` returned connection failure in this sandbox
- host proof still shows `live_port_listening=yes`, `live_port_owner_state=stale-listener`, and no reachable `/api/release-fingerprint`

Conclusion: local PAT correctness and host PAT correctness are not the same thing. Local source is coherent; live runtime is not proven and should be treated as wrong.

## auth risk

Auth risk is `medium-high`.

What is fixed locally:

- `auth.config.ts` points Auth.js at `/sign-in`
- `app/login/page.tsx` is a redirect shim into `buildCanonicalSignInPath(...)`
- `auth.ts` allows only provisioned users or explicit non-production local-review users
- `lib/auth/localReview.ts` keeps deterministic review identities behind non-production flow only
- unit coverage exists in `tests/auth.signin-canonical.test.ts` and `tests/auth.login-compat.test.ts`

What is still blocking launch:

- host status reports `env_ready=no missing=AUTH_GITHUB_ID,AUTH_GITHUB_SECRET`
- production auth mode remains `github`
- no audit evidence supports expanding auth beyond GitHub-mode for this track

No-ship auth markers before launch:

- no password-hash migration
- no bootstrap-user auth expansion
- no credentials-first production auth
- no import of mixed-copy `app/sign-in/**` or invitee/auth surface files from `/private/tmp/c2acct-main-auth`

## product-surface risk

Product-surface risk is split:

- Local source risk: `low`
- Live rendered surface risk: `high`

Local PAT-positive evidence:

- `app/page.tsx` renders PAT home and sign-in entry
- `app/layout.tsx` renders PAT shell/header and release fingerprint
- `app/sign-in/page.tsx` is the canonical PAT sign-in hub
- `app/vendor/page.tsx`, `app/firm/page.tsx`, `app/user/page.tsx`, and `app/admin/page.tsx` are PAT/C2Core surfaces
- `ops/release/pat-surface-manifest.json` marks the no-ship surface markers as forbidden:
  - `AAE`
  - `Autonomous Alignment Infrastructure for Accounting Firms.`
  - `Profiles`
  - `Top Seven Outputs`
  - `Alignment Survey`
  - `pre-approved GitHub accounts`

GitHub-visible stale evidence from `origin/main`:

- `origin/main:app/page.tsx` still renders `AAE`, `Autonomous Alignment Infrastructure for Accounting Firms.`, `Profiles`, and `Top Seven Outputs`
- `origin/main:app/login/page.tsx` still renders `Beta access is restricted to pre-approved GitHub accounts.` and `Continue with GitHub`
- `origin/main:auth.config.ts` still points `signIn` at `/login`

Conclusion: local PAT surface is the corrected truth; GitHub main and live host runtime are not.

## deployment/launchd/host risk

Deployment/launchd/host risk is `high` and is a launch blocker.

Evidence from `bash scripts/mac-mini/port-owner-proof.sh`:

- `launchd_service_state=not-loaded`
- `launchd_service_pid=missing`
- `live_port_listening=yes`
- `live_port_owner_state=stale-listener`
- `live_port_owner_pid=25059`
- `live_port_owner_command=node`
- `live_release_probe_http=000`
- `ownership_check=fail`
- `ownership_failures=launchd_not_loaded,non_launchd_port_owner,live_release_endpoint_unavailable`

Evidence from `bash scripts/mac-mini/launchd-check.sh`:

- `launchd_app=not-loaded`
- `launchd_verify=loaded`
- `env_ready=no missing=AUTH_GITHUB_ID,AUTH_GITHUB_SECRET`
- command exits non-zero because host ownership proof fails

Conclusion: port ownership, launchd state, live fingerprint availability, and env readiness do not agree. Host cutover is not complete and must not be waved through.

## source-of-truth risk

Source-of-truth risk is `high` unless the launch owner ignores stale or missing inputs.

Current truth hierarchy:

1. `/Users/camerongarrett/work/c2acct-live` on `recovery/pat-2026-03-31-baseline` at `252b7f39ec77b5459c26791769410b87c4048cec`
2. In-repo build and audit docs present locally on that branch
3. `origin/main` only as stale comparison material
4. port `3000` runtime only after host proof passes

Why the risk exists:

- several prompt-cited source files are absent in this environment
- the prior full audit file in-repo was itself stale and anchored to older HEAD `6e082f8...`
- `origin/main` is materially older AAE-era content
- live host runtime is not fingerprint-verifiable

Conclusion: for launch ownership, local recovery source is the exact source of truth and anything else is supporting or stale evidence.

## local-vs-GitHub drift risk

Local-vs-GitHub drift risk is `high`, but the drift is mostly intentional and necessary.

`origin/main...HEAD` contains 519 changed paths and 28 local-only commits. Drift classification for launch ownership:

- `launch-critical landed`
  - PAT shell and homepage replacement
  - canonical `/sign-in` and `/login` compatibility redirect
  - `proxy.ts` protected-route gate
  - PAT role portals under `app/vendor/*`, `app/firm/*`, `app/user/*`, `app/admin/*`
  - standalone runtime config in `next.config.ts`
  - release fingerprint route and library
  - source-integrity and rendered-surface validators
  - Mac mini launchd/install/status/rollback contract
  - CI release-critical change detection and PAT marker checks
- `launch-safe local-only`
  - current audit docs
  - rebuild notes
  - recovery artifacts
  - research packages
  - archive migrations of obsolete helper scripts
- `defer prelaunch`
  - Slice A auth/seed/password-hash expansion described in local docs but not required for GitHub-mode launch
  - remaining Slice D work outside the already-landed narrow sub-slices
- `reject mixed-copy surface`
  - any top-level shell/auth/homepage/sign-in imports from `/private/tmp/c2acct-main-auth`
  - any AAE-branded or `/login`-primary surface from stale `origin/main`
- `unknown`
  - none of the audited launch-critical local drift fell into unknown; unknown status applies only to the prompt-cited missing external files

Conclusion: the right response to drift is not to merge `origin/main`; it is to keep fixing forward from the rollback recovery line.

## already fixed

- Canonical release root is encoded as `/Users/camerongarrett/work/c2acct-live`
- `next.config.ts` is `output: "standalone"`
- `package.json` includes `release:prelaunch`
- `/sign-in` is the canonical PAT sign-in route
- `/login` is compatibility-only in local source
- PAT/C2Core top-level surfaces exist locally for `/`, `/vendor`, `/firm`, `/user`, and `/admin`
- release fingerprint route exists at `app/api/release-fingerprint/route.ts`
- host proof scripts exist locally and fail closed
- CI contains release-critical drift detection and PAT marker verification
- `origin/main` staleness is now explicit and evidenced

## still missing

- clean source-integrity pass on current HEAD `252b7f39ec77b5459c26791769410b87c4048cec`
- synchronized release-state artifacts for current HEAD and current build
- live launchd ownership of port `3000`
- reachable live `/api/release-fingerprint`
- live PAT rendered-surface proof on the real runtime URL
- production GitHub env readiness on host
- a fresh rendered-PAT proof for current HEAD outside this sandbox's port-binding restriction

## should add before launch

- commit or otherwise reconcile the launch-critical Mac mini script changes so source-integrity can pass
- refresh build and release-state artifacts on the intended release commit
- rerun `npm run release:prelaunch` on a clean tree
- rerun `bash scripts/mac-mini/launchd-check.sh` until `ownership_check=pass`
- rerun rendered PAT surface validation against the actual live URL after launchd cutover
- capture one current host proof bundle after cutover:
  - `status.sh`
  - `port-owner-proof.sh --check`
  - `/api/release-fingerprint`
  - rendered PAT surface validation

## must not add before launch

- do not merge `origin/main` into the recovery branch
- do not import any top-level shell/auth/sign-in/homepage files from `/private/tmp/c2acct-main-auth`
- do not expand auth beyond GitHub-mode in this track
- do not ship AAE markers, `/login` as primary auth, or `pre-approved GitHub accounts` copy
- do not bypass launchd proof with ad hoc `node` listeners on port `3000`
- do not treat `npm run build` alone as launch readiness
- do not land deferred Slice A as a blob
- do not land additional deferred Slice D work before launch

## highest-confidence launch recommendation

`FIX_FORWARD_FROM_ROLLBACK_BASELINE`

Reason:

- the exact source of truth is the local recovery branch, not `origin/main` and not the current live host runtime
- the local PAT product/auth/runtime contract is substantially fixed
- the exact current blocker set is host cutover plus release proof hygiene, not PAT surface reconstruction
- no-ship markers and deferred slices are known and can be held

Single go/no-go decision as of `2026-04-02`:

- `NO-GO` for immediate launch
- `GO` only after the current blocker matrix is cleared on top of `/Users/camerongarrett/work/c2acct-live`
