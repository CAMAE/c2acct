import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function ensureNode(key, title, scope="FIRM") {
  const existing = await prisma.capabilityNode.findUnique({ where: { key }, select: { id: true } });
  if (existing) return existing.id;

  const id = randomUUID();
  await prisma.capabilityNode.create({
    data: {
      id,
      key,
      title,
      scope,
      level: "TIER1",
      weight: 1.0,
      active: true,
      updatedAt: new Date(),
    },
  });
  return id;
}

async function main() {
  const plan = [
    { moduleKey: "automation_v1", nodeKey: "cap_automation_core", title: "Automation Core" },
    { moduleKey: "profitability_v1", nodeKey: "cap_profitability_core", title: "Profitability Core" },
    { moduleKey: "alignment_core_v1", nodeKey: "cap_alignment_core", title: "Alignment Core" },
    { moduleKey: "fmi_v1", nodeKey: "cap_fmi_inputs", title: "FMI Inputs" },
  ];

  for (const p of plan) {
    await ensureNode(p.nodeKey, p.title);
  }

  console.log(JSON.stringify({ ok: true, createdOrEnsured: plan.map(p=>p.nodeKey) }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
