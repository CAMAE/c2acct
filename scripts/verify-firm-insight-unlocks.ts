import "dotenv/config";
import { randomUUID } from "node:crypto";
import { CompanyType, QuestionInputType } from "@prisma/client";
import { normalizeQuestionRuntime, type NormalizedAnswer } from "@/lib/assessmentRuntime";
import { computeScore } from "@/lib/scoring";
import {
  COMPANY_CAPABILITY_SCORE_VERSION,
  computeCapabilityScores,
  getAssessmentScoreScale,
} from "@/lib/capabilityScoring";
import { writeCompanyCapabilityScores } from "@/lib/companyCapabilityScoreWrites";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
} from "@/lib/firmPat";
import { runWithPrisma } from "./_shared/prismaScript";

const VALIDATION_COMPANY_NAME = "PAT Validation Company";

async function ensureValidationCompany(prisma: Parameters<typeof runWithPrisma>[0] extends (prisma: infer T) => Promise<unknown> ? T : never) {
  const existingCompany = await prisma.company.findFirst({
    where: { name: VALIDATION_COMPANY_NAME },
    select: { id: true, name: true },
  });

  if (existingCompany) {
    return existingCompany;
  }

  return prisma.company.create({
    data: {
      id: randomUUID(),
      name: VALIDATION_COMPANY_NAME,
      type: CompanyType.FIRM,
      updatedAt: new Date(),
    },
    select: { id: true, name: true },
  });
}

async function main() {
  await runWithPrisma(async (prisma) => {
    const company = await ensureValidationCompany(prisma);
    const seededModules = await prisma.surveyModule.findMany({
      where: {
        key: { in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key) },
      },
      orderBy: { key: "asc" },
      select: {
        id: true,
        key: true,
        version: true,
        SurveyQuestion: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            key: true,
            prompt: true,
            inputType: true,
            weight: true,
            order: true,
            required: true,
            meta: true,
            SurveyQuestionCapability: {
              select: { nodeId: true, weight: true },
            },
          },
        },
        BadgeRule: {
          where: { required: true },
          select: { badgeId: true },
        },
      },
    });

    if (seededModules.length !== FIRM_MODULE_DEFINITIONS.length) {
      throw new Error(
        `Expected ${FIRM_MODULE_DEFINITIONS.length} firm modules, found ${seededModules.length}.`
      );
    }

    for (const seededModule of seededModules) {
      const runtimeQuestions = seededModule.SurveyQuestion.map((question) =>
        normalizeQuestionRuntime(question)
      );
      const answers: Record<string, NormalizedAnswer> = Object.fromEntries(
        runtimeQuestions.map((question) => [
          question.id,
          question.inputType === QuestionInputType.TEXT
            ? `Validation response for ${question.key}`
            : 5,
        ])
      );
      const numericAnswers = Object.fromEntries(
        runtimeQuestions
          .filter((question) => question.inputType !== QuestionInputType.TEXT)
          .map((question) => [question.id, 5])
      );
      const scoreScale = getAssessmentScoreScale(runtimeQuestions);
      const score = computeScore({
        answers: numericAnswers,
        scaleMin: scoreScale.min,
        scaleMax: scoreScale.max,
      });

      await prisma.surveySubmission.create({
        data: {
          id: randomUUID(),
          companyId: company.id,
          moduleId: seededModule.id,
          version: seededModule.version,
          answers,
          score: score.rawScorePct,
          weightedAvg: score.rawWeightedAvg,
          scoreVersion: 1,
          scaleMin: score.scaleMin,
          scaleMax: score.scaleMax,
          totalWeight: score.totalWeight,
          answeredCount: score.answeredCount,
          signalIntegrityScore: 1,
        },
      });

      const capabilityScoring = computeCapabilityScores({
        questions: runtimeQuestions,
        answers,
        mappings: seededModule.SurveyQuestion.flatMap((question) =>
          question.SurveyQuestionCapability.map((mapping) => ({
            questionId: question.id,
            questionKey: question.key,
            nodeId: mapping.nodeId,
            weight: mapping.weight,
          }))
        ),
      });

      await writeCompanyCapabilityScores(prisma, {
        companyId: company.id,
        scores: capabilityScoring.scores,
        scoreVersion: COMPANY_CAPABILITY_SCORE_VERSION,
      });

      for (const badgeRule of seededModule.BadgeRule) {
        await prisma.companyBadge.upsert({
          where: {
            companyId_badgeId_moduleId: {
              companyId: company.id,
              badgeId: badgeRule.badgeId,
              moduleId: seededModule.id,
            },
          },
          update: {},
          create: {
            id: randomUUID(),
            companyId: company.id,
            badgeId: badgeRule.badgeId,
            moduleId: seededModule.id,
          },
        });
      }
    }

    const unlockedInsights = await evaluateUnlocked({ companyId: company.id });
    const unlockedKeys = new Set(unlockedInsights.map((insight) => insight.key));
    const missingInsights = FIRM_TIER1_INSIGHT_DEFINITIONS
      .map((insight) => insight.key)
      .filter((key) => !unlockedKeys.has(key));

    if (missingInsights.length > 0) {
      throw new Error(`Firm insight unlock validation failed for: ${missingInsights.join(", ")}`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          companyId: company.id,
          unlockedInsightKeys: Array.from(unlockedKeys).sort(),
        },
        null,
        2
      )
    );
  });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
