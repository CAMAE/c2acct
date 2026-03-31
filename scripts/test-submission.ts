import "dotenv/config";
import { randomUUID } from "node:crypto";
import { runWithPrisma } from "./_shared/prismaScript";

const moduleKey = "firm_alignment_operating_model_v1";

async function main() {
  await runWithPrisma(async (prisma) => {
    const surveyModule = await prisma.surveyModule.findUnique({
      where: { key: moduleKey },
      include: { SurveyQuestion: true },
    });
    if (!surveyModule) {
      throw new Error(`Module ${moduleKey} not found`);
    }

    const requestedCompanyId = process.env.COMPANY_ID || process.env.AAE_COMPANY_ID;
    const company =
      (requestedCompanyId
        ? await prisma.company.findUnique({ where: { id: requestedCompanyId } })
        : null) ?? (await prisma.company.findFirst());

    if (!company) {
      throw new Error("No Company found. Create one in Prisma Studio, then set COMPANY_ID env var.");
    }

    const answers = Object.fromEntries(
      surveyModule.SurveyQuestion.map((question) => [question.id, 3])
    );

    const submission = await prisma.surveySubmission.create({
      data: {
        id: randomUUID(),
        moduleId: surveyModule.id,
        companyId: company.id,
        version: surveyModule.version,
        answers,
        score: 3,
      },
    });

    console.log("created_submission_id=", submission.id);
    console.log("used_module_key=", surveyModule.key);
    console.log("used_company_id=", company.id);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
