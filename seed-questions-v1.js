require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const moduleKey = "firm_alignment_v1";

  const mod = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
    select: { id: true, key: true },
  });

  if (!mod) throw new Error(`SurveyModule not found for key=${moduleKey}`);

  const INPUT = process.env.SEED_INPUTTYPE || "SCALE_1_5";

  const questions = [
    {
      moduleId: mod.id,
      key: "vision_clarity",
      prompt: "How clearly defined is your firm’s 12–24 month vision?",
      inputType: INPUT,
      weight: 1,
      order: 1,
    },
    {
      moduleId: mod.id,
      key: "process_consistency",
      prompt: "How consistently do your core processes get followed across the firm?",
      inputType: INPUT,
      weight: 1,
      order: 2,
    },
    {
      moduleId: mod.id,
      key: "role_accountability",
      prompt: "How clear are roles and accountability (who owns what outcomes)?",
      inputType: INPUT,
      weight: 1,
      order: 3,
    },
  ];

  for (const q of questions) {
    await prisma.surveyQuestion.upsert({
      where: { moduleId_key: { moduleId: q.moduleId, key: q.key } },
      update: { prompt: q.prompt, inputType: q.inputType, weight: q.weight, order: q.order },
      create: q,
    });
  }

  console.log(`Seeded/updated ${questions.length} questions for module ${mod.key} with inputType=${INPUT}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
