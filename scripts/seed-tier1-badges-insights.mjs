import * as client from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new client.PrismaClient();

function pickEnumValue(enumObj, preferredKeys = []) {
  if (!enumObj || typeof enumObj !== "object") return null;
  for (const k of preferredKeys) if (k in enumObj) return enumObj[k];
  const vals = Object.values(enumObj);
  return vals.length ? vals[0] : null;
}

async function main() {
  const now = new Date();

  const moduleKey = "firm_alignment_v1";
  const mod = await prisma.surveyModule.findFirst({ where: { key: moduleKey }, select: { id: true, key: true } });
  if (!mod) throw new Error(`Missing SurveyModule key=${moduleKey}. Run scripts/seed-firm-alignment.mjs first.`);

  // ---- Badge ----
  const badgeKey = "badge_tier1_alignment_unlocked";
  const badgeName = "Tier 1 Unlocked"; // REQUIRED by your schema
  const badgeTitle = "Tier 1 Unlocked";
  const badgeDesc = "Unlocked Tier 1 outputs for firm alignment.";

  // Optional enum (if present in client)
  const badgeScope =
    pickEnumValue(client.BadgeScope, ["FIRM", "COMPANY", "ORG", "VENDOR", "INDIVIDUAL"]) ??
    undefined;

  let badge = await prisma.badge.findFirst({ where: { key: badgeKey } });

  if (!badge) {
    const createData = {
      id: randomUUID(),
      key: badgeKey,
      name: badgeName,
      title: badgeTitle,
      description: badgeDesc,
      updatedAt: now,
      ...(badgeScope ? { scope: badgeScope } : {}),
    };

    badge = await prisma.badge.create({ data: createData });
  } else {
    const updateData = {
      name: badgeName,
      title: badgeTitle,
      description: badgeDesc,
      updatedAt: now,
      ...(badgeScope ? { scope: badgeScope } : {}),
    };

    badge = await prisma.badge.update({ where: { id: badge.id }, data: updateData });
  }

  // ---- BadgeRule (gate badge by module completion) ----
  const existingRule = await prisma.badgeRule.findFirst({
    where: { badgeId: badge.id, moduleId: mod.id },
    select: { id: true },
  });

  if (!existingRule) {
    // Try minimal create; if schema requires extra fields, Prisma will tell us (we'll fail loudly)
    await prisma.badgeRule.create({
      data: {
        id: randomUUID(),
        badgeId: badge.id,
        moduleId: mod.id,
        updatedAt: now,
      },
    });
  } else {
    await prisma.badgeRule.update({ where: { id: existingRule.id }, data: { updatedAt: now } });
  }

  // ---- Tier1 Insights + Unlock rules ----
  const tier1 = [
    { key: "tier1_alignment_baseline", title: "Alignment Baseline", content: "Where the firm is now, in practical terms." },
    { key: "tier1_operating_system_map", title: "Operating System Map", content: "A map of how work actually flows today." },
    { key: "tier1_risk_control_posture", title: "Risk & Control Posture", content: "Top risk/control gaps implied by your answers." },
    { key: "tier1_implementation_roadmap", title: "Implementation Roadmap", content: "A phased plan to increase alignment." },
  ];

  for (const it of tier1) {
    let insight = await prisma.insight.findFirst({ where: { key: it.key } }).catch(() => null);

    if (!insight) {
      insight = await prisma.insight.create({
        data: {
          id: randomUUID(),
          key: it.key,
          title: it.title,
          content: it.content,
          updatedAt: now,
        },
      });
    } else {
      insight = await prisma.insight.update({
        where: { id: insight.id },
        data: { title: it.title, content: it.content, updatedAt: now },
      });
    }

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
          updatedAt: now,
        },
      });
    } else {
      await prisma.insightUnlockRule.update({ where: { id: existingUnlock.id }, data: { updatedAt: now } });
    }
  }

  console.log("OK SEEDED TIER1", { moduleKey: mod.key, moduleId: mod.id, badgeKey });
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
