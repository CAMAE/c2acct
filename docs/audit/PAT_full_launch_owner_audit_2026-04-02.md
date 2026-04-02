# PAT Full Launch Owner Audit (2026-04-02)

## Scope

This audit treats the current rollback recovery branch `recovery/pat-2026-03-31-baseline` at commit `6e082f8142a44db7f7e672a5073938c0a6c54eba` as the only source of truth for launch readiness.

Referenced evidence on this branch:

- `docs/audit/PAT_rollback_restore_2026-04-02.md`
- `docs/audit/PAT_runtime_contract_repair_2026-04-02.md`
- `docs/rebuild/PAT_rebuild_slices_from_2026_03_31.md`
- `artifacts/recovery/c2acct-live-dirty.patch`
- `artifacts/recovery/post-3-31-file-inventory.txt`
- `artifacts/mac-mini/reports/nightly-summary-20260402T224727Z.txt`

Prompt-referenced April 1 audit files such as `docs/audit/GitHub_Main_Reconciliation_2026-04-01.md`, `docs/audit/PAT_Launch_Readiness_Audit_2026-04-01.md`, and `docs/audit/PAT_Release_Candidate_Ship_Report_2026-04-01.md` are not present on this recovery branch. Their absence is itself part of the GitHub-visible versus local-truth drift risk.

## Executive Decision

NO-GO.

The rollback recovery branch is materially improved and is now the correct PAT release candidate, but the host is not serving this validated build. PAT must not go live until the canonical root is the active runtime on the host and the running service passes rendered PAT surface validation, health validation, fingerprint agreement, and launchd-root proof at the real deployed URL.

## What Is Already Fixed

### Fixed: product-surface risk in source

- PAT home is present in `app/page.tsx`.
- PAT shell and nav are present in `app/layout.tsx`.
- `/sign-in` is the canonical PAT auth hub in `app/sign-in/page.tsx`.
- `/login` is compatibility-only in `app/login/page.tsx`.
- PAT role routes exist and are source-verified for `/vendor`, `/firm`, `/user`, and `/admin`.
- Approved PAT marker verification passes from source:
  - `node scripts/release/verify-approved-pat-markers.mjs --root .`

### Fixed: auth route contract

- `auth.config.ts` points Auth.js at `/sign-in`.
- protected-route redirects were moved off first-class `/login`.
- `/login` now preserves safe redirect/query recovery without remaining a user-facing auth destination.
- Unit coverage exists for canonical sign-in and login compatibility behavior.

### Fixed: runtime contract in repo

- `next.config.ts` is set to `output: "standalone"`.
- `package.json` contains `release:gate`, `release:smoke`, and `release:prelaunch`.
- canonical runtime contract is encoded in `ops/release/canonical-root.json`.
- fail-closed runtime validation exists in:
  - `scripts/mac-mini/common.sh`
  - `scripts/mac-mini/app-start.sh`
  - `scripts/mac-mini/launchd-install.sh`
  - `scripts/release/validate-source-integrity.mjs`

### Fixed: release-source risk in repo

- canonical release root is `/Users/camerongarrett/work/c2acct-live`.
- forbidden roots are:
  - `/Users/camerongarrett/work/c2acct`
  - `/private/tmp/c2acct-main-auth`
- `/private/tmp/c2acct-main-auth` remains quarantined and non-live.

### Fixed: operator visibility and rollback proof in repo

- browser-visible fingerprint is rendered from `app/layout.tsx`.
- API fingerprint exists at `/api/release-fingerprint`.
- operator status prints the same fingerprint contract.
- rollback is scripted in `scripts/mac-mini/rollback-release.sh`.
- nightly verification and CI critical-file protection are present.

## Must Fix Before Launch

### Must fix: running-service mismatch on the host

Latest nightly evidence in `artifacts/mac-mini/reports/nightly-summary-20260402T224727Z.txt` proves the host is not serving the validated recovery branch:

- `health` failed with `401` at `http://127.0.0.1:3000/api/health/db`
- `live_pat_surfaces` failed against `http://127.0.0.1:3000`
- `/sign-in` returned `404`
- `/login` returned `200` with first-class wrong-site content
- `/`, `/vendor`, `/firm`, `/user`, and `/admin` rendered AAE markers and lacked PAT markers
- browser-visible release fingerprint was absent from rendered pages
- `launchd_app=not-loaded`

This is a launch blocker because it means the active service is not the validated PAT runtime from the canonical root.

### Must fix: launchd and host runtime alignment

The repo contract is correct, but the host does not yet prove that `launchctl` is bootstrapping the canonical root:

- status shows `launchd_app=not-loaded`
- the port is occupied anyway
- the running process is therefore not proven to be the canonical `c2acct-live` standalone artifact

Before launch, the active service must be reinstalled or restarted from the canonical root and then proven with:

- `npm run release:prelaunch`
- `bash scripts/mac-mini/launchd-install.sh --check`
- `launchctl print gui/$(id -u)/com.c2acct.app`
- `bash scripts/mac-mini/status.sh`
- rendered PAT surface validation against the real runtime URL

### Must fix: production env readiness

The selected live auth mode is still `github`. Current status output shows:

- `env_ready=no missing=AUTH_GITHUB_ID,AUTH_GITHUB_SECRET`

PAT cannot launch in `github` mode without:

- `DATABASE_URL`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `AUTH_URL` or `NEXTAUTH_URL`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

### Must fix: rendered PAT gate must pass against the real runtime URL

Source-level verification is green, but build success and source verification do not prove launch readiness.

The real deployed runtime must pass:

- `/`
- `/sign-in`
- `/vendor`
- `/firm`
- `/user`
- `/admin`
- `/login` as compatibility-only
- `/api/release-fingerprint`

