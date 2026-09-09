/**
 * V3 box 7.1: after the suite, remove every row the specs created so the
 * shared local database (and :3000) never shows a test fixture.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export default async function globalTeardown() {
  // The Playwright process does not inherit the web server's env; the standalone
  // harness reads .env.local itself, so do the same here for DATABASE_URL.
  if (!process.env.DATABASE_URL) {
    try {
      const envFile = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
      const url = envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
      if (url) process.env.DATABASE_URL = url.replace(/^"|"$/g, "");
    } catch {
      // handled below
    }
  }
  if (!process.env.DATABASE_URL) {
    console.warn("[e2e teardown] DATABASE_URL not set; fixtures left in place");
    return;
  }
  const { removeE2eFixtures } = await import("../scripts/dev/reset-demo");
  const removed = await removeE2eFixtures();
  console.log(`[e2e teardown] removed fixtures: products=${removed.products} companies=${removed.companies} users=${removed.users}`);
}
