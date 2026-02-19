const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const module = await prisma.surveyModule.findFirst({
    where: { key: "firm_alignment_v1" },
    select: { id: true, key: true }
  });

  console.log("Module:", module);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
