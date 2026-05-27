import { defineConfig } from "@playwright/test";

/**
 * E2E parallelism is fully unblocked as of Day-20.
 *
 * Two chained closures got us here:
 *
 * 1. AUDIT-D18-002 (Day-19): e2e webServer migrated from
 *    `next dev --webpack` to a standalone-built
 *    `node .next/standalone/server.js`. Eliminated the per-request JIT
 *    contention that gated parallel workers. Runtime dropped from ~3m
 *    to ~34s at workers=1 — a 5-6× speedup on its own.
 *
 * 2. AUDIT-D19-001 (Day-20): per-run unique consultant identity in
 *    `e2e/local-review-auth.spec.ts:382` (admin-create-and-assignment
 *    test). The Day-14 pin's remaining residual root cause turned out
 *    NOT to be next-dev JIT alone — there was a parallel-workers race
 *    on `review.consultant@pat.local`'s ConsultantAssignment row.
 *    Closing required (a) a per-run timestamped consultant email
 *    (`review.consultant+admincreate-<ts>-<rand>@pat.local`) and (b) a
 *    pattern-match for that suffix in `lib/auth/localReview.ts` so the
 *    credentials provider accepts it. Three sequential workers=2 runs
 *    after the close: 15/1 in 29s / 27s / 27s.
 *
 * webServer command: `bash scripts/e2e/run-playwright-standalone.sh`.
 * Wrapper verifies a fresh standalone build, loads `.env.local`,
 * strips GitHub OAuth creds (release-integrity spec requires it
 * absent), forces HOSTNAME=127.0.0.1.
 *
 * Workers pin: lifted to `${CI:+--workers=1}` in
 * package.json's test:e2e:local-review. Locally Playwright uses the
 * default CPU-count parallelism; on CI (where CI=1 is set) the
 * expansion produces `--workers=1` for log determinism.
 *
 * See: docs/e2e-parallelism.md, Day-19 + Day-20 Running Log entries.
 */
const port = Number(process.env.PLAYWRIGHT_PORT ?? "3001");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  timeout: 30_000,
  // AUDIT-D19-001 close (Day-20 Block 4): cap workers at 2 locally,
  // 1 on CI for log determinism. The Day-20 verification proved 3
  // sequential workers=2 runs all 15/1; workers=5 (Playwright default
  // on a 10-CPU host) still flakes on a higher-order race that's likely
  // DB connection-pool saturation under heavy parallel admin
  // operations. workers=2 is the empirically-safe upper bound today;
  // raising it is a Phase-5 ops task tracked separately as
  // AUDIT-D20-001 if/when it becomes important.
  workers: process.env.CI ? 1 : 2,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command:
      process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
      "bash scripts/e2e/run-playwright-standalone.sh",
    url: baseURL,
    reuseExistingServer,
    // Standalone has no JIT, but a cold start still copies env, opens the
    // Prisma client connection, and binds the listener. 180s is generous;
    // typical readiness is 2-5s.
    timeout: 180_000,
  },
});
