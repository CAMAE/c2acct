import prisma from "@/lib/prisma";
import { TRUSTED_EXTERNAL_REVIEW_MIN_REVIEW_COUNT } from "@/lib/reviews/trustedExternalReview";

export type ExternalObservedEligibilityReason =
  | "FEATURE_DISABLED"
  | "ROLLUP_NOT_FOUND"
  | "INSUFFICIENT_SAMPLE"
  | "ELIGIBLE";

export type ExternalObservedRollupSnapshot = {
  id: string;
  reviewCount: number;
  scoreAvg: number | null;
  weightedAvgAvg: number | null;
  signalIntegrityAvg: number | null;
  latestReviewAt: Date | null;
};

export type EvaluateExternalObservedEligibilityInput = {
  moduleId: string;
  subjectCompanyId: string;
  subjectProductId?: string | null;
  minReviewCount?: number;
  featureFlagEnabled: boolean;
};

export type EvaluateExternalObservedEligibilityResult = {
  ok: boolean;
  eligible: boolean;
  reason: ExternalObservedEligibilityReason;
  rollup: ExternalObservedRollupSnapshot | null;
};

const ROLLUP_VERSION = 1;
const DEFAULT_MIN_REVIEW_COUNT = TRUSTED_EXTERNAL_REVIEW_MIN_REVIEW_COUNT;

function normalizeRequired(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function evaluateExternalObservedEligibility(
  input: EvaluateExternalObservedEligibilityInput
): Promise<EvaluateExternalObservedEligibilityResult> {
  const moduleId = normalizeRequired(input.moduleId);
  const subjectCompanyId = normalizeRequired(input.subjectCompanyId);
  const subjectProductId = normalizeOptional(input.subjectProductId);
  const minReviewCount = Number.isFinite(input.minReviewCount)
    ? Math.max(1, Math.floor(input.minReviewCount as number))
    : DEFAULT_MIN_REVIEW_COUNT;

  if (!input.featureFlagEnabled) {
    return {
      ok: true,
      eligible: false,
      reason: "FEATURE_DISABLED",
      rollup: null,
    };
  }

  if (!moduleId || !subjectCompanyId) {
    return {
      ok: false,
      eligible: false,
      reason: "ROLLUP_NOT_FOUND",
      rollup: null,
    };
  }

  const rollup = await prisma.externalObservedSignalRollup.findFirst({
    where: {
      moduleId,
      subjectCompanyId,
      subjectProductId,
      rollupVersion: ROLLUP_VERSION,
    },
    select: {
      id: true,
      reviewCount: true,
      scoreAvg: true,
      weightedAvgAvg: true,
      signalIntegrityAvg: true,
      latestReviewAt: true,
    },
  });

  if (!rollup) {
    return {
      ok: true,
      eligible: false,
      reason: "ROLLUP_NOT_FOUND",
      rollup: null,
    };
  }

  if (rollup.reviewCount < minReviewCount) {
    return {
      ok: true,
      eligible: false,
      reason: "INSUFFICIENT_SAMPLE",
      rollup,
    };
  }

  return {
    ok: true,
    eligible: true,
    reason: "ELIGIBLE",
    rollup,
  };
}
