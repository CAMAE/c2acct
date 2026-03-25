import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const TIER1_BADGE_ID = "tier1-alignment-unlocked";
const TIER1_BADGE_NAME = "Tier 1 Alignment Unlocked";
const moduleKey = "firm_alignment_v1";
const tier1Insights = [
  {
    key: "tier1_alignment_baseline",
    title: "Alignment Baseline",
    body: "Where the firm is now, in practical operating terms.",
  },
  {
    key: "tier1_operating_system_map",
    title: "Operating System Map",
    body: "How work moves through the firm today and where operating friction concentrates.",
  },
  {
    key: "tier1_risk_control_posture",
    title: "Risk & Control Posture",
    body: "The control posture implied by the current operating discipline and score pattern.",
  },
  {
    key: "tier1_implementation_roadmap",
    title: "Implementation Roadmap",
    body: "The next practical steps to move from baseline alignment to institutional repeatability.",
  },
];

async function main() {
  const mod = await prisma.surveyModule.findFirst({ where: { key: moduleKey }, select: { id: true, key: true } });
  if (!mod) throw new Error(`Missing SurveyModule key=${moduleKey}. Run scripts/seed-firm-alignment.mjs first.`);
  const now = new Date();

  const badge = await prisma.badge.upsert({
    where: { id: TIER1_BADGE_ID },
    update: {
      name: TIER1_BADGE_NAME,
      updatedAt: now,
    },
    create: {
      id: TIER1_BADGE_ID,
      name: TIER1_BADGE_NAME,
      updatedAt: now,
    },
  });

  await prisma.badgeRule.upsert({
    where: {
      badgeId_moduleId: {
        badgeId: badge.id,
        moduleId: mod.id,
      },
    },
    update: {
      minScore: 0,
      required: true,
    },
    create: {
      id: randomUUID(),
      badgeId: badge.id,
      moduleId: mod.id,
      minScore: 0,
      required: true,
    },
  });

  for (const insight of tier1Insights) {
    const persistedInsight = await prisma.insight.upsert({
      where: { key: insight.key },
      update: {
        title: insight.title,
        body: insight.body,
        tier: 1,
        active: true,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: insight.key,
        title: insight.title,
        body: insight.body,
        tier: 1,
        active: true,
        updatedAt: now,
      },
    });

    await prisma.insightUnlockRule.upsert({
      where: {
        insightId_badgeId: {
          insightId: persistedInsight.id,
          badgeId: badge.id,
        },
      },
      update: {
        required: true,
      },
      create: {
        id: randomUUID(),
        insightId: persistedInsight.id,
        badgeId: badge.id,
        required: true,
      },
    });
  }

  console.log("OK SEEDED TIER1", { moduleKey: mod.key, moduleId: mod.id, badgeName: badge.name });
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
