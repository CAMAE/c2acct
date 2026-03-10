require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { spawnSync } = require("child_process");

const prisma = new PrismaClient();

const MODULE_KEY = (process.env.MODULE_KEY || "vendor_product_fit_v1").trim();
const COMPANY_ID = (process.env.COMPANY_ID || "").trim();
const TARGET_PRODUCT_ID = (process.env.TARGET_PRODUCT_ID || "").trim();
const PRODUCT_BADGE_ID = "3a53d563-c4f9-45dc-9aa5-a8f8c018c006";
const PRODUCT_INSIGHT_KEYS = [
  "product_positioning_clarity",
  "product_workflow_fit_snapshot",
  "product_integration_readiness",
  "product_onboarding_friction_estimate",
  "product_support_confidence_signal",
  "product_gtm_readiness_summary",
  "product_improvement_priorities",
];

(async () => {
  if (!COMPANY_ID) throw new Error("COMPANY_ID is required.");
  if (!TARGET_PRODUCT_ID) throw new Error("TARGET_PRODUCT_ID is required.");

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: MODULE_KEY },
    select: { id: true, key: true, scope: true, active: true },
  });
  if (!moduleRecord) throw new Error(`Module not found for key=${MODULE_KEY}`);
  if (moduleRecord.scope !== "PRODUCT") {
    throw new Error(`Module scope must be PRODUCT, got ${moduleRecord.scope}`);
  }

  const product = await prisma.product.findUnique({
    where: { id: TARGET_PRODUCT_ID },
    select: { id: true, companyId: true, slug: true },
  });
  if (!product) throw new Error(`Product not found for TARGET_PRODUCT_ID=${TARGET_PRODUCT_ID}`);
  if (product.companyId !== COMPANY_ID) {
    throw new Error(`Product-company mismatch: product.companyId=${product.companyId}, companyId=${COMPANY_ID}`);
  }

  const badgeRule = await prisma.badgeRule.findFirst({
    where: { badgeId: PRODUCT_BADGE_ID, moduleId: moduleRecord.id, required: true },
    select: { id: true, minScore: true },
  });
  if (!badgeRule) {
    throw new Error("Product badge rule missing for vendor_product_fit_v1.");
  }

  const insightCount = await prisma.insight.count({
    where: { key: { in: PRODUCT_INSIGHT_KEYS }, active: true },
  });
  if (insightCount !== PRODUCT_INSIGHT_KEYS.length) {
    throw new Error(`Product insights incomplete: expected ${PRODUCT_INSIGHT_KEYS.length}, found ${insightCount}`);
  }

  const beforeBadge = await prisma.companyBadge.findFirst({
    where: {
      companyId: COMPANY_ID,
      productId: TARGET_PRODUCT_ID,
      badgeId: PRODUCT_BADGE_ID,
      moduleId: moduleRecord.id,
    },
    orderBy: { awardedAt: "desc" },
    select: { id: true, awardedAt: true },
  });

  const submitRun = spawnSync(process.execPath, ["scripts/test-submission.js"], {
    env: {
      ...process.env,
      MODULE_KEY,
      COMPANY_ID,
      TARGET_PRODUCT_ID,
      AWARD_BADGES: "true",
    },
    stdio: "inherit",
  });

  if (submitRun.status !== 0) {
    throw new Error(`test-submission.js failed with exit code ${submitRun.status}`);
  }

  const latestBadge = await prisma.companyBadge.findFirst({
    where: {
      companyId: COMPANY_ID,
      productId: TARGET_PRODUCT_ID,
      badgeId: PRODUCT_BADGE_ID,
      moduleId: moduleRecord.id,
    },
    orderBy: { awardedAt: "desc" },
    select: { id: true, awardedAt: true, badgeId: true, moduleId: true, companyId: true, productId: true },
  });

  if (!latestBadge) {
    throw new Error("Expected product-scoped badge award row was not found.");
  }

  const latestSubmission = await prisma.surveySubmission.findFirst({
    where: { companyId: COMPANY_ID, productId: TARGET_PRODUCT_ID, moduleId: moduleRecord.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, productId: true, companyId: true, moduleId: true },
  });

  if (!latestSubmission || !latestSubmission.productId) {
    throw new Error("Expected product-scoped submission with non-null productId was not found.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        module: moduleRecord,
        badgeRule,
        insightCount,
        beforeBadge,
        latestBadge,
        latestSubmission,
        expectedResultsUrl: `/results?productId=${TARGET_PRODUCT_ID}`,
        expectedOutputsUrl: `/outputs?productId=${TARGET_PRODUCT_ID}`,
      },
      null,
      2
    )
  );
})()
  .catch((e) => {
    console.error("VERIFY_VENDOR_PRODUCT_OUTPUTS_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
