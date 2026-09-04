/**
 * Drive the ecosystem route for a CPU profile: one warm call, then two measured.
 *
 *   node --cpu-prof --cpu-prof-dir=tmp/cpuprof --import tsx scripts/perf/route-once.ts
 *   node scripts/perf/summarize-cpuprofile.mjs tmp/cpuprof
 *
 * Use this when profile-phases.ts says the route is CPU-bound: query counts and
 * row censuses say WHAT is fetched, the profile says which function spends the
 * time on it. The summary groups self time by function and by category (Prisma
 * result decoding, GC, app code), and inclusive time for app functions.
 */
import prisma from "@/lib/prisma";
import { applyRepoEnv } from "@/lib/env/repoEnv";

import { resolvePerfScaleTarget } from "./_perfScaleTarget";

applyRepoEnv();

async function main() {
  const target = await resolvePerfScaleTarget(prisma);
  const { getEcosystemDetailForConsultant } = await import("@/lib/ecosystem");
  const route = () => getEcosystemDetailForConsultant(target.consultantProfileId, target.ecosystemId);
  await route(); // warm: JIT + connections; the profile still includes it, so read shares, not totals
  const started = performance.now();
  await route();
  await route();
  console.log(`two measured calls: ${(performance.now() - started).toFixed(0)}ms`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
