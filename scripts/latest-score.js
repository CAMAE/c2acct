const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

(async () => {
  const latest = await prisma.surveySubmission.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, score: true, companyId: true, moduleId: true },
  });

  if (!latest) {
    console.log("No submissions found.");
    return;
  }

  console.log("latest_id:", latest.id);
  console.log("latest_createdAt:", latest.createdAt);
  console.log("latest_score:", latest.score);
})()
  .catch((e) => {
    console.error("LATEST_SCORE_ERROR:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
