import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const mods = await prisma.surveyModule.findMany({
    select: { id: true, key: true, title: true },
    orderBy: { key: "asc" },
  });
  console.log(JSON.stringify(mods, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
