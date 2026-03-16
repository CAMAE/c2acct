import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import {
  clearExternalObservedCapabilityScores,
  persistExternalObservedCapabilityScores,
} from "@/lib/engine/persistCapabilityScores";
import { buildTargetScopeKey } from "@/lib/targetScopeKey";
import { buildTrustedExternalReviewWhere } from "@/lib/reviews/trustedExternalReview";

export type RecomputeObservedSignalRollupInput = {
  moduleId: string;
  subjectCompanyId: string;
  subjectProductId?: string | null;
};

const ROLLUP_VERSION = 1;
const EXTERNAL_REVIEW_SCORE_VERSION = 1;

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export async function recomputeObservedSignalRollup(input: RecomputeObservedSignalRollupInput) {
  const moduleId = typeof input.moduleId === "string" ? input.moduleId.trim() : "";
  const subjectCompanyId =
    typeof input.subjectCompanyId === "string" ? input.subjectCompanyId.trim() : "";
  const subjectProductId =
    typeof input.subjectProductId === "string" && input.subjectProductId.trim()
      ? input.subjectProductId.trim()
      : null;

  if (!moduleId) {
    throw new Error("moduleId is required");
  }

  if (!subjectCompanyId) {
    throw new Error("subjectCompanyId is required");
  }

  const targetScopeKey = buildTargetScopeKey({
    companyId: subjectCompanyId,
    productId: subjectProductId,
  });

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { id: moduleId },
    select: { id: true, key: true },
  });

  if (!moduleRecord) {
    throw new Error("SurveyModule not found");
  }

  const reviews = await prisma.externalReviewSubmission.findMany({
    where: {
      ...buildTrustedExternalReviewWhere({
        moduleId,
        subjectCompanyId,
        subjectProductId,
        scoreVersion: EXTERNAL_REVIEW_SCORE_VERSION,
      }),
      score: { not: null },
      weightedAvg: { not: null },
      signalIntegrityScore: { not: null },
    },
    select: {
      id: true,
      score: true,
      weightedAvg: true,
      signalIntegrityScore: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (reviews.length === 0) {
    await prisma.externalObservedSignalRollup.deleteMany({
      where: {
        targetScopeKey,
        moduleId,
        rollupVersion: ROLLUP_VERSION,
      },
    });

    await clearExternalObservedCapabilityScores({
      companyId: subjectCompanyId,
      productId: subjectProductId,
      moduleId,
      scoreVersion: EXTERNAL_REVIEW_SCORE_VERSION,
    });

    return {
      deleted: true,
      reviewCount: 0,
      rollupVersion: ROLLUP_VERSION,
    };
  }

  const scoreValues = reviews
    .map((review) => review.score)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const weightedAvgValues = reviews
    .map((review) => review.weightedAvg)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const signalIntegrityValues = reviews
    .map((review) => review.signalIntegrityScore)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const latestReviewAt = reviews[0]?.createdAt ?? null;
  const updateData = {
    reviewCount: reviews.length,
    scoreAvg: averageOrNull(scoreValues),
    weightedAvgAvg: averageOrNull(weightedAvgValues),
    signalIntegrityAvg: averageOrNull(signalIntegrityValues),
    latestReviewAt,
  };

  const upserted = await prisma.externalObservedSignalRollup.upsert({
    where: {
      targetScopeKey_moduleId_rollupVersion: {
        targetScopeKey,
        moduleId,
        rollupVersion: ROLLUP_VERSION,
      },
    },
    update: updateData,
    create: {
      id: randomUUID(),
      moduleId,
      subjectCompanyId,
      subjectProductId,
      targetScopeKey,
      rollupVersion: ROLLUP_VERSION,
      ...updateData,
    },
    select: {
      id: true,
      moduleId: true,
      subjectCompanyId: true,
      subjectProductId: true,
      reviewCount: true,
      scoreAvg: true,
      weightedAvgAvg: true,
      signalIntegrityAvg: true,
      latestReviewAt: true,
      rollupVersion: true,
    },
  });

  const capabilityPersistence = await persistExternalObservedCapabilityScores({
    companyId: subjectCompanyId,
    productId: subjectProductId,
    moduleId,
    moduleKey: moduleRecord.key,
    scoreVersion: EXTERNAL_REVIEW_SCORE_VERSION,
    externalObservedSignalRollupId: upserted.id,
    scoreAvg: upserted.scoreAvg,
    weightedAvgAvg: upserted.weightedAvgAvg,
  });

  return {
    deleted: false,
    rollup: upserted,
    capabilityPersistence,
  };
}
