import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const MODULE_KEY = "vendor_product_fit_v1";
const PRODUCT_BADGE_ID = "3a53d563-c4f9-45dc-9aa5-a8f8c018c006";
const PRODUCT_BADGE_NAME = "Product GTM Unlocked";
const PRODUCT_BADGE_MIN_SCORE = 1;

const PRODUCT_INSIGHTS = [
  {
    key: "product_positioning_clarity",
    title: "Product Positioning Clarity",
    body: "Clarity of value proposition across the highest-priority accounting workflows.",
  },
  {
    key: "product_workflow_fit_snapshot",
    title: "Workflow Fit Snapshot",
    body: "How naturally this product maps into day-to-day operator behavior.",
  },
  {
    key: "product_integration_readiness",
    title: "Integration Readiness",
    body: "Readiness signal for integrations needed to reduce context switching and manual effort.",
  },
  {
    key: "product_onboarding_friction_estimate",
    title: "Onboarding Friction Estimate",
    body: "Likely onboarding blockers from contract signature to first delivered value.",
  },
  {
    key: "product_support_confidence_signal",
    title: "Support Confidence Signal",
    body: "Confidence trend for support quality, response consistency, and escalation reliability.",
  },
  {
    key: "product_gtm_readiness_summary",
    title: "Product GTM Readiness Summary",
    body: "Summary of market-facing readiness to scale onboarding and customer activation.",
  },
  {
    key: "product_improvement_priorities",
    title: "Product Improvement Priorities",
    body: "Highest-impact product improvements to increase workflow fit and retention.",
  },
];

async function main() {
  const now = new Date();

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: MODULE_KEY },
    select: { id: true, key: true, scope: true, active: true },
  });

  if (!moduleRecord) {
    throw new Error(`SurveyModule not found for key=${MODULE_KEY}`);
  }

  if (moduleRecord.scope !== "PRODUCT") {
    throw new Error(`SurveyModule scope must be PRODUCT, got scope=${moduleRecord.scope}`);
  }

  const badge = await prisma.badge.upsert({
    where: { id: PRODUCT_BADGE_ID },
    update: {
      name: PRODUCT_BADGE_NAME,
      updatedAt: now,
    },
    create: {
      id: PRODUCT_BADGE_ID,
      name: PRODUCT_BADGE_NAME,
      updatedAt: now,
    },
    select: { id: true, name: true },
  });

  const badgeRule = await prisma.badgeRule.upsert({
    where: {
      badgeId_moduleId: {
        badgeId: badge.id,
        moduleId: moduleRecord.id,
      },
    },
    update: {
      required: true,
      minScore: PRODUCT_BADGE_MIN_SCORE,
    },
    create: {
      id: randomUUID(),
      badgeId: badge.id,
      moduleId: moduleRecord.id,
      required: true,
      minScore: PRODUCT_BADGE_MIN_SCORE,
    },
    select: { id: true, badgeId: true, moduleId: true, minScore: true, required: true },
  });

  for (const insight of PRODUCT_INSIGHTS) {
    const existing = await prisma.insight.findFirst({ where: { key: insight.key }, select: { id: true } });

    if (existing) {
      await prisma.insight.update({
        where: { id: existing.id },
        data: {
          title: insight.title,
          body: insight.body,
          tier: 2,
          active: true,
          updatedAt: now,
        },
      });
    } else {
      await prisma.insight.create({
        data: {
          id: randomUUID(),
          key: insight.key,
          title: insight.title,
          body: insight.body,
          tier: 2,
          active: true,
          updatedAt: now,
        },
      });
    }
  }

  const insightCount = await prisma.insight.count({ where: { key: { in: PRODUCT_INSIGHTS.map((x) => x.key) }, active: true } });

  console.log(
    JSON.stringify(
      {
        ok: true,
        module: moduleRecord,
        badge,
        badgeRule,
        insightCount,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error("SEED_VENDOR_PRODUCT_OUTPUTS_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
