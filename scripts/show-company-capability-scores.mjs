import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const companyId = process.argv[2] ?? "demo_company";
  const rows = await prisma.companyCapabilityScore.findMany({
    where: { companyId, scoreVersion: 1 },
    orderBy: [{ computedAt: "desc" }],
    take: 20,
    select: {
      nodeId: true,
      score: true,
      computedAt: true,
      CapabilityNode: { select: { key: true, title: true } },
    },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
