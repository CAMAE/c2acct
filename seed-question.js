const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const m = await p.surveyModule.findFirst({
    where: { key: "firm_alignment_v1" },
    select: { id: true, key: true }
  });
  if (!m) throw new Error("SurveyModule firm_alignment_v1 not found");

  const q = await p.surveyQuestion.create({
    data: {
      moduleId: m.id,
      key: "tech_stack_maturity",
      prompt: "Describe your current tech stack and how mature it feels.",
      inputType: "TEXT",
      weight: 1,
      order: 1
    }
  });

  console.log({ module: m, created: q });
})()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
