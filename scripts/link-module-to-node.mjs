import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const moduleKey = process.argv[2];
  const nodeKey = process.argv[3];
  const weight = Number(process.argv[4] ?? "1");

  if (!moduleKey || !nodeKey) {
    throw new Error("Usage: node scripts/link-module-to-node.mjs <moduleKey> <nodeKey> [weight]");
  }

  const mod = await prisma.surveyModule.findUnique({ where: { key: moduleKey }, select: { id: true, key: true } });
  if (!mod) throw new Error(`Module not found: ${moduleKey}`);

  const node = await prisma.capabilityNode.findUnique({ where: { key: nodeKey }, select: { id: true, key: true } });
  if (!node) throw new Error(`CapabilityNode not found: ${nodeKey}`);

  const qs = await prisma.surveyQuestion.findMany({
    where: { moduleId: mod.id },
    orderBy: { order: "asc" },
    select: { id: true, key: true },
  });
  if (qs.length === 0) throw new Error(`No questions for module: ${moduleKey}`);

  let created = 0, updated = 0;
  for (const q of qs) {
    const existing = await prisma.surveyQuestionCapability.findFirst({
      where: { questionId: q.id, nodeId: node.id },
      select: { id: true },
    });

    if (!existing) {
      await prisma.surveyQuestionCapability.create({
        data: { id: randomUUID(), questionId: q.id, nodeId: node.id, weight },
      });
      created++;
    } else {
      await prisma.surveyQuestionCapability.update({ where: { id: existing.id }, data: { weight } });
      updated++;
    }
  }

  console.log(JSON.stringify({ moduleKey, nodeKey, questionCount: qs.length, created, updated }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
