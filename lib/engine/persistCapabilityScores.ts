import { randomUUID } from "crypto";
import type { Prisma, UnlockEvidenceSourceType } from "@prisma/client";
import { getAssessmentModuleCatalogEntry } from "@/lib/assessment-module-catalog";
import { computeScore } from "@/lib/scoring";
import prisma from "@/lib/prisma";
import { buildTargetScopeKey } from "@/lib/targetScopeKey";

type DbExecutor = Prisma.TransactionClient;

type PersistSelfSubmissionCapabilityScoresInput = {
  tx: DbExecutor;
  surveySubmissionId: string;
  moduleId: string;
  moduleKey: string;
  companyId: string;
  productId: string | null;
  answers: Record<string, number>;
  scoreVersion: number;
  scaleMin: number;
  scaleMax: number;
};

type PersistExternalObservedCapabilityScoresInput = {
  companyId: string;
  productId: string | null;
  moduleId: string;
  moduleKey: string;
  scoreVersion: number;
  externalObservedSignalRollupId: string;
  scoreAvg: number | null;
  weightedAvgAvg: number | null;
};

type PersistCapabilityScoresFromQuestionMappingsInput = {
  tx: DbExecutor;
  companyId: string;
  productId: string | null;
  moduleId: string;
  scoreVersion: number;
  sourceType: UnlockEvidenceSourceType;
  surveySubmissionId?: string | null;
  externalObservedSignalRollupId?: string | null;
  answers: Record<string, number>;
  scaleMin: number;
  scaleMax: number;
};

function shouldPersistCapabilityScores(moduleKey: string): boolean {
  const entry = getAssessmentModuleCatalogEntry(moduleKey);
  return Boolean(
    entry &&
      entry.activationState === "LIVE" &&
      entry.reportingRole === "PRIMARY_REPORTING" &&
      entry.axis === "SELF"
  );
}

function shouldPersistExternalObservedCapabilityScores(moduleKey: string): boolean {
  const entry = getAssessmentModuleCatalogEntry(moduleKey);
  return Boolean(
    entry &&
      entry.axis === "EXTERNAL_REVIEW" &&
      entry.scope === "PRODUCT" &&
      entry.intelligenceProfileKey === "product_intelligence"
  );
}

async function persistCapabilityScoresFromQuestionMappings(
  input: PersistCapabilityScoresFromQuestionMappingsInput
) {
  const {
    tx,
    companyId,
    productId,
    moduleId,
    scoreVersion,
    sourceType,
    surveySubmissionId = null,
    externalObservedSignalRollupId = null,
    answers,
    scaleMin,
    scaleMax,
  } = input;
  const targetScopeKey = buildTargetScopeKey({ companyId, productId });

  const questions = await tx.surveyQuestion.findMany({
    where: { moduleId },
    select: {
      id: true,
      SurveyQuestionCapability: {
        select: {
          nodeId: true,
          weight: true,
        },
      },
    },
  });

  const answersByNodeId = new Map<string, Record<string, number>>();

  for (const question of questions) {
    const answerValue = answers[question.id];
    if (typeof answerValue !== "number" || !Number.isFinite(answerValue)) {
      continue;
    }

    for (const mapping of question.SurveyQuestionCapability) {
      const entry = answersByNodeId.get(mapping.nodeId) ?? {};
      entry[question.id] = answerValue;
      answersByNodeId.set(mapping.nodeId, entry);
    }
  }

  for (const [nodeId, nodeAnswers] of answersByNodeId.entries()) {
    const scoring = computeScore({
      answers: nodeAnswers,
      scaleMin,
      scaleMax,
    });

    await tx.companyCapabilityScore.upsert({
      where: {
        targetScopeKey_moduleId_nodeId_scoreVersion_sourceType: {
          targetScopeKey,
          moduleId,
          nodeId,
          scoreVersion,
          sourceType,
        },
      },
      update: {
        companyId,
        productId,
        score: scoring.score,
        surveySubmissionId,
        externalObservedSignalRollupId,
        computedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        companyId,
        productId,
        targetScopeKey,
        moduleId,
        nodeId,
        score: scoring.score,
        scoreVersion,
        sourceType,
        surveySubmissionId,
        externalObservedSignalRollupId,
      },
    });
  }
}

