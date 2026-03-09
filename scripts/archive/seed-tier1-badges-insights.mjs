import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const moduleKey = "firm_alignment_v1";
  const mod = await prisma.surveyModule.findFirst({ where: { key: moduleKey }, select: { id: true, key: true } });
  if (!mod) throw new Error(`Missing SurveyModule key=${moduleKey}. Run scripts/seed-firm-alignment.mjs first.`);

  // ---- Badge (schema: id,name,createdAt,updatedAt) ----
  const badgeName = "Tier 1 Unlocked";

  let badge = await prisma.badge.findFirst({ where: { name: badgeName } });
  if (!badge) {
    badge = await prisma.badge.create({
      data: { id: randomUUID(), name: badgeName },
    });
  }

  // ---- BadgeRule: tie badge to module ----
  const rule = await prisma.badgeRule.findFirst({
    where: { badgeId: badge.id, moduleId: mod.id },
    select: { id: true },
  });

  if (!rule) {
    await prisma.badgeRule.create({
      data: {
        id: randomUUID(),
        badgeId: badge.id,
        moduleId: mod.id,
        // OPTIONAL: require completion or score threshold; leave null for now
        minScore: null,
        // required defaults true; omit unless your schema requires explicit
      },
    });
  }

  // ---- Insight + Unlock rules ----
  // We do NOT guess fields. We'll read prisma schema at runtime by attempting create with a minimal set:
  // id,key,title,content (if present), updatedAt (if required). If your schema differs, this will throw with exact missing fields.
  const tier1 = [
    { key: "tier1_alignment_baseline", title: "Alignment Baseline", content: "Where the firm is now, in practical terms." },
    { key: "tier1_operating_system_map", title: "Operating System Map", content: "A map of how work actually flows today." },
    { key: "tier1_risk_control_posture", title: "Risk & Control Posture", content: "Top risk/control gaps implied by your answers." },
    { key: "tier1_implementation_roadmap", title: "Implementation Roadmap", content: "A phased plan to increase alignment." },
  ];

  for (const it of tier1) {
    let insight = await prisma.insight.findFirst({ where: { key: it.key } }).catch(() => null);

    if (!insight) {
      // try common minimal create
      insight = await prisma.insight.create({
        data: {
          id: randomUUID(),
          key: it.key,
          title: it.title,
          content: it.content,
          // if your schema requires updatedAt but doesn't have @updatedAt, Prisma will throw and we’ll adjust next.
        },
      });
    } else {
      // try common update
      insight = await prisma.insight.update({
        where: { id: insight.id },
        data: { title: it.title, content: it.content },
      });
    }

    // unlock rule: gate insight by badge
    const existingUnlock = await prisma.insightUnlockRule.findFirst({
      where: { insightId: insight.id, badgeId: badge.id },
      select: { id: true },
    }).catch(() => null);

    if (!existingUnlock) {
      await prisma.insightUnlockRule.create({
        data: {
          id: randomUUID(),
          insightId: insight.id,
          badgeId: badge.id,
        },
      });
    }
  }

  console.log("OK SEEDED TIER1", { moduleKey: mod.key, moduleId: mod.id, badgeName });
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
