import prisma from "@/lib/prisma";
import {
  evaluateExternalObservedEligibility,
  type ExternalObservedEligibilityReason,
  type ExternalObservedRollupSnapshot,
} from "@/lib/reviews/evaluateExternalObservedEligibility";

type GetExternalObservedAnnotationInput = {
  moduleKey?: string | null;
  moduleId?: string | null;
  subjectCompanyId: string;
  subjectProductId?: string | null;
  minReviewCount?: number;
};

export type ExternalObservedAnnotation = {
  label: "Observed market signal";
  reviewCount: number;
  scoreAvg: number | null;
  weightedAvgAvg: number | null;
  signalIntegrityAvg: number | null;
  latestReviewAt: Date | null;
};

export type ExternalObservedAnnotationResult = {
  ok: boolean;
  enabled: boolean;
  eligible: boolean;
  reason: ExternalObservedEligibilityReason | "MODULE_KEY_OR_ID_REQUIRED" | "MODULE_NOT_FOUND" | "MODULE_INACTIVE" | "MODULE_NOT_EXTERNAL_REVIEW";
  module: { id: string; key: string } | null;
  subject: { companyId: string; productId: string | null };
  rollup: ExternalObservedRollupSnapshot | null;
  annotation: ExternalObservedAnnotation | null;
};

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

function normalizeRequired(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getExternalObservedAnnotation(
  input: GetExternalObservedAnnotationInput
): Promise<ExternalObservedAnnotationResult> {
  const moduleKey = normalizeOptional(input.moduleKey);
  const moduleId = normalizeOptional(input.moduleId);
  const subjectCompanyId = normalizeRequired(input.subjectCompanyId);
  const subjectProductId = normalizeOptional(input.subjectProductId);
  const minReviewCount = input.minReviewCount;
  const enabled = isEnabled(process.env.ENABLE_EXTERNAL_OBSERVED_SIGNALS);

  if (!moduleKey && !moduleId) {
    return {
      ok: false,
      enabled,
      eligible: false,
      reason: "MODULE_KEY_OR_ID_REQUIRED",
      module: null,
      subject: { companyId: subjectCompanyId, productId: subjectProductId },
      rollup: null,
      annotation: null,
    };
  }

  const moduleByKeyPromise = moduleKey
    ? prisma.surveyModule.findUnique({
        where: { key: moduleKey },
        select: { id: true, key: true, axis: true, active: true },
      })
    : Promise.resolve(null);

  const moduleByIdPromise = moduleId
    ? prisma.surveyModule.findUnique({
        where: { id: moduleId },
        select: { id: true, key: true, axis: true, active: true },
      })
    : Promise.resolve(null);

  const [moduleByKey, moduleById] = await Promise.all([moduleByKeyPromise, moduleByIdPromise]);

  const moduleRecord = moduleByKey ?? moduleById;
  if (!moduleRecord) {
    return {
      ok: false,
      enabled,
      eligible: false,
      reason: "MODULE_NOT_FOUND",
      module: null,
      subject: { companyId: subjectCompanyId, productId: subjectProductId },
      rollup: null,
      annotation: null,
    };
  }

  if (!moduleRecord.active) {
    return {
      ok: false,
      enabled,
      eligible: false,
      reason: "MODULE_INACTIVE",
      module: { id: moduleRecord.id, key: moduleRecord.key },
      subject: { companyId: subjectCompanyId, productId: subjectProductId },
      rollup: null,
      annotation: null,
    };
  }

  if (moduleRecord.axis !== "EXTERNAL_REVIEW") {
    return {
      ok: false,
      enabled,
      eligible: false,
      reason: "MODULE_NOT_EXTERNAL_REVIEW",
      module: { id: moduleRecord.id, key: moduleRecord.key },
      subject: { companyId: subjectCompanyId, productId: subjectProductId },
      rollup: null,
      annotation: null,
    };
  }

  const eligibility = await evaluateExternalObservedEligibility({
    moduleId: moduleRecord.id,
    subjectCompanyId,
    subjectProductId,
    minReviewCount,
    featureFlagEnabled: enabled,
  });

  const annotation =
    eligibility.eligible && eligibility.rollup
      ? {
          label: "Observed market signal" as const,
          reviewCount: eligibility.rollup.reviewCount,
          scoreAvg: eligibility.rollup.scoreAvg,
          weightedAvgAvg: eligibility.rollup.weightedAvgAvg,
          signalIntegrityAvg: eligibility.rollup.signalIntegrityAvg,
          latestReviewAt: eligibility.rollup.latestReviewAt,
        }
      : null;

  return {
    ok: eligibility.ok,
    enabled,
    eligible: eligibility.eligible,
    reason: eligibility.reason,
    module: { id: moduleRecord.id, key: moduleRecord.key },
    subject: { companyId: subjectCompanyId, productId: subjectProductId },
    rollup: eligibility.rollup,
    annotation,
  };
}
