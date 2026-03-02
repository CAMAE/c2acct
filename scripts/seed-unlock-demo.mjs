import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const COMPANY_ID = process.env.AAE_COMPANY_ID || "company_1772308981198_117981";

async function main() {
  // 1) Upsert 2 capability nodes
  const nodeA = await prisma.capabilityNode.upsert({
    where: { key: "cap_alignment_basics" },
    update: { title: "Alignment Basics", scope: "FIRM", updatedAt: new Date() },
    create: {
      id: randomUUID(),
      key: "cap_alignment_basics",
      title: "Alignment Basics",
      scope: "FIRM",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const nodeB = await prisma.capabilityNode.upsert({
    where: { key: "cap_alignment_advanced" },
    update: { title: "Alignment Advanced", scope: "FIRM", updatedAt: new Date() },
    create: {
      id: randomUUID(),
      key: "cap_alignment_advanced",
      title: "Alignment Advanced",
      scope: "FIRM",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 2) Upsert 2 Tier-1 Insights
  const insight1 = await prisma.insight.upsert({
    where: { key: "insight_alignment_tier1_a" },
    update: { title: "Tier 1: Alignment Starter", body: "Unlocked when Alignment Basics >= 0.60", tier: 1, active: true, updatedAt: new Date() },
    create: {
      id: randomUUID(),
      key: "insight_alignment_tier1_a",
      title: "Tier 1: Alignment Starter",
      body: "Unlocked when Alignment Basics >= 0.60",
      tier: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const insight2 = await prisma.insight.upsert({
    where: { key: "insight_alignment_tier1_b" },
    update: { title: "Tier 1: Alignment Advanced", body: "Unlocked when Basics >= 0.60 AND Advanced >= 0.80", tier: 1, active: true, updatedAt: new Date() },
    create: {
      id: randomUUID(),
      key: "insight_alignment_tier1_b",
      title: "Tier 1: Alignment Advanced",
      body: "Unlocked when Basics >= 0.60 AND Advanced >= 0.80",
      tier: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 3) Upsert capability rules for each insight
  // Note: model is InsightCapabilityRule with @@unique([insightId, nodeId])
  await prisma.insightCapabilityRule.upsert({
    where: { insightId_nodeId: { insightId: insight1.id, nodeId: nodeA.id } },
    update: { minScore: 0.6, required: true, updatedAt: new Date() },
    create: {
      id: randomUUID(),
      insightId: insight1.id,
      nodeId: nodeA.id,
      minScore: 0.6,
      required: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.insightCapabilityRule.upsert({
    where: { insightId_nodeId: { insightId: insight2.id, nodeId: nodeA.id } },
    update: { minScore: 0.6, required: true, updatedAt: new Date() },
    create: {
      id: randomUUID(),
      insightId: insight2.id,
      nodeId: nodeA.id,
      minScore: 0.6,
      required: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.insightCapabilityRule.upsert({
    where: { insightId_nodeId: { insightId: insight2.id, nodeId: nodeB.id } },
    update: { minScore: 0.8, required: true, updatedAt: new Date() },
    create: {
      id: randomUUID(),
      insightId: insight2.id,
      nodeId: nodeB.id,
      minScore: 0.8,
      required: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 4) Seed company capability scores (scoreVersion: 1)
  // NOTE: adjust unique where if your model uses a different compound unique.
  // We'll do deleteMany + createMany to avoid guessing the unique constraint.
  await prisma.companyCapabilityScore.deleteMany({ where: { companyId: COMPANY_ID, scoreVersion: 1 } });

  await prisma.companyCapabilityScore.createMany({
    data: [
      { id: randomUUID(), companyId: COMPANY_ID, nodeId: nodeA.id, score: 0.65, scoreVersion: 1, computedAt: new Date() },
      { id: randomUUID(), companyId: COMPANY_ID, nodeId: nodeB.id, score: 0.70, scoreVersion: 1, computedAt: new Date() },
    ],
  });

  const counts = {
    nodes: await prisma.capabilityNode.count(),
    insights: await prisma.insight.count(),
    rules: await prisma.insightCapabilityRule.count(),
    scores: await prisma.companyCapabilityScore.count({ where: { companyId: COMPANY_ID } }),
  };

  console.log({ ok: true, companyId: COMPANY_ID, ...counts });
}

main()
  .then(() => prisma[String.fromCharCode(36) + "disconnect"]())
  .catch(async (e) => {
    console.error(e);
    await prisma[String.fromCharCode(36) + "disconnect"]();
    process.exit(1);
  });
