/**
 * V3 box 7.1 (2026-09-09): keep :3000 free of test fixtures.
 *
 *   node --import tsx scripts/dev/reset-demo.ts --fixtures-only   # e2e teardown
 *   node --import tsx scripts/dev/reset-demo.ts                    # + restore the demo seed
 *
 * Removes every row the e2e suite creates — products named "E2E …" (the vendor
 * draft-persistence spec) and companies named "E2E Firm …" with their
 * "@pat-e2e.local" owners (the self-signup spec). Product and Company children
 * cascade (Subject, ProductProfile, submissions, memberships…); users are set
 * null on company delete and removed by address. Then, unless --fixtures-only,
 * re-runs seed:pat-runtime so the demo seed is whole again. This file is the
 * one tracked entry under scripts/dev (see .gitignore).
 */
import { spawnSync } from "node:child_process";
import prisma from "@/lib/prisma";

export async function removeE2eFixtures() {
  const products = await prisma.product.deleteMany({ where: { name: { startsWith: "E2E " } } });
  const companies = await prisma.company.deleteMany({ where: { name: { startsWith: "E2E Firm" } } });
  const users = await prisma.user.deleteMany({ where: { email: { endsWith: "@pat-e2e.local" } } });
  return { products: products.count, companies: companies.count, users: users.count };
}

async function main() {
  const fixturesOnly = process.argv.includes("--fixtures-only");
  const removed = await removeE2eFixtures();
  console.log(`[reset-demo] removed e2e fixtures: products=${removed.products} companies=${removed.companies} users=${removed.users}`);
  await prisma.$disconnect();
  if (fixturesOnly) return;
  const seed = spawnSync("pnpm", ["seed:pat-runtime"], { stdio: "inherit", env: process.env });
  if (seed.status !== 0) {
    console.error("[reset-demo] seed:pat-runtime failed");
    process.exit(seed.status ?? 1);
  }
  console.log("[reset-demo] demo seed restored");
}

const invokedDirectly = process.argv[1]?.endsWith("reset-demo.ts");
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
