import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const id = "demo_company";

  await prisma.company.upsert({
    where: { id },
    update: { name: "Demo Company", type: "FIRM", updatedAt: now },
    create: { id, name: "Demo Company", type: "FIRM", createdAt: now, updatedAt: now },
  });

  console.log("ensured demo_company");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
