import "dotenv/config";
import { QuestionInputType } from "@prisma/client";
import { runWithPrisma } from "./_shared/prismaScript";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";

async function main() {
  await runWithPrisma(async (prisma) => {
    const modules = await prisma.surveyModule.findMany({
      where: {
        key: {
          in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key),
        },
      },
      orderBy: { key: "asc" },
      select: {
        key: true,
        ModuleCapability: {
          select: { nodeId: true },
        },
        SurveyQuestion: {
          orderBy: { order: "asc" },
          select: {
            key: true,
            inputType: true,
            SurveyQuestionCapability: {
              select: { nodeId: true },
            },
          },
        },
      },
    });

    if (modules.length !== FIRM_MODULE_DEFINITIONS.length) {
      throw new Error(
        `Expected ${FIRM_MODULE_DEFINITIONS.length} firm PAT modules, found ${modules.length}.`
      );
    }

    const modulesMissingCapabilities = modules
      .filter((surveyModule) => surveyModule.ModuleCapability.length === 0)
      .map((surveyModule) => surveyModule.key);

    if (modulesMissingCapabilities.length > 0) {
      throw new Error(
        `Modules missing ModuleCapability rows: ${modulesMissingCapabilities.join(", ")}`
      );
    }

    const questionsMissingCapabilities = modules.flatMap((surveyModule) =>
      surveyModule.SurveyQuestion.filter(
        (question) =>
          question.inputType === QuestionInputType.SLIDER &&
          question.SurveyQuestionCapability.length === 0
      ).map((question) => `${surveyModule.key}:${question.key}`)
    );

    if (questionsMissingCapabilities.length > 0) {
      throw new Error(
        `Questions missing SurveyQuestionCapability rows: ${questionsMissingCapabilities.join(", ")}`
      );
    }

    console.log(
      JSON.stringify(
        modules.map((surveyModule) => ({
          moduleKey: surveyModule.key,
          moduleCapabilityCount: surveyModule.ModuleCapability.length,
          questionCount: surveyModule.SurveyQuestion.length,
          scoredQuestionCount: surveyModule.SurveyQuestion.filter(
            (question) => question.inputType === QuestionInputType.SLIDER
          ).length,
          openEndedQuestionCount: surveyModule.SurveyQuestion.filter(
            (question) => question.inputType === QuestionInputType.TEXT
          ).length,
          questionCapabilityCount: surveyModule.SurveyQuestion.reduce(
            (total, question) => total + question.SurveyQuestionCapability.length,
            0
          ),
        })),
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
