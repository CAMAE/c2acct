require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const module = await p.surveyModule.findUnique({
    where: { key: "firm_alignment_v1" },
    include: { questions: true }
  });
  if (!module) throw new Error("Module not found");

  // Prefer explicit COMPANY_ID (set it after you create a Company in Prisma Studio)
  const companyId = process.env.COMPANY_ID || process.env.AAE_COMPANY_ID;
  const company =
    (companyId ? await p.company.findUnique({ where: { id: companyId } }) : null) ||
    (await p.company.findFirst());

  if (!company) {
    // If Company has required fields beyond "name", create it in Prisma Studio and set COMPANY_ID
    throw new Error("No Company found. Create one in Prisma Studio, then set COMPANY_ID env var.");
  }

  const answers = {};
  for (const q of module.questions) answers[q.id] = 3;

  const submission = await p.surveySubmission.create({
    data: {
      module: { connect: { id: module.id } },
      company: { connect: { id: company.id } },
      version: module.version,
      answers,
      score: 3
    }
  });

  console.log("created_submission_id=", submission.id);
  console.log("used_company_id=", company.id);
  await p.$disconnect();
})().catch(async (e) => { console.error(e); try { await p.$disconnect(); } catch {} process.exit(1); });