and must show:

- PAT-positive markers
- no AAE markers
- fingerprint agreement across browser, API, and ops

## Can Wait Until After Clean Launch

### Can wait: Slice A auth and seed hygiene

Deferred in `docs/rebuild/PAT_rebuild_slices_from_2026_03_31.md`.

- credentials-first auth
- password hashing and bootstrap seeding cleanup
- full invitee removal from all non-primary paths

These are not required to launch the rollback-baseline PAT runtime, because the current live contract remains `github`.

### Can wait: Slice D product utility recovery

Deferred for post-launch file-by-file review because `/private/tmp/c2acct-main-auth` is mixed and noisy.

- vendor product utility recovery
- broader vendor activation UX additions
- post-3/31 product runtime additions not required for launch-surface correctness

### Can wait: documentation backfill to absent April 1 audits

The recovery branch already has current rollback/runtime/rebuild docs. Restoring older audit filenames is not a prelaunch requirement.

## Must Not Land Before Launch

### Must not land: deferred slices A and D as a blob

Do not batch-restore credentials, product utility, or other deferred post-3/31 work before launch. The current recovery branch is PAT-correct specifically because those slices were kept out of the launch path.

### Must not land: anything from `/private/tmp/c2acct-main-auth` without file-level proof

That tree is mixed, quarantined, and historically carried wrong-site AAE surface risk.

### Must not land: product redesign or PAT surface rewrite

Current launch work is about proving and serving the rollback-baseline PAT truth, not redesigning it.

### Must not land: silent bypass of release gates

Do not treat:

- `npm run build`
- route existence
- HTTP 200 alone
- source grep alone

as sufficient launch proof.

## GitHub-Visible Vs Local-Truth Drift

### Current local recovery truth

Current branch head: `6e082f8142a44db7f7e672a5073938c0a6c54eba`

Local recovery truth now includes:

- canonical `/sign-in`
- `/login` compatibility-only
- standalone runtime
- source-integrity gate
- PAT surface manifest and rendered surface gate
- browser/API/operator fingerprint contract
- nightly verify
- rollback script
- CI critical-file drift protection

### Earlier GitHub-visible truth

- `origin/main` is still at `363436c0e049ff8652c8e6fc1fd5c3bbdce58531`
- `origin/main:app/page.tsx` still renders:
  - `AAE`
  - `Autonomous Alignment Infrastructure for Accounting Firms.`
  - `Profiles`
  - `Top Seven Outputs`
- `origin/main:app/login/page.tsx` still renders:
  - `Beta access is restricted to pre-approved GitHub accounts.`
  - `Continue with GitHub`

Conclusion:

- public GitHub `main` remains stale AAE truth
- local recovery branch is the corrected PAT launch candidate
- launch-owner decision must not be based on public `main`

## Reconciling The Rendered-Surface Mismatch

Mismatch to reconcile:

- approved PAT marker verification later passed from source
- earlier rendered PAT surface validation for `/vendor`, `/firm`, `/user`, `/admin` failed badly

Classification:

- this is a stale running service problem, not a stale manifest and not a real route regression

Why:

1. Source verification passes against the current recovery branch files for `/`, header, `/sign-in`, `/vendor`, `/firm`, `/user`, `/admin`, and `/login`.
2. The current source files are PAT-positive and do not contain the AAE markers the rendered validator reported.
3. The rendered validator hit `http://127.0.0.1:3000`, where:
   - `/sign-in` returned `404`
   - `/login` returned `200` and behaved like a first-class login page
   - AAE markers appeared on multiple routes
   - the browser release fingerprint was absent
4. Status simultaneously showed:
   - `launchd_app=not-loaded`
   - `listen=yes host=127.0.0.1 port=3000`

Therefore the failing rendered validation was exercising a stale or wrong running service, not the current recovery branch artifact.

## Category Summary

### Product-surface risk

- Source risk: fixed
- Running-service risk: launch blocker

### Auth risk

- Route contract: fixed
- Production env readiness: launch blocker until GitHub envs are present on host
- Credentials-first redesign: can wait

### Runtime risk

- Repo runtime contract: fixed
- Real deployed runtime proof: launch blocker

### Launchd / host risk

- Launchd scripts and checks: fixed in repo
- Actual loaded service target: launch blocker

### Release-source risk

- Canonical root selection and quarantine: fixed
- Host still serving non-proven runtime: launch blocker

### Documentation / source-of-truth risk

- Current rollback/runtime/rebuild docs: fixed enough for launch ownership
- Missing April 1 audit filenames on branch: non-blocking but should be noted

### GitHub-visible vs local-truth drift risk

- Still high
- `origin/main` is not safe launch truth
- launch decisions must use the recovery branch plus real host proof

## Highest-Confidence Launch Recommendation

Do not launch PAT from the current host state.

Launch only after the canonical recovery branch `recovery/pat-2026-03-31-baseline` is the active runtime on the host and all of the following are green at the real runtime URL:

1. `npm run release:prelaunch`
2. `bash scripts/mac-mini/launchd-install.sh --check`
3. `bash scripts/mac-mini/status.sh` showing:
   - `launchd_app=loaded`
   - canonical root `/Users/camerongarrett/work/c2acct-live`
   - clean git state
   - auth mode `github`
   - no missing required envs
4. `node scripts/release/validate-pat-surfaces.mjs --root /Users/camerongarrett/work/c2acct-live --base-url <real_runtime_url>`
5. `curl -s <real_runtime_url>/api/release-fingerprint`
6. browser verification that `/`, `/sign-in`, `/vendor`, `/firm`, `/user`, `/admin`, and `/login` match PAT truth and show no AAE markers

Until those are true at once, the correct launch-owner call is NO-GO.
