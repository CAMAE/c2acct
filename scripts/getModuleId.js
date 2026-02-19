require("dotenv").config({ path: require("path").join(process.cwd(), ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const module = await prisma.surveyModule.findFirst({
    where: { key: "firm_alignment_v1" },
    select: { id: true, key: true },
  });

  console.log("module:", module);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
