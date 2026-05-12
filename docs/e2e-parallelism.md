# E2E parallelism

Why `test:e2e:local-review` runs with `--workers=1` and what unblocks parallelism, per AUDIT-D18-002 (opened Day-18 Block 5).

## Current state

`package.json` pins the local-review e2e to single-worker:

```jsonc
"test:e2e:local-review": "PLAYWRIGHT_PORT=3001 ... playwright test --workers=1 e2e/local-review-auth.spec.ts e2e/consultant-flow.spec.ts"
```

Runtime: ~3 min at HEAD. Parallel workers would not help — the bottleneck is single-server JIT compile, not test execution.

## Root cause

The webServer for the e2e suite is `next dev --webpack` (via `scripts/run-playwright-dev.sh`). `next dev` JIT-compiles routes on first hit and serves HMR updates for subsequent file changes. Under concurrent worker load, the second worker's request hits the same dev-server process while the first worker is mid-compile, and `page.goto(..., { waitUntil: "networkidle" })` never settles within 30s.

The pin was introduced Day-14 as a pragmatic mitigation. The Running Log line 1111 captured the diagnosis at the time:

> Day-14 `--workers=1` pin: pragmatic mitigation for `next dev --webpack` parallel HMR flake. Worth revisiting if/when the test webserver moves to standalone build (production mode) or to Turbopack — either would likely restore safe parallelism.

## What Day-18 Block 3 fixed (necessary but not sufficient)

AUDIT-D12-002 (e2e fixture leak) was a secondary contributor to workers=2 flake. The Day-17 happy-path consultant-flow test wrote `BriefEditChoice` rows that persisted across runs, biasing the next run's initial active-chip state. The `local-review-auth` admin-create-assignment test similarly leaked timestamped `Solo: Consultant Assigned Firm <ts>` ecosystems.

Block 3's `scripts/test-cleanup-e2e-fixtures.ts` script + `test.afterAll` hooks in both spec files sweep all three leak vectors (BriefEditChoice, timestamped Companies, Solo: Ecosystems) post-run. DB stays clean across invocations.

This was necessary — without it, even single-worker runs eventually flake when the leaked state biases initial assertions. But it doesn't address the dev-server contention; workers=2 still fails on `networkidle` timeouts after Block 3.

## What unblocks workers > 1 (AUDIT-D18-002)

Switch `test:e2e:local-review`'s webServer from `next dev --webpack` to a standalone-built `node .next/standalone/server.js` invocation. Compile happens once at chain-start; no per-request JIT, no HMR contention.

Required changes:
1. `scripts/run-playwright-dev.sh` → `scripts/run-playwright-standalone.sh` that does `pnpm build && node .next/standalone/server.js`
2. Update `playwright.config.ts` webServer.command accordingly (or via env)
3. Validate against a workers=2 run that produces 15 passed / 1 skipped (no flake)
4. Lift the `--workers=1` pin in `package.json`

Expected payoff:
- Parallelism becomes safe AND
- Runtime drops from ~3m to ~1m (no per-test JIT cost)

Tracked separately as AUDIT-D18-002 — out of scope for the Day-18 deferred-ticket pass. Day-18 closed the four AUDIT-D12-* tickets and AUDIT-D16-001; the AUDIT-D18-002 e2e ops change is Phase-5 territory.

## Why not Turbopack

The Running Log mentions Turbopack as a candidate ("either would likely restore safe parallelism"). Turbopack is faster than webpack on dev-server start but is still HMR-driven — concurrent worker requests against the same process would still contend on per-route compile, just with a smaller per-route cost. Standalone-build sidesteps the question entirely: no compile at request time.

If Turbopack proves to be the easier swap, that's an acceptable shortcut path under AUDIT-D18-002. Standalone-build is the conservative choice; Turbopack is the experimental one.

## Locked-in expectation for now

`test:e2e:local-review` runs serially at `--workers=1` and produces 15 passed / 1 skipped in ~3 minutes. Any drift from that envelope should re-investigate whether the dev-server is healthy or whether a new fixture-cleanup gap was introduced. Block 3's cleanup script + `playwright.config.ts` comment-block document the current contract.
