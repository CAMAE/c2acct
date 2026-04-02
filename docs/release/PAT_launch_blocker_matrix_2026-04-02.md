# PAT Launch Blocker Matrix (2026-04-02)

## Fixed

| Area | Status | Evidence |
| --- | --- | --- |
| Canonical release root | fixed | `ops/release/canonical-root.json` names `/Users/camerongarrett/work/c2acct-live` and forbids dev and `/private/tmp` roots |
| PAT source surfaces | fixed | `app/page.tsx`, `app/layout.tsx`, `app/sign-in/page.tsx`, `app/vendor/page.tsx`, `app/firm/page.tsx`, `app/user/page.tsx`, `app/admin/page.tsx` are PAT-positive |
| Auth route contract | fixed | `auth.config.ts` points to `/sign-in`; `app/login/page.tsx` is compatibility-only |
| Standalone runtime contract | fixed | `next.config.ts` uses `output: "standalone"` |
| Release gates | fixed | `release:prelaunch`, source-integrity gate, PAT surface gate, fingerprint contract, CI drift detection exist |
| Rollback proof | fixed | `scripts/mac-mini/rollback-release.sh` resolves known-good metadata deterministically |

## Must Fix Before Launch

| Area | Blocker | Current Evidence |
| --- | --- | --- |
| Running service | wrong site is still live on host | nightly `live_pat_surfaces` failed against `http://127.0.0.1:3000` and rendered AAE markers |
| `/sign-in` live route | canonical PAT hub is not currently live | nightly shows `/sign-in` returned `404` on the running service |
| `/login` live behavior | compatibility-only contract is not currently live | nightly shows `/login` returned `200` with first-class wrong-site login content |
| Health endpoint | host runtime is not healthy | latest nightly `health` failed with `401` at `/api/health/db` |
| Launchd target proof | active service is not proven to come from canonical root | status shows `launchd_app=not-loaded` while port `3000` is occupied |
| GitHub auth envs | production env contract is incomplete on host | status shows `env_ready=no missing=AUTH_GITHUB_ID,AUTH_GITHUB_SECRET` |
| Real rendered PAT proof | branch is not enough; live runtime must prove PAT | `validate-pat-surfaces` must pass against the actual runtime URL |

## Can Wait Until After Clean Launch

| Area | Why It Can Wait |
| --- | --- |
| Slice A auth and seed hygiene | current live contract remains `github`; credentials-first restore is deferred intentionally |
| Slice D product utility recovery | mixed `/private/tmp` tree is quarantined and not required for launch-surface correctness |
| Older audit filename backfill | current rollback/runtime/rebuild docs already describe the launch-critical truth |

## Must Not Land Before Launch

| Area | Reason |
| --- | --- |
| Deferred slices A and D as a blob | high risk of reintroducing mixed-source or non-validated behavior |
| Anything promoted from `/private/tmp/c2acct-main-auth` without file-level proof | quarantined mixed tree |
| PAT surface redesign | launch goal is serving the restored PAT truth, not redesigning it |
| Gate bypasses based on build-only or HTTP-200-only checks | incident class repeats if product truth is not validated |

## Launch Recommendation

NO-GO until the active host runtime is replaced with the canonical `c2acct-live` standalone build and the deployed service passes:

1. source integrity
2. launchd root proof
3. rendered PAT surface validation
4. fingerprint agreement
5. health validation
6. env readiness for `github` mode
