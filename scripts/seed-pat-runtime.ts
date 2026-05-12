import prisma from "@/lib/prisma";
import { ensureLocalReviewUsers } from "@/lib/auth/localReview";
import { ensureFirmAlignmentSystem, ensureFirmProductModule } from "@/lib/firmPat";
import { ensureUserPatScaffold } from "@/lib/userPat";
import { ensureVendorProductModule } from "@/lib/vendorPat";

async function main() {
  const [vendorModule, firmModules, firmProductModule] = await Promise.all([
    ensureVendorProductModule(),
    ensureFirmAlignmentSystem(),
    ensureFirmProductModule(),
  ]);

  await ensureUserPatScaffold();
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
  console.log(`Local review users seeded: ${localReviewSeed.seeded ? localReviewSeed.userEmails.length : 0}`);
  console.log(`Local review seed reason: ${localReviewSeed.reason}`);
  console.log("Production bootstrap users seeded: 0");
  console.log("Production bootstrap users are only created by the explicit seed:bootstrap-users path.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("PAT runtime seed failed");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
