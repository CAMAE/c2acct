require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const module = await p.surveyModule.findUnique({
    where: { key: "firm_alignment_v1" },
    select: { id: true, key: true, version: true }
  });

  const qCount = await p.surveyQuestion.count({ where: { moduleId: module.id } });
  const sCount = await p.surveySubmission.count({ where: { moduleId: module.id } });

  const last = await p.surveySubmission.findFirst({
    where: { moduleId: module.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, score: true, companyId: true, createdAt: true }
  });

  console.log("module=", module);
  console.log("question_count=", qCount);
  console.log("submission_count=", sCount);
  console.log("last_submission=", last);

  await p.$disconnect();
})().catch(async (e) => { console.error(e); try { await p.$disconnect(); } catch {} process.exit(1); });