export async function persistSelfSubmissionCapabilityScores(
  input: PersistSelfSubmissionCapabilityScoresInput
) {
  if (!shouldPersistCapabilityScores(input.moduleKey)) {
    return { persisted: false, reason: "MODULE_NOT_ENABLED" as const };
  }

  await persistCapabilityScoresFromQuestionMappings({
    tx: input.tx,
    companyId: input.companyId,
    productId: input.productId,
    moduleId: input.moduleId,
    scoreVersion: input.scoreVersion,
    sourceType: "SELF_SUBMISSION",
    surveySubmissionId: input.surveySubmissionId,
    answers: input.answers,
    scaleMin: input.scaleMin,
    scaleMax: input.scaleMax,
  });

  return { persisted: true as const };
}

export async function persistExternalObservedCapabilityScores(
  input: PersistExternalObservedCapabilityScoresInput
) {
  if (!shouldPersistExternalObservedCapabilityScores(input.moduleKey)) {
    return { persisted: false, reason: "MODULE_NOT_ENABLED" as const };
  }

  const { scoreAvg, weightedAvgAvg } = input;
  const targetScopeKey = buildTargetScopeKey({
    companyId: input.companyId,
    productId: input.productId,
  });
  const score =
    typeof scoreAvg === "number" && Number.isFinite(scoreAvg)
      ? scoreAvg
      : typeof weightedAvgAvg === "number" && Number.isFinite(weightedAvgAvg)
        ? computeScore({
            answers: { observed_rollup: weightedAvgAvg },
            scaleMin: 1,
            scaleMax: 5,
          }).score
        : null;

  if (score === null) {
    return { persisted: false, reason: "ROLLUP_SCORE_MISSING" as const };
  }

  const moduleCapabilities = await prisma.moduleCapability.findMany({
    where: { moduleId: input.moduleId },
    select: { nodeId: true },
  });

  for (const mapping of moduleCapabilities) {
    await prisma.companyCapabilityScore.upsert({
      where: {
        targetScopeKey_moduleId_nodeId_scoreVersion_sourceType: {
          targetScopeKey,
          moduleId: input.moduleId,
          nodeId: mapping.nodeId,
          scoreVersion: input.scoreVersion,
          sourceType: "EXTERNAL_REVIEW_ROLLUP",
        },
      },
      update: {
        companyId: input.companyId,
        productId: input.productId,
        score,
        surveySubmissionId: null,
        externalObservedSignalRollupId: input.externalObservedSignalRollupId,
        computedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        companyId: input.companyId,
        productId: input.productId,
        targetScopeKey,
        moduleId: input.moduleId,
        nodeId: mapping.nodeId,
        score,
        scoreVersion: input.scoreVersion,
        sourceType: "EXTERNAL_REVIEW_ROLLUP",
        surveySubmissionId: null,
        externalObservedSignalRollupId: input.externalObservedSignalRollupId,
      },
    });
  }

  return { persisted: true as const };
}

export async function clearExternalObservedCapabilityScores(input: {
  companyId: string;
  productId: string | null;
  moduleId: string;
  scoreVersion: number;
}) {
  const targetScopeKey = buildTargetScopeKey({
    companyId: input.companyId,
    productId: input.productId,
  });

  await prisma.companyCapabilityScore.deleteMany({
    where: {
      targetScopeKey,
      moduleId: input.moduleId,
      scoreVersion: input.scoreVersion,
      sourceType: "EXTERNAL_REVIEW_ROLLUP",
    },
  });
}
