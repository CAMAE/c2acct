require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

(async () => {
  const moduleKey = process.env.MODULE_KEY || "firm_alignment_v1";

  const mod = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
    select: { id: true, key: true, version: true }
  });
  if (!mod) throw new Error(`Module not found for key=${moduleKey}`);

  const companyId = process.env.COMPANY_ID || process.env.AAE_COMPANY_ID;
  const company =
    (companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null) ||
    (await prisma.company.findFirst({ select: { id: true, name: true } }));

  if (!company) {
    throw new Error("No Company found. Create one first or set COMPANY_ID.");
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

  console.log("TEST_SUBMISSION_OK", submission);
})()
  .catch((e) => {
    console.error("TEST_SUBMISSION_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
