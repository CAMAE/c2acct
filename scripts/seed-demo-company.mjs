import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const name = "Demo Company";
  const existing = await prisma.company.findFirst({ where: { name }, select: { id: true, name: true } });
  if (existing) {
    console.log("OK COMPANY", existing);
    return;
  }

  const created = await prisma.company.create({
    data: {
      id: randomUUID(),
      name,
      updatedAt: new Date(),
    },
    select: { id: true, name: true },
  });

  console.log("OK COMPANY", created);
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
