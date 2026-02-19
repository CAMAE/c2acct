require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const n = await p.surveySubmission.count();
  console.log("submission_count=", n);
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await p.$disconnect(); } catch {}
  process.exit(1);
});
