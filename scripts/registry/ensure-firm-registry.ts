/**
 * pnpm registry:ensure [--check] [--force]
 *
 * R49 deploy-night path for the firm alignment registry marker (RegistryEnsure).
 *   --check  print the deployed seed version and whether it is recorded; no writes.
 *   --force  run the full ensureFirmAlignmentSystem and re-record the marker even
 *            when the version is already recorded.
 *   (none)   run the ensure only when the version is not recorded (what a fresh
 *            instance does behind PAT_ENABLE_REGISTRY_MEMO=1).
 */
import { loadEnv } from "../_shared/prismaScript";
loadEnv();

async function main() {
  const { prisma } = await import("@/lib/prisma");
  const { ensureFirmAlignmentSystemAtSeedVersion, getFirmRegistrySeedVersion, describeFirmRegistryEnsurer } = await import("@/lib/firmPat");
  const check = process.argv.includes("--check");
  const force = process.argv.includes("--force");
  const seedVersion = getFirmRegistrySeedVersion();
  const marker = await prisma.registryEnsure.findUnique({ where: { seedVersion } });
  const latest = await prisma.registryEnsure.findFirst({ orderBy: { ensuredAt: "desc" } });
  console.log(`seed version: ${seedVersion}`);
  console.log(`recorded:     ${marker ? `yes (ensured ${marker.ensuredAt.toISOString()} by ${marker.ensuredBy})` : "no"}`);
  console.log(`latest row:   ${latest ? `${latest.seedVersion} (ensured ${latest.ensuredAt.toISOString()} by ${latest.ensuredBy})` : "none"}`);
  if (!check) {
    const t0 = performance.now();
    const result = await ensureFirmAlignmentSystemAtSeedVersion({ force });
    console.log(`${result.ran ? "ensure ran" : "ensure skipped (already recorded)"} in ${Math.round(performance.now() - t0)} ms; ${result.modules.length} firm modules; ensuredBy ${describeFirmRegistryEnsurer()}`);
  }
  await prisma.$disconnect();
}
void main().catch((error) => { console.error(error); process.exit(1); });
