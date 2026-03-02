import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const companyId = process.argv[2] ?? "demo_company";
  const keys = ["cap_alignment_basics","cap_alignment_advanced"];

  const nodes = await prisma.capabilityNode.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  });

  const nodeIds = nodes.map(n => n.id);
  const del = await prisma.companyCapabilityScore.deleteMany({
    where: { companyId, scoreVersion: 1, nodeId: { in: nodeIds } },
  });

  console.log(JSON.stringify({ companyId, deleted: del.count, nodes }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
