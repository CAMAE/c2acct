import { defineConfig } from "@playwright/test";

/**
 * AUDIT-D18-002 — partially closed Day-19 Block 1; --workers=1 pin
 * stays pending AUDIT-D19-001.
 *
 * The e2e webServer switched from `next dev --webpack` to a
 * standalone-built `node .next/standalone/server.js` invocation. The
 * standalone server compiles once at chain-start (no per-request JIT,
 * no HMR contention). That alone dropped runtime from ~3m to ~34s at
 * workers=1 — a 5-6× speedup, the headline AUDIT-D18-002 win.
 *
 * webServer command: `bash scripts/e2e/run-playwright-standalone.sh`.
 * That wrapper verifies a fresh standalone build (running `pnpm build`
 * if absent), loads `.env.local` for DATABASE_URL + friends, and execs
 * the standalone server with NODE_ENV=production.
 *
 * Workers pin: still `--workers=1` in package.json. Day-19 Block 2
 * trial at default parallelism (workers=2 on Mini) surfaced a residual
 * blocker that fixture-leak cleanup didn't address — cross-file
 * consultant-identity race. Both e2e/local-review-auth.spec.ts:386
 * (admin-creates-and-assigns) and e2e/consultant-flow.spec.ts:9
 * (review.consultant@pat.local lands on /consultants) mutate the
 * same consultant's ConsultantAssignment row. Under parallel workers
 * the writes race; consultant-flow's sign-in sees the wrong assignment
 * state. Run 1 passes (cold DB); runs 2+ fail consistently on
 * "proves consultant access stays company-scoped" (120s timeout).
 *
 * Per Day-19 prompt discipline ("Don't paper over with retries"):
 * pin stays; new ticket AUDIT-D19-001 opened for test-account
 * isolation. Once that lands, --workers=1 can be replaced with
 * `${CI:+--workers=1}` (parallel local, single-worker CI for log
 * determinism).
 *
 * See: docs/e2e-parallelism.md (Day-19 update), Day-19 Running Log
 * entry.
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
