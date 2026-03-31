/**
 * prisma-safe.ts
 * Usage:
 *   node --import tsx scripts/prisma-safe.ts migrate deploy
 *   node --import tsx scripts/prisma-safe.ts db push
 *
 * Safety:
 *   - If NODE_ENV=production, requires ALLOW_PROD_DB_MIGRATIONS=1
 *   - Prevents accidental prod schema changes from a runner
 */
import { spawnSync } from "node:child_process";
import { loadEnv } from "./_shared/prismaScript";

loadEnv();

function fail(message: string) {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  fail("Usage: node --import tsx scripts/prisma-safe.ts <migrate|db> <deploy|push> [extra args...]");
}

const isProduction = (process.env.NODE_ENV || "").toLowerCase() === "production";
if (isProduction && process.env.ALLOW_PROD_DB_MIGRATIONS !== "1") {
  fail("Refusing to run Prisma in production. Set ALLOW_PROD_DB_MIGRATIONS=1 to override.");
}

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is not set.");
}

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npxCommand, ["prisma", ...args], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
