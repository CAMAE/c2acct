import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rows = await prisma.company.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  for (const r of rows) {
    console.log(`${r.id}\t${r.name ?? ""}`);
  }
} finally {
  await prisma.$disconnect();
}