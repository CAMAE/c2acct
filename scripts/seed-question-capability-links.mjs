import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const moduleKey = process.argv[2] ?? "firm_alignment_v1";

  const mod = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
    select: { id: true, key: true },
  });
  if (!mod) throw new Error(`Module not found: ${moduleKey}`);

  const nodes = await prisma.capabilityNode.findMany({
    where: { key: { in: ["cap_alignment_basics","cap_alignment_advanced"] } },
    select: { id: true, key: true },
  });

  const basics = nodes.find(n => n.key === "cap_alignment_basics")?.id;
  const adv = nodes.find(n => n.key === "cap_alignment_advanced")?.id;
  if (!basics || !adv) throw new Error(`Missing CapabilityNode(s). Found: ${JSON.stringify(nodes)}`);

  const qs = await prisma.surveyQuestion.findMany({
    where: { moduleId: mod.id },
    orderBy: { order: "asc" },
    select: { id: true, key: true, order: true },
  });
  if (qs.length === 0) throw new Error(`No questions for module ${moduleKey}`);

  // Map: first 3 questions -> basics, last 2 -> advanced (adjust later as needed)
  const mappings = qs.map((q, idx) => {
    const nodeId = idx < 3 ? basics : adv;
    const weight = 1.0;
    return { questionId: q.id, nodeId, weight, qKey: q.key };
  });

  // Upsert each (questionId,nodeId) link; Prisma doesn't support compound upsert directly without unique input helper,
  // so we do find->create/update.
  let created = 0, updated = 0;
  for (const m of mappings) {
    const existing = await prisma.surveyQuestionCapability.findFirst({
      where: { questionId: m.questionId, nodeId: m.nodeId },
      select: { id: true },
    });

    if (!existing) {
      await prisma.surveyQuestionCapability.create({
        data: { id: randomUUID(), questionId: m.questionId, nodeId: m.nodeId, weight: m.weight },
      });
      created++;
    } else {
      await prisma.surveyQuestionCapability.update({
        where: { id: existing.id },
        data: { weight: m.weight },
      });
      updated++;
    }
  }

  console.log(JSON.stringify({ moduleKey, questionCount: qs.length, created, updated, mappings }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
