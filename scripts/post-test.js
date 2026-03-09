require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

(async () => {
  const moduleKey = process.env.MODULE_KEY || "firm_alignment_v1";

  const mod = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
    select: { id: true, key: true }
  });
  if (!mod) throw new Error(`Module not found for key=${moduleKey}`);

  const questions = await prisma.surveyQuestion.findMany({
    where: { moduleId: mod.id },
    orderBy: { order: "asc" },
    select: { id: true }
  });
  if (!questions.length) throw new Error(`No questions found for module ${moduleKey}`);

  const answers = {};
  for (const q of questions) answers[q.id] = 3;

  console.log(JSON.stringify({
    moduleKey: mod.key,
    answers
  }, null, 2));
})()
  .catch((e) => {
    console.error("POST_TEST_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
