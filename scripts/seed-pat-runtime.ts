import { applyRepoEnv } from "@/lib/env/repoEnv";

let prismaClient: { $disconnect(): Promise<void> } | null = null;

async function main() {
  applyRepoEnv();
  const [
    { default: prisma },
    { ensureLocalReviewUsers },
    { ensureDemoPatEcosystem, ensureConsultantEcosystemForReview },
    { ensureFirmAlignmentSystem, ensureFirmProductModule },
    { ensurePilotCohortSeed },
    { ensureUserPatScaffold },
    { ensureVendorProductModule },
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/auth/localReview"),
    import("@/lib/demoPatEcosystemSeed"),
    import("@/lib/firmPat"),
    import("@/lib/pilotCohortSeed"),
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
  const pilotCohort = await ensurePilotCohortSeed(prisma);
  const localReviewSeed = await ensureLocalReviewUsers(prisma);
  // Phase 2 / Day 11: minimal consultant ecosystem so /consultants is non-empty
  // when review.consultant@pat.local signs in. Runs after ensureLocalReviewUsers
  // so the consultant User row exists. Phase 6 expands this to 4 ecosystems.
  const consultantEcosystem = await ensureConsultantEcosystemForReview(prisma);
  // Customer-facing Pat help corpus so Ask Pat retrieves locally (help_doc FTS).
  const { indexHelpDocs } = await import("./index-help");
  const helpIndex = await indexHelpDocs(prisma);
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
  console.log("PAT pilot cohort:", pilotCohort);
  console.log(`Local review auth users seeded: ${localReviewSeed.seeded ? localReviewSeed.userEmails.length : 0}`);
  console.log("Consultant ecosystem (Phase 2 minimal):", consultantEcosystem);
  console.log(`Pat help corpus: ${helpIndex.indexed} indexed, ${helpIndex.skipped} unchanged, ${helpIndex.total} total`);
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
