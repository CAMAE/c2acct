import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const moduleKey = process.argv[2];
  const nodeKey = process.argv[3];
  const weight = Number(process.argv[4] ?? "1");

  if (!moduleKey || !nodeKey) {
    throw new Error("Usage: node scripts/link-modulecapability.mjs <moduleKey> <nodeKey> [weight]");
  }

  const mod = await prisma.surveyModule.findUnique({ where: { key: moduleKey }, select: { id: true, key: true } });
  if (!mod) throw new Error(`Module not found: ${moduleKey}`);

  const node = await prisma.capabilityNode.findUnique({ where: { key: nodeKey }, select: { id: true, key: true } });
  if (!node) throw new Error(`CapabilityNode not found: ${nodeKey}`);

  const existing = await prisma.moduleCapability.findFirst({
    where: { moduleId: mod.id, nodeId: node.id },
    select: { id: true },
  });

  if (!existing) {
    await prisma.moduleCapability.create({
      data: { id: randomUUID(), moduleId: mod.id, nodeId: node.id, weight },
    });
    console.log(JSON.stringify({ created: true, moduleKey, nodeKey, weight }, null, 2));
  } else {
    await prisma.moduleCapability.update({ where: { id: existing.id }, data: { weight } });
    console.log(JSON.stringify({ updated: true, moduleKey, nodeKey, weight }, null, 2));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
