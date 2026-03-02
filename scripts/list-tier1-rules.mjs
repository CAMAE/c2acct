import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rules = await prisma.insightCapabilityRule.findMany({
    where: { required: true, Insight: { tier: 1 } },
    select: {
      nodeId: true,
      minScore: true,
      required: true,
      Insight: { select: { key: true, tier: true } },
      CapabilityNode: { select: { key: true, title: true } },
    },
    orderBy: [{ nodeId: "asc" }],
  });

  console.log(JSON.stringify(rules, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
