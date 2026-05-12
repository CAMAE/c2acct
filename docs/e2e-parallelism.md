# E2E parallelism

How `test:e2e:local-review` reaches its runtime envelope and which residual blocker still pins it to `--workers=1`. Reflects Day-19 Block 1's partial closure of AUDIT-D18-002 and the Day-19-opened AUDIT-D19-001.

## Current state

`package.json`'s `test:e2e:local-review` runs at `--workers=1` with the standalone-built webServer. Headline measurements:

- **Runtime: ~34s** at workers=1 (down from ~3m at the dev-server webServer baseline). 5-6× speedup. This is the AUDIT-D18-002 win.
- **15 passed / 1 skipped** consistently across reruns at workers=1.
- **Workers > 1 still unsafe** because of cross-file consultant-identity race — see AUDIT-D19-001 below.

## What changed Day-19 Block 1

`playwright.config.ts` webServer command flipped from `bash scripts/run-playwright-dev.sh` (which copied the repo to a temp dir and ran `npx next dev --webpack`) to `bash scripts/e2e/run-playwright-standalone.sh` (which execs `node .next/standalone/server.js` from the canonical repo root).

The standalone server compiles once during `pnpm build` and serves pre-built artifacts on every request. No per-request JIT, no HMR contention. The Day-14 Running Log line 1111 prediction was correct: "Worth revisiting if/when the test webserver moves to standalone build (production mode) or to Turbopack — either would likely restore safe parallelism."

The standalone path delivered the runtime win on its own, even without lifting the workers pin.

## How the wrapper script handles env vars

`scripts/e2e/run-playwright-standalone.sh` does what `next dev` does for free:

1. **Verify the build.** If `.next/standalone/server.js` is missing, runs `pnpm build`. The webServer command should not assume the build exists.
2. **Capture PLAYWRIGHT_PORT BEFORE sourcing `.env.local`.** The project's `.env.local` carries `PORT=3000` for the standalone:local proof path; if sourced after the capture, it would clobber the Playwright-requested port. The wrapper captures into a local var first, then re-exports after sourcing.
3. **Source `.env.local`** for DATABASE_URL and the rest of the dev-vars (`set -a; source .env.local; set +a` style).
4. **Strip `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`** after the source. The standalone server in NODE_ENV=production enables the GitHub provider button on /sign-in when those creds are set; `e2e/release-integrity.spec.ts:43` asserts the button is NOT visible (the contract is "local-review-auth only"). The dev server hid it automatically; standalone doesn't, so the wrapper strips them explicitly.
5. **Force `HOSTNAME=127.0.0.1`.** macOS bash sets HOSTNAME to the system hostname ("Camerons-Mini" etc.) by default, which Next.js would bind to the non-loopback interface. Explicit `127.0.0.1` keeps the binding loopback-only.
6. **Set `NODE_ENV=production`** so Auth.js + Next.js apply production semantics (matches the real deploy mode).
7. **Apply default fallbacks** for AUTH_URL, NEXTAUTH_URL, AUTH_SECRET, PAT_ENABLE_LOCAL_REVIEW_AUTH, PAT_LOCAL_REVIEW_PASSWORD. Explicit env from the `test:e2e:*` command wins; the fallbacks only fire if the caller didn't set them.

Adding a new env var to the e2e environment: add the `KEY=value` prefix to the relevant `test:e2e:*` script in `package.json`, then if it needs a default for ad-hoc invocations, add a `export KEY="${KEY:-default}"` line to the wrapper script after the .env.local source.

## Why `--workers=1` still pins (AUDIT-D19-001)

Day-19 Block 2 tried default parallelism (workers=2 on Mac Mini). Run 1 passed in 29s (15/1). Runs 2 and 3 failed consistently on `e2e/local-review-auth.spec.ts:386` ("proves consultant access stays company-scoped after admin create and assignment") with a 120s timeout.

Diagnosis: **cross-file consultant-identity race.** Two specs mutate the same consultant's `ConsultantAssignment` row under parallel workers:

- `e2e/local-review-auth.spec.ts:386` — admin creates `review.consultant@pat.local` via the admin UI, assigns them to a Solo: ecosystem.
- `e2e/consultant-flow.spec.ts:9` — signs in as `review.consultant@pat.local`, expects them to see the demo-bench ecosystem.

When Worker A's admin-create-and-assign and Worker B's consultant-sign-in race, Worker B reads the wrong assignment state and the test's drill-down assertions stall. Per Day-19 prompt discipline ("Don't paper over with retries"): pin stays.

**AUDIT-D19-001** tracks the fix. Probable shape: refactor the admin-create-and-assignment test to use a per-run unique consultant identity (timestamped email, similar to how it already generates `Consultant Assigned Firm <ts>` firm names). Or split the two e2e files into separate Playwright projects with serial-mode coordination. Once landed, `--workers=1` becomes `${CI:+--workers=1}` (parallel local, single-worker CI for log determinism).

## Lessons learned

- **The Day-14 `--workers=1` pin survived to Day 19 because the diagnosis was right but the fix required an architectural change.** Three sequential Day-N investigations (Day 14 filing, Day 18 re-investigation, Day 19 implementation) traced the same root cause — `next dev --webpack` JIT contention — but each Day-N's scope only included pieces of the closure. The standalone-build switch was the missing piece.
- **The "fixture leak + workers pin" framing on Day 18 was a partial diagnosis.** AUDIT-D12-002 (fixture leak) was a real and necessary fix but not the primary blocker. The dev-server JIT was the dominant flake source; the leak was a secondary contributor. Closing fixture leak first didn't unblock workers > 1, but it WAS needed before parallelism could be safely tried (otherwise the fixture state would have masked the JIT issue with different symptoms).
- **Architectural switches need env-handling audits.** Switching from `next dev` to `node .next/standalone/server.js` looked like a 5-line config change. It surfaced two env-loading bugs (PORT clobber, GitHub creds bleed) that required wrapper-script logic to address. Future infra switches: budget for env-handling diagnosis, not just the surface-level command change.

## Validate-launch path

The Day-19 follow-up `PAT_VALIDATE_LAUNCH_SKIP_MAC_MINI=1` env gate (see `scripts/validate-launch.ts`) skips the three mac-mini tail steps on dev workstations:
- `scripts/mac-mini/restart-app.sh` (requires launchctl target)
- `scripts/mac-mini/launchd-check.sh` (requires launchctl target)
- `scripts/mac-mini/port-owner-proof.sh` (requires the launchd-managed server)

On dev workstations, set `PAT_VALIDATE_LAUNCH_SKIP_MAC_MINI=1` in `.env.local` or inline; the chain reaches the `validate-launch` step's COMPLETE write and the bucket map can promote `local-validation-chain` from UNVERIFIED to COMPLETE. Mac-mini hosts leave the env var unset and run the full chain unchanged.
