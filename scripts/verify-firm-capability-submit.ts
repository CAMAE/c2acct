import "dotenv/config";
import { randomUUID } from "node:crypto";
import { CompanyType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { normalizeQuestionRuntime, type NormalizedAnswer } from "@/lib/assessmentRuntime";
import {
  COMPANY_CAPABILITY_SCORE_VERSION,
  computeCapabilityScores,
  getAssessmentScoreScale,
} from "@/lib/capabilityScoring";
import { writeCompanyCapabilityScores } from "@/lib/companyCapabilityScoreWrites";
import { computeScore } from "@/lib/scoring";
import { runWithPrisma } from "./_shared/prismaScript";

const moduleKey = process.env.MODULE_KEY || "firm_alignment_operating_model_v1";
const companyId = process.env.COMPANY_ID || process.env.AAE_COMPANY_ID;
const VALIDATION_COMPANY_NAME = "PAT Validation Company";

function getQuestionScale(meta: Prisma.JsonValue | null | undefined) {
  const slider =
    meta && typeof meta === "object" && !Array.isArray(meta) && "slider" in meta
      ? meta.slider
      : null;
  if (
    slider &&
    typeof slider === "object" &&
    !Array.isArray(slider) &&
    typeof slider.min === "number" &&
    typeof slider.max === "number" &&
    Number.isFinite(slider.min) &&
    Number.isFinite(slider.max)
  ) {
    return { min: slider.min, max: slider.max };
  }

  return { min: 1, max: 5 };
}

function computeRawScorePercent(
  questions: Array<{ id: string; meta: Prisma.JsonValue | null }>,
  answers: Record<string, unknown>
) {
  const numericValues = questions
    .map((question) => {
      const answer = answers[question.id];
      return typeof answer === "number" && Number.isFinite(answer) ? { question, answer } : null;
    })
    .filter((entry): entry is { question: { id: string; meta: Prisma.JsonValue | null }; answer: number } => Boolean(entry));

  if (numericValues.length === 0) {
    return 0;
  }

  const weightedAverage =
    numericValues.reduce((total, entry) => total + entry.answer, 0) / numericValues.length;
  const scale = getQuestionScale(numericValues[0].question.meta);
  const denominator = scale.max - scale.min;
  return denominator <= 0
    ? 0
    : Math.round(((weightedAverage - scale.min) / denominator) * 100);
}

async function main() {
  await runWithPrisma(async (prisma) => {
    const company =
      (companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null) ||
      (await prisma.company.findFirst({ where: { name: VALIDATION_COMPANY_NAME } })) ||
      (await prisma.company.findFirst()) ||
      (await prisma.company.create({
        data: {
          id: randomUUID(),
          name: VALIDATION_COMPANY_NAME,
          type: CompanyType.FIRM,
          updatedAt: new Date(),
        },
      }));
    if (!company) {
      throw new Error("No company available for verification.");
    }

    const surveyModule = await prisma.surveyModule.findUnique({
      where: { key: moduleKey },
      select: {
        id: true,
        key: true,
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
              select: { nodeId: true },
            },
          },
        },
      },
    });
    if (!surveyModule) {
      throw new Error(`Module ${moduleKey} not found.`);
    }

    const runtimeQuestions = surveyModule.SurveyQuestion.map((question) =>
      normalizeQuestionRuntime(question)
    );
    const answers: Record<string, NormalizedAnswer> = Object.fromEntries(
      runtimeQuestions.map((question) => [question.id, 5])
    );
    const numericAnswers = Object.fromEntries(
      runtimeQuestions.map((question) => [question.id, 5])
    );
    const scoreScale = getAssessmentScoreScale(runtimeQuestions);
    const score = computeScore({
      answers: numericAnswers,
      scaleMin: scoreScale.min,
      scaleMax: scoreScale.max,
    });

    const submission = await prisma.surveySubmission.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        moduleId: surveyModule.id,
        version: 1,
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
      select: {
        id: true,
        score: true,
        answers: true,
        createdAt: true,
      },
    });

    const answerRecord =
      submission.answers && typeof submission.answers === "object" && !Array.isArray(submission.answers)
        ? (submission.answers as Record<string, unknown>)
        : {};
    const recomputedScore = computeRawScorePercent(surveyModule.SurveyQuestion, answerRecord);
    if (submission.score !== recomputedScore) {
      throw new Error(
        `Raw score mismatch for ${surveyModule.key}: persisted=${submission.score}, recomputed=${recomputedScore}`
      );
    }

    const expectedNodeIds = [
      ...new Set(
        surveyModule.SurveyQuestion.flatMap((question) =>
          question.SurveyQuestionCapability.map((mapping) => mapping.nodeId)
        )
      ),
    ];
    if (expectedNodeIds.length === 0) {
      throw new Error(`Module ${surveyModule.key} has no question capability mappings.`);
    }

    const capabilityScoring = computeCapabilityScores({
      questions: runtimeQuestions,
      answers,
      mappings: surveyModule.SurveyQuestion.flatMap((question) =>
        question.SurveyQuestionCapability.map((mapping) => ({
          questionId: question.id,
          questionKey: question.key,
          nodeId: mapping.nodeId,
          weight: 1,
        }))
      ),
    });

    await writeCompanyCapabilityScores(prisma, {
      companyId: company.id,
      scores: capabilityScoring.scores,
      scoreVersion: COMPANY_CAPABILITY_SCORE_VERSION,
    });

    const capabilityScores = await prisma.companyCapabilityScore.findMany({
      where: {
        companyId: company.id,
        nodeId: { in: expectedNodeIds },
        scoreVersion: COMPANY_CAPABILITY_SCORE_VERSION,
      },
      select: { nodeId: true, score: true, computedAt: true },
      orderBy: { nodeId: "asc" },
    });

    if (capabilityScores.length === 0) {
      throw new Error(`No CompanyCapabilityScore rows found for module ${surveyModule.key}.`);
    }

    console.log("firm_capability_submit_ok=", {
      companyId: company.id,
      moduleKey: surveyModule.key,
      submissionId: submission.id,
      rawScore: submission.score,
      recomputedRawScore: recomputedScore,
      capabilityScoreCount: capabilityScores.length,
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
