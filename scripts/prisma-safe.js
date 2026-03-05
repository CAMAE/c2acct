/**
 * prisma-safe.js
 * Usage:
 *   node scripts/prisma-safe.js migrate deploy
 *   node scripts/prisma-safe.js db push
 *
 * Safety:
 *   - If NODE_ENV=production, requires ALLOW_PROD_DB_MIGRATIONS=1
 *   - Prevents accidental prod schema changes from a runner
 */
const { spawnSync } = require("child_process");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) fail("Usage: node scripts/prisma-safe.js <migrate|db> <deploy|push> [extra args...]");

const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
if (isProd && process.env.ALLOW_PROD_DB_MIGRATIONS !== "1") {
  fail("Refusing to run Prisma in production. Set ALLOW_PROD_DB_MIGRATIONS=1 to override.");
}

if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");

const prismaArgs = args; // pass through: e.g. ["migrate","deploy"]
const res = spawnSync("npx", ["prisma", ...prismaArgs], { stdio: "inherit", shell: true });
process.exit(res.status ?? 1);
