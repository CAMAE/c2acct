/**
 * V3 box 7.1: after the suite, remove every row the specs created so the
 * shared local database (and :3000) never shows a test fixture. Runs
 * scripts/dev/reset-demo.ts --fixtures-only through tsx in a child process:
 * Playwright's own TS transform does not reach a dynamic import outside the
 * test tree, and the child inherits nothing from the web server, so the
 * script reads DATABASE_URL from .env.local itself when the env lacks it.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export default async function globalTeardown() {
  const env = { ...process.env };
  if (!env.DATABASE_URL) {
    try {
      const envFile = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
      const url = envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
      if (url) env.DATABASE_URL = url.replace(/^"|"$/g, "");
    } catch {
      // handled below
    }
  }
  if (!env.DATABASE_URL) {
    console.warn("[e2e teardown] DATABASE_URL not set; fixtures left in place");
    return;
  }
  const result = spawnSync("node", ["--import", "tsx", "scripts/dev/reset-demo.ts", "--fixtures-only"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    console.warn(`[e2e teardown] fixture cleanup failed (exit ${result.status}):\n${out}`);
    return;
  }
  console.log(`[e2e teardown] ${out.split("\n").find((line) => line.includes("[reset-demo]")) ?? "done"}`);
}
