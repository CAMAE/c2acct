import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

function readJson(p) {
  const abs = path.resolve(p);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

async function ensureNode(def) {
  const existing = await prisma.capabilityNode.findUnique({ where: { key: def.key }, select: { id: true } });
  if (existing) return existing.id;

  const id = randomUUID();
  await prisma.capabilityNode.create({
    data: {
      id,
      key: def.key,
      title: def.title,
      description: def.description ?? null,
      scope: def.scope ?? "FIRM",
      level: def.level ?? "TIER1",
      weight: def.weight ?? 1.0,
      active: def.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  return id;
}

async function upsertModuleCapability(moduleId, nodeId, weight) {
  const existing = await prisma.moduleCapability.findFirst({
    where: { moduleId, nodeId },
    select: { id: true }
  });

  if (!existing) {
    await prisma.moduleCapability.create({
      data: { id: randomUUID(), moduleId, nodeId, weight: Number(weight ?? 1), createdAt: new Date() }
    });
    return { created: true };
  } else {
    await prisma.moduleCapability.update({
      where: { id: existing.id },
      data: { weight: Number(weight ?? 1) }
    });
    return { updated: true };
  }
}

async function upsertQuestionCapability(questionId, nodeId, weight) {
  const existing = await prisma.surveyQuestionCapability.findFirst({
    where: { questionId, nodeId },
    select: { id: true }
  });

  if (!existing) {
    await prisma.surveyQuestionCapability.create({
      data: { id: randomUUID(), questionId, nodeId, weight: Number(weight ?? 1), createdAt: new Date() }
    });
    return { created: true };
  } else {
    await prisma.surveyQuestionCapability.update({
      where: { id: existing.id },
      data: { weight: Number(weight ?? 1) }
    });
    return { updated: true };
  }
}

async function main() {
  const cfgPath = process.argv[2] ?? "./scripts/config/capability-links.json";
  const cfg = readJson(cfgPath);

  const out = { ok: true, cfgPath, modules: [] };

  for (const m of cfg.modules ?? []) {
    const mod = await prisma.surveyModule.findUnique({ where: { key: m.moduleKey }, select: { id: true, key: true, title: true } });
    if (!mod) throw new Error(`Module not found: ${m.moduleKey}`);

    const nodeKeyToId = {};

    // ensure nodes
    for (const nd of (m.nodeDefs ?? [])) {
      const id = await ensureNode(nd);
      nodeKeyToId[nd.key] = id;
    }

    // module node weights
    let mcCreated = 0, mcUpdated = 0;
    for (const w of (m.moduleNodeWeights ?? [])) {
      const nodeId = nodeKeyToId[w.nodeKey] ?? (await prisma.capabilityNode.findUnique({ where: { key: w.nodeKey }, select: { id: true } }))?.id;
      if (!nodeId) throw new Error(`CapabilityNode not found for ModuleCapability: ${w.nodeKey}`);
      const r = await upsertModuleCapability(mod.id, nodeId, w.weight);
      if (r.created) mcCreated++; else mcUpdated++;
    }

    // questions
    const qs = await prisma.surveyQuestion.findMany({
      where: { moduleId: mod.id },
      orderBy: { order: "asc" },
      select: { id: true, key: true }
    });

    let qcCreated = 0, qcUpdated = 0;

    if (m.allQuestionsToNode?.nodeKey) {
      const nodeKey = m.allQuestionsToNode.nodeKey;
      const qWeight = Number(m.allQuestionsToNode.weight ?? 1);

      const nodeId = nodeKeyToId[nodeKey] ?? (await prisma.capabilityNode.findUnique({ where: { key: nodeKey }, select: { id: true } }))?.id;
      if (!nodeId) throw new Error(`CapabilityNode not found for allQuestionsToNode: ${nodeKey}`);

      for (const q of qs) {
        const r = await upsertQuestionCapability(q.id, nodeId, qWeight);
        if (r.created) qcCreated++; else qcUpdated++;
      }
    }

    for (const link of (m.questionNodeLinks ?? [])) {
      const q = qs.find(x => x.key === link.questionKey);
      if (!q) throw new Error(`Question not found: module=${m.moduleKey} key=${link.questionKey}`);

      const nodeId = nodeKeyToId[link.nodeKey] ?? (await prisma.capabilityNode.findUnique({ where: { key: link.nodeKey }, select: { id: true } }))?.id;
      if (!nodeId) throw new Error(`CapabilityNode not found for question link: ${link.nodeKey}`);

      const r = await upsertQuestionCapability(q.id, nodeId, link.weight);
      if (r.created) qcCreated++; else qcUpdated++;
    }

    out.modules.push({
      moduleKey: mod.key,
      moduleTitle: mod.title,
      nodesEnsured: Object.keys(nodeKeyToId),
      moduleCapability: { created: mcCreated, updated: mcUpdated },
      questionCapability: { created: qcCreated, updated: qcUpdated, questionCount: qs.length }
    });
  }

  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
