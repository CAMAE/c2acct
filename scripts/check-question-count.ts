import "dotenv/config";
import { runWithPrisma } from "./_shared/prismaScript";

const moduleKeys = [
  "firm_alignment_operating_model_v1",
  "firm_alignment_automation_ai_v1",
  "firm_alignment_data_flow_v1",
  "firm_alignment_governance_v1",
  "firm_alignment_strategy_v1",
];
const expectedQuestionCount = 20;

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  await runWithPrisma(async (prisma) => {
    const surveyModules = await prisma.surveyModule.findMany({
      where: { key: { in: moduleKeys } },
      select: { id: true, key: true, title: true },
      orderBy: { key: "asc" },
    });

    if (surveyModules.length !== moduleKeys.length) {
      const foundKeys = new Set(surveyModules.map((surveyModule) => surveyModule.key));
      const missingKeys = moduleKeys.filter((key) => !foundKeys.has(key));
      fail(`Missing canonical PAT modules: ${missingKeys.join(", ")}`);
    }

    const counts = await Promise.all(
      surveyModules.map(async (surveyModule) => ({
        key: surveyModule.key,
        title: surveyModule.title,
        questionCount: await prisma.surveyQuestion.count({ where: { moduleId: surveyModule.id } }),
      }))
    );

    const invalidModules = counts.filter((surveyModule) => surveyModule.questionCount !== expectedQuestionCount);
    if (invalidModules.length > 0) {
      fail(
        invalidModules
          .map((surveyModule) => `${surveyModule.key} has ${surveyModule.questionCount} questions`)
          .join("; ")
      );
    }

    const totalQuestionCount = counts.reduce(
      (total, surveyModule) => total + surveyModule.questionCount,
      0
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          moduleCount: counts.length,
          expectedQuestionCount,
          totalQuestionCount,
          counts,
        },
        null,
        2
      )
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
