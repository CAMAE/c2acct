import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const COMPANY_ID = process.env.AAE_COMPANY_ID || "company_1772308981198_117981";
const MODULE_KEY = process.env.AAE_MODULE_KEY || null;

async function fetchWithTimeout(url, init, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const module = MODULE_KEY
    ? await prisma.surveyModule.findUnique({
        where: { key: MODULE_KEY },
        select: {
          id: true,
          key: true,
          SurveyQuestion: {
            select: { key: true },
            orderBy: { order: "asc" },
          },
        },
      })
    : await prisma.surveyModule.findFirst({
        where: { active: true },
        select: {
          id: true,
          key: true,
          SurveyQuestion: {
            select: { key: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      });

  if (!module) {
    throw new Error("No survey module found. Set AAE_MODULE_KEY to a valid module key.");
  }

  if (module.SurveyQuestion.length === 0) {
    throw new Error(`Module ${module.key} has no questions.`);
  }

  const answers = Object.fromEntries(module.SurveyQuestion.map((q) => [q.key, 5]));

  const submitRes = await fetchWithTimeout(`${BASE_URL}/api/survey/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      companyId: COMPANY_ID,
      moduleKey: module.key,
      answers,
    }),
  });

  const submitJson = await submitRes.json();
  console.log("submit", { status: submitRes.status, body: submitJson });

  const scores = await prisma.companyCapabilityScore.findMany({
    where: { companyId: COMPANY_ID, scoreVersion: 1 },
    select: { nodeId: true, score: true, scoreVersion: true, computedAt: true },
    orderBy: [{ computedAt: "desc" }, { nodeId: "asc" }],
  });

  console.log("capabilityScores", scores);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
