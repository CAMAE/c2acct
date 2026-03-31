import "dotenv/config";
import { runWithPrisma } from "./_shared/prismaScript";

async function main() {
  await runWithPrisma(async (prisma) => {
    const submissionCount = await prisma.surveySubmission.count();
    console.log("submission_count=", submissionCount);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
