import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const tier1 = [
    { key: "tier1_alignment_baseline", title: "Alignment Baseline", body: "Where the firm is now, in practical terms." },
    { key: "tier1_operating_system_map", title: "Operating System Map", body: "A map of how work actually flows today." },
    { key: "tier1_risk_control_posture", title: "Risk & Control Posture", body: "Top risk/control gaps implied by your answers." },
    { key: "tier1_implementation_roadmap", title: "Implementation Roadmap", body: "A phased plan to increase alignment." },
  ];

  for (const it of tier1) {
    const existing = await prisma.insight.findFirst({ where: { key: it.key }, select: { id: true } });

    if (existing) {
      await prisma.insight.update({
        where: { id: existing.id },
        data: {
          title: it.title,
          body: it.body,
          tier: 1,
          active: true,
          updatedAt: now,
        },
      });
    } else {
      await prisma.insight.create({
        data: {
          id: randomUUID(),
          key: it.key,
          title: it.title,
          body: it.body,
          tier: 1,
          active: true,
          updatedAt: now,
        },
      });
    }
  }

  const count = await prisma.insight.count({ where: { tier: 1 } });
  console.log("OK SEEDED Tier1 insights", { count });
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
