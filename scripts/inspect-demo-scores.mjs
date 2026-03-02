import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.companyCapabilityScore.findMany({
    where: { companyId: "demo_company" },
    orderBy: [{ nodeId: "asc" }],
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
