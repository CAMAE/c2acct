const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.surveySubmission.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      scaleMin: true,
      scaleMax: true,
      totalWeight: true,
      answeredCount: true,
      score: true,
      weightedAvg: true,
    },
  });
  console.log(rows);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
