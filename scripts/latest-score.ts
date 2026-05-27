import { runWithPrisma } from "./_shared/prismaScript";

async function main() {
  await runWithPrisma(async (prisma) => {
    const latestSubmission = await prisma.surveySubmission.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        score: true,
        companyId: true,
        moduleId: true,
      },
    });

    if (!latestSubmission) {
      console.log("No submissions found.");
      return;
    }

    console.log("latest_id:", latestSubmission.id);
    console.log("latest_createdAt:", latestSubmission.createdAt);
    console.log("latest_score:", latestSubmission.score);
  });
}

main().catch((error) => {
  console.error("LATEST_SCORE_ERROR:", error);
  process.exit(1);
});
