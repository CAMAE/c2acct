require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

(async () => {
  const moduleKey = (process.env.MODULE_KEY || "firm_alignment_v1").trim();
  const companyId = (process.env.COMPANY_ID || "").trim();

  const mod = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
    select: { id: true, key: true, version: true, scope: true }
  });
  if (!mod) throw new Error(`Module not found for key=${moduleKey}`);

  if (!companyId) {
    throw new Error("COMPANY_ID is required.");
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, slug: true, type: true },
  });

  if (!company) {
    throw new Error(`COMPANY_ID not found: ${companyId}`);
  }

  const targetProductIdRaw = process.env.TARGET_PRODUCT_ID;
  const targetProductId = typeof targetProductIdRaw === "string" ? targetProductIdRaw.trim() : "";

  if (mod.scope === "PRODUCT") {
    if (!targetProductId) {
      throw new Error("TARGET_PRODUCT_ID is required when MODULE_KEY resolves to a PRODUCT-scoped module.");
    }

    const product = await prisma.product.findUnique({
      where: { id: targetProductId },
      select: { id: true, companyId: true },
    });

    if (!product) {
      throw new Error(`TARGET_PRODUCT_ID not found: ${targetProductId}`);
    }

    if (product.companyId !== company.id) {
      throw new Error(`TARGET_PRODUCT_ID company mismatch: product.companyId=${product.companyId}, company.id=${company.id}`);
    }
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: { moduleId: mod.id },
    orderBy: { order: "asc" },
    select: { id: true }
  });
  if (!questions.length) throw new Error(`No questions found for module ${moduleKey}`);

  const answers = {};
  for (const q of questions) answers[q.id] = 3;

  const submission = await prisma.surveySubmission.create({
    data: {
      id: randomUUID(),
      moduleId: mod.id,
      companyId: company.id,
      productId: mod.scope === "PRODUCT" ? targetProductId : null,
      version: mod.version ?? 1,
      answers,
      score: 50,
      scoreVersion: 1,
      weightedAvg: 3,
      answeredCount: questions.length,
      scaleMin: 1,
      scaleMax: 5,
      totalWeight: questions.length,
      signalIntegrityScore: 1,
      integrityFlags: [],
    },
    select: {
      id: true,
      companyId: true,
      moduleId: true,
      score: true,
      createdAt: true,
    }
  });

  console.log("TEST_SUBMISSION_OK", {
    ...submission,
    moduleKey: mod.key,
    moduleScope: mod.scope,
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      type: company.type,
    },
    targetProductId: mod.scope === "PRODUCT" ? targetProductId : null,
  });
})()
  .catch((e) => {
    console.error("TEST_SUBMISSION_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
