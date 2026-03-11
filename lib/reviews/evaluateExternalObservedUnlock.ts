import {
  evaluateExternalObservedEligibility,
  type ExternalObservedEligibilityReason,
  type ExternalObservedRollupSnapshot,
} from "./evaluateExternalObservedEligibility";

export type ExternalObservedUnlockReason =
  | "FEATURE_DISABLED"
  | "ROLLUP_NOT_FOUND"
  | "INSUFFICIENT_SAMPLE"
  | "SCORE_MISSING"
  | "BELOW_MIN_SCORE"
  | "QUALIFIED";

export type EvaluateExternalObservedUnlockInput = {
  moduleId: string;
  subjectCompanyId: string;
  subjectProductId?: string | null;
  minReviewCount?: number;
  featureFlagEnabled: boolean;
  minScoreAvg?: number;
};

export type EvaluateExternalObservedUnlockResult = {
  ok: boolean;
  eligible: boolean;
  unlockQualified: boolean;
  reason: ExternalObservedUnlockReason;
  rollup: ExternalObservedRollupSnapshot | null;
  thresholds: {
    minReviewCount: number;
    minScoreAvg: number;
    featureFlagEnabled: boolean;
  };
};

type IneligibleEligibilityReason = Exclude<
  ExternalObservedEligibilityReason,
  "ELIGIBLE"
>;

const DEFAULT_MIN_REVIEW_COUNT = 3;
const DEFAULT_MIN_SCORE_AVG = 60;

function normalizeMinReviewCount(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MIN_REVIEW_COUNT;
  }

  return Math.max(1, Math.floor(value as number));
}

function normalizeMinScoreAvg(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MIN_SCORE_AVG;
  }

  return value as number;
}

export async function evaluateExternalObservedUnlock(
  input: EvaluateExternalObservedUnlockInput
): Promise<EvaluateExternalObservedUnlockResult> {
  const minReviewCount = normalizeMinReviewCount(input.minReviewCount);
  const minScoreAvg = normalizeMinScoreAvg(input.minScoreAvg);

  const eligibility = await evaluateExternalObservedEligibility({
    moduleId: input.moduleId,
    subjectCompanyId: input.subjectCompanyId,
    subjectProductId: input.subjectProductId,
    minReviewCount,
    featureFlagEnabled: input.featureFlagEnabled,
  });

  const thresholds = {
    minReviewCount,
    minScoreAvg,
    featureFlagEnabled: input.featureFlagEnabled,
  };

  if (!eligibility.eligible) {
    return {
      ok: eligibility.ok,
      eligible: false,
      unlockQualified: false,
      reason: eligibility.reason as IneligibleEligibilityReason,
      rollup: eligibility.rollup,
      thresholds,
    };
  }

  const scoreAvg = eligibility.rollup?.scoreAvg ?? null;

  if (scoreAvg === null) {
    return {
      ok: eligibility.ok,
      eligible: true,
      unlockQualified: false,
      reason: "SCORE_MISSING",
      rollup: eligibility.rollup,
      thresholds,
    };
  }

  if (scoreAvg < minScoreAvg) {
    return {
      ok: eligibility.ok,
      eligible: true,
      unlockQualified: false,
      reason: "BELOW_MIN_SCORE",
      rollup: eligibility.rollup,
      thresholds,
    };
  }

  return {
    ok: eligibility.ok,
    eligible: true,
    unlockQualified: true,
    reason: "QUALIFIED",
    rollup: eligibility.rollup,
    thresholds,
  };
}
