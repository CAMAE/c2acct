import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function ensureDemoCompany() {
  const now = new Date();
  const id = "demo_company";
  await prisma.company.upsert({
    where: { id },
    update: { name: "Demo Company", type: "FIRM", updatedAt: now },
    create: { id, name: "Demo Company", type: "FIRM", createdAt: now, updatedAt: now },
  });
}

async function main() {
  const companyId = "demo_company";
  await ensureDemoCompany();

  const tier1 = await prisma.insightCapabilityRule.findMany({
    where: { required: true, Insight: { tier: 1 } },
    select: { nodeId: true, minScore: true },
  });

  for (const r of tier1) {
    await prisma.companyCapabilityScore.upsert({
      where: {
        companyId_nodeId_scoreVersion: { companyId, nodeId: r.nodeId, scoreVersion: 1 },
      },
      update: { score: 0.95, computedAt: new Date() },
      create: {
        id: randomUUID(),
        companyId,
        nodeId: r.nodeId,
        score: 0.95,
        scoreVersion: 1,
        computedAt: new Date(),
      },
    });
  }

  console.log(`seeded ${tier1.length} tier1 node scores for ${companyId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
