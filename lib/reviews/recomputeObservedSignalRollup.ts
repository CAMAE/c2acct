import { randomUUID } from "crypto";
import { ExternalReviewStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

export type RecomputeObservedSignalRollupInput = {
  moduleId: string;
  subjectCompanyId: string;
  subjectProductId?: string | null;
};

const ROLLUP_VERSION = 1;
const INCLUDED_REVIEW_STATUSES: ExternalReviewStatus[] = ["SUBMITTED", "FINALIZED"];

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

  const where = {
    moduleId,
    subjectCompanyId,
    subjectProductId,
    reviewStatus: { in: INCLUDED_REVIEW_STATUSES },
  };

  const reviews = await prisma.externalReviewSubmission.findMany({
    where,
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
    // Delete is the cleanest behavior here: no qualifying reviews means no observed signal to store.
    await prisma.externalObservedSignalRollup.deleteMany({
      where: {
        moduleId,
        subjectCompanyId,
        subjectProductId,
        rollupVersion: ROLLUP_VERSION,
      },
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

  const existing = await prisma.externalObservedSignalRollup.findFirst({
    where: {
      moduleId,
      subjectCompanyId,
      subjectProductId,
      rollupVersion: ROLLUP_VERSION,
    },
    select: { id: true },
  });

  const updateData = {
    reviewCount: reviews.length,
    scoreAvg: averageOrNull(scoreValues),
    weightedAvgAvg: averageOrNull(weightedAvgValues),
    signalIntegrityAvg: averageOrNull(signalIntegrityValues),
    latestReviewAt,
  };

  const upserted = existing
    ? await prisma.externalObservedSignalRollup.update({
        where: { id: existing.id },
        data: updateData,
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
      })
    : await prisma.externalObservedSignalRollup.create({
        data: {
          id: randomUUID(),
          moduleId,
          subjectCompanyId,
          subjectProductId,
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

  return {
    deleted: false,
    rollup: upserted,
  };
}
