import prisma from "@/lib/prisma";
import {
  ensureProductionBootstrapUsers,
  getConfiguredProductionBootstrapEmails,
  getLegacyLocalReviewCleanupGuidance,
} from "@/lib/auth/localReview";

async function main() {
  const bootstrapSeed = await ensureProductionBootstrapUsers(prisma);

  console.log("Bootstrap user seed complete");
  console.log(`Production bootstrap users seeded: ${bootstrapSeed.seeded ? bootstrapSeed.userEmails.length : 0}`);
  console.log(`Production bootstrap reason: ${bootstrapSeed.reason}`);
  console.log(`Configured bootstrap emails: ${getConfiguredProductionBootstrapEmails().map((entry) => `${entry.key}:${entry.email}`).join(", ") || "none"}`);
  console.log("Legacy local review cleanup guidance:");
  for (const step of getLegacyLocalReviewCleanupGuidance()) {
    console.log(`- ${step}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Bootstrap user seed failed");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
