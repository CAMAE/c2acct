const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.surveySubmission.updateMany({
    data: { scaleMin: 0, scaleMax: 100, totalWeight: 0, answeredCount: 0 },
  });
  console.log(r);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
