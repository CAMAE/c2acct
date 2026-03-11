import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MODULE_KEY = (process.env.EXTERNAL_REVIEW_MODULE_KEY || "product_workflow_fit_review_v1").trim();
const SUBJECT_COMPANY_SLUG = (process.env.EXTERNAL_REVIEW_SUBJECT_COMPANY_SLUG || "demo-subject-vendor-co").trim();
const SUBJECT_PRODUCT_SLUG = (process.env.EXTERNAL_REVIEW_SUBJECT_PRODUCT_SLUG || "demo-subject-vendor-product").trim();

const ROLLUP_VERSION = 1;

function evaluateEligibility(rollup, minReviewCount) {
  if (!rollup) {
    return {
      eligible: false,
      reason: "ROLLUP_NOT_FOUND",
    };
  }

  if (rollup.reviewCount < minReviewCount) {
    return {
      eligible: false,
      reason: "INSUFFICIENT_SAMPLE",
    };
  }

  return {
    eligible: true,
    reason: "ELIGIBLE",
  };
}

async function main() {
  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: MODULE_KEY },
    select: { id: true, key: true, axis: true, scope: true, active: true },
  });

  if (!moduleRecord) {
    throw new Error(`Module not found for key=${MODULE_KEY}`);
  }

  const subjectCompany = await prisma.company.findFirst({
    where: { slug: SUBJECT_COMPANY_SLUG },
    select: { id: true, slug: true, name: true, type: true },
  });

  if (!subjectCompany) {
    throw new Error(`Subject company not found for slug=${SUBJECT_COMPANY_SLUG}`);
  }

  const subjectProduct = await prisma.product.findFirst({
    where: {
      companyId: subjectCompany.id,
      slug: SUBJECT_PRODUCT_SLUG,
    },
    select: { id: true, slug: true, name: true, companyId: true },
  });

  if (!subjectProduct) {
    throw new Error(`Subject product not found for slug=${SUBJECT_PRODUCT_SLUG}`);
  }

  const rollup = await prisma.externalObservedSignalRollup.findFirst({
    where: {
      moduleId: moduleRecord.id,
      subjectCompanyId: subjectCompany.id,
      subjectProductId: subjectProduct.id,
      rollupVersion: ROLLUP_VERSION,
    },
    select: {
      id: true,
      reviewCount: true,
      scoreAvg: true,
      weightedAvgAvg: true,
      signalIntegrityAvg: true,
      latestReviewAt: true,
      rollupVersion: true,
    },
  });

  const eligibilityAt3 = evaluateEligibility(rollup, 3);
  const eligibilityAt5 = evaluateEligibility(rollup, 5);

  console.log(
    JSON.stringify(
      {
        ok: true,
        module: moduleRecord,
        subjectCompany,
        subjectProduct,
        rollup,
        eligibility: {
          minReviewCount3: eligibilityAt3,
          minReviewCount5: eligibilityAt5,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error("CHECK_EXTERNAL_OBSERVED_ELIGIBILITY_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
