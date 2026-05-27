/**
 * prisma-safe.ts
 * Usage:
 *   node --import tsx scripts/prisma-safe.ts migrate deploy
 *   node --import tsx scripts/prisma-safe.ts db push
 *
 * Safety:
 *   - If NODE_ENV=production, requires ALLOW_PROD_DB_MIGRATIONS=1
 *   - Prevents accidental prod schema changes from a runner
 *   - Uses the repo-local Prisma CLI via pnpm to avoid npx version drift
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
  fail("PAT local Prisma commands require DATABASE_URL from runtime env, .env.local, or .env.");
}

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(packageManagerCommand, ["exec", "prisma", ...args], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  fail(
    `Failed to launch Prisma via pnpm. Run "pnpm install" and "pnpm prisma:generate", then retry. Original error: ${result.error.message}`
  );
}

process.exit(result.status ?? 1);
