import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { require as tsxRequire } from "tsx/cjs/api";

const prisma = new PrismaClient();

const MODULE_KEY = (process.env.EXTERNAL_REVIEW_MODULE_KEY || "product_workflow_fit_review_v1").trim();
const SUBJECT_COMPANY_SLUG = (process.env.EXTERNAL_REVIEW_SUBJECT_COMPANY_SLUG || "demo-subject-vendor-co").trim();
const SUBJECT_PRODUCT_SLUG = (process.env.EXTERNAL_REVIEW_SUBJECT_PRODUCT_SLUG || "demo-subject-vendor-product").trim();

const MIN_REVIEW_COUNT = 3;

function isEnabled(value) {
  if (!value) return false;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

async function main() {
  const { evaluateExternalObservedUnlock } = tsxRequire(
    "../lib/reviews/evaluateExternalObservedUnlock.ts",
    import.meta.url
  );

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: MODULE_KEY },
    select: { id: true, key: true, axis: true, active: true },
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

  const featureFlagEnabled = isEnabled(process.env.ENABLE_EXTERNAL_OBSERVED_SIGNALS);
  const baseInput = {
    moduleId: moduleRecord.id,
    subjectCompanyId: subjectCompany.id,
    subjectProductId: subjectProduct.id,
    minReviewCount: MIN_REVIEW_COUNT,
    featureFlagEnabled,
  };

  const unlockAt60 = await evaluateExternalObservedUnlock({
    ...baseInput,
    minScoreAvg: 60,
  });
  const unlockAt75 = await evaluateExternalObservedUnlock({
    ...baseInput,
    minScoreAvg: 75,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        module: moduleRecord,
        subjectCompany,
        subjectProduct,
        unlockAt60,
        unlockAt75,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error("CHECK_EXTERNAL_OBSERVED_UNLOCK_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
