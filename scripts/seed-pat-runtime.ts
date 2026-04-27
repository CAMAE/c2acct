import { applyRepoEnv } from "@/lib/env/repoEnv";

let prismaClient: { $disconnect(): Promise<void> } | null = null;

async function main() {
  applyRepoEnv();
  const [
    { default: prisma },
    { ensureLocalReviewUsers },
    { ensureDemoPatEcosystem },
    { ensureFirmAlignmentSystem, ensureFirmProductModule },
    { ensureUserPatScaffold },
    { ensureVendorProductModule },
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/auth/localReview"),
    import("@/lib/demoPatEcosystemSeed"),
    import("@/lib/firmPat"),
    import("@/lib/userPat"),
    import("@/lib/vendorPat"),
  ]);
  prismaClient = prisma;

  const [vendorModule, firmModules, firmProductModule] = await Promise.all([
    ensureVendorProductModule(),
    ensureFirmAlignmentSystem(),
    ensureFirmProductModule(),
  ]);

  await ensureUserPatScaffold();
  const demoEcosystem = await ensureDemoPatEcosystem(prisma);
  const localReviewSeed = await ensureLocalReviewUsers(prisma);
  const firmSectionCount = await prisma.surveySection.count({
    where: {
      moduleId: {
        in: firmModules.map((module) => module.id),
      },
    },
  });

  console.log("PAT runtime seed complete");
  console.log(`Vendor product module: ${vendorModule.key}`);
  console.log(`Firm alignment modules: ${firmModules.length}`);
  console.log(`Firm alignment sections: ${firmSectionCount}`);
  console.log("Firm capability graph: seeded for canonical five-module PAT assessment");
  console.log(`Firm product module: ${firmProductModule.key}`);
  console.log("User PAT insight scaffold: ready");
  console.log("PAT demo ecosystem:", demoEcosystem);
  console.log(`Local review auth users seeded: ${localReviewSeed.seeded ? localReviewSeed.userEmails.length : 0}`);
}

main()
  .then(async () => {
    await prismaClient?.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("PAT runtime seed failed");
    console.error(error);
    await prismaClient?.$disconnect();
    process.exit(1);
  });
