require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MODULE_KEY = (process.env.MODULE_KEY || "vendor_product_fit_v1").trim();
const COMPANY_ID = (process.env.COMPANY_ID || "").trim();
const TARGET_PRODUCT_ID = (process.env.TARGET_PRODUCT_ID || "").trim();

(async () => {
  if (!COMPANY_ID) {
    throw new Error("COMPANY_ID is required.");
  }
  if (!TARGET_PRODUCT_ID) {
    throw new Error("TARGET_PRODUCT_ID is required.");
  }

  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID },
    select: { id: true, slug: true, type: true },
  });
  if (!company) throw new Error(`Company not found for COMPANY_ID=${COMPANY_ID}`);

  const product = await prisma.product.findUnique({
    where: { id: TARGET_PRODUCT_ID },
    select: { id: true, slug: true, companyId: true },
  });
  if (!product) throw new Error(`Product not found for TARGET_PRODUCT_ID=${TARGET_PRODUCT_ID}`);
  if (product.companyId !== company.id) {
    throw new Error(`Product-company mismatch: product.companyId=${product.companyId}, company.id=${company.id}`);
  }

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: MODULE_KEY },
    select: { id: true, key: true, scope: true, version: true, active: true },
  });
  if (!moduleRecord) throw new Error(`SurveyModule not found for key=${MODULE_KEY}`);
  if (moduleRecord.scope !== "PRODUCT") {
    throw new Error(`SurveyModule must be PRODUCT scoped, got scope=${moduleRecord.scope}`);
  }

  const beforeLatest = await prisma.surveySubmission.findFirst({
    where: { companyId: company.id, productId: product.id, SurveyModule: { key: MODULE_KEY } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  const { spawnSync } = require("child_process");
  const submitRun = spawnSync(process.execPath, ["scripts/test-submission.js"], {
    env: {
      ...process.env,
      MODULE_KEY,
      COMPANY_ID: company.id,
      TARGET_PRODUCT_ID: product.id,
    },
    stdio: "inherit",
  });

  if (submitRun.status !== 0) {
    throw new Error(`test-submission.js failed with exit code ${submitRun.status}`);
  }

  const latestProductScoped = await prisma.surveySubmission.findFirst({
    where: { companyId: company.id, productId: product.id, SurveyModule: { key: MODULE_KEY } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      productId: true,
      companyId: true,
      SurveyModule: { select: { key: true, scope: true } },
    },
  });

  if (!latestProductScoped || !latestProductScoped.productId) {
    throw new Error("Latest product-scoped submission not found or productId is null.");
  }

  if (beforeLatest && latestProductScoped.id === beforeLatest.id) {
    throw new Error("No new product-scoped submission was created.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        module: moduleRecord,
        company,
        product,
        beforeLatest,
        latestProductScoped,
        expectedResultsUrl: `/results?productId=${product.id}`,
        expectedOutputsUrl: `/outputs?productId=${product.id}`,
      },
      null,
      2
    )
  );
})()
  .catch((e) => {
    console.error("VERIFY_PRODUCT_SUBMIT_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
