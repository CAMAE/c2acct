require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const m = await p.surveyModule.findUnique({ where: { key: "firm_alignment_v1" }, select: { id: true } });
  if (!m) throw new Error("Module firm_alignment_v1 not found");
  const n = await p.surveyQuestion.count({ where: { moduleId: m.id } });
  console.log("question_count=", n);
  await p.$disconnect();
})().catch(async (e) => { console.error(e); try { await p.$disconnect(); } catch {} process.exit(1); });
