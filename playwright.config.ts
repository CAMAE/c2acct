import { defineConfig } from "@playwright/test";

/**
 * NOTE on the `--workers=1` pin in package.json's test:e2e:local-review
 * script (AUDIT-D18-002 follow-up, opened Day-18 Block 5):
 *
 * The pin was originally added Day-14 as a pragmatic mitigation for
 * `next dev --webpack` parallel-HMR flake under the local-review e2e
 * load. Day-18's investigation expected the pin's residual cause to be
 * AUDIT-D12-002 (fixture leak across runs); Block 3 closed that leak.
 * But workers=2 still flakes after Block 3 — the next-dev-webpack root
 * cause that the Day-14 Running Log called out (line 1111) is the
 * actual remaining blocker:
 *
 *   "Worth revisiting if/when the test webserver moves to standalone
 *    build (production mode) or to Turbopack — either would likely
 *    restore safe parallelism."
 *
 * Concrete reproducer at Day-17 HEAD + Block 3 fixes, workers=2: the
 * consultant-flow "firm brief: happy path" test fails on page.goto
 * networkidle timeout because the JIT compile and the second worker's
 * request contend for the same dev-server process. Runtime stays at
 * ~3m (no parallelism win even when tests pass).
 *
 * Proper fix: switch test:e2e:local-review's webServer command from
 * `next dev --webpack` to a standalone-built `node .next/standalone/server.js`
 * (compiles once, no HMR contention). That's a Phase-5 e2e ops change,
 * tracked separately as AUDIT-D18-002 — do NOT bundle into the
 * Day-18 deferred-ticket pass.
 */
const port = Number(process.env.PLAYWRIGHT_PORT ?? "3001");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? `bash scripts/run-playwright-dev.sh ${port}`,
    url: baseURL,
    reuseExistingServer,
    timeout: 120_000,
  },
});
