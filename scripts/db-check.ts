import "dotenv/config";
import { runWithPrisma } from "./_shared/prismaScript";

const moduleKeys = [
  "firm_alignment_operating_model_v1",
  "firm_alignment_automation_ai_v1",
  "firm_alignment_data_flow_v1",
  "firm_alignment_governance_v1",
  "firm_alignment_strategy_v1",
];

async function main() {
  await runWithPrisma(async (prisma) => {
    const surveyModules = await prisma.surveyModule.findMany({
      where: { key: { in: moduleKeys } },
      select: { id: true, key: true, version: true },
      orderBy: { key: "asc" },
    });

    const summary = await Promise.all(
      surveyModules.map(async (surveyModule) => {
        const questionCount = await prisma.surveyQuestion.count({
          where: { moduleId: surveyModule.id },
        });
        const submissionCount = await prisma.surveySubmission.count({
          where: { moduleId: surveyModule.id },
        });
        const lastSubmission = await prisma.surveySubmission.findFirst({
          where: { moduleId: surveyModule.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, score: true, companyId: true, createdAt: true },
        });

        return {
          surveyModule,
          questionCount,
          submissionCount,
          lastSubmission,
        };
      })
    );

    console.log("firm_module_summary=", summary);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
