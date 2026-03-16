import type { Prisma } from "@prisma/client";

export const TRUSTED_EXTERNAL_REVIEW_STATUSES = ["FINALIZED"] as const;
export const TRUSTED_EXTERNAL_REVIEW_MIN_REVIEW_COUNT = 3;
export const EXTERNAL_REVIEW_DUPLICATE_POLICY = "LATEST_FINALIZED_WINS";

type TrustedExternalReviewStatus = (typeof TRUSTED_EXTERNAL_REVIEW_STATUSES)[number];

function normalizeScoreTo100(value: number, scaleMin: number, scaleMax: number) {
  const denominator = scaleMax - scaleMin;
  if (!Number.isFinite(value) || denominator <= 0) {
    return null;
  }

  if (value < scaleMin || value > scaleMax) {
    return null;
  }

  return Math.round(((value - scaleMin) / denominator) * 100);
}

export function getTrustedExternalReviewStatuses(): TrustedExternalReviewStatus[] {
  return [...TRUSTED_EXTERNAL_REVIEW_STATUSES];
}

export function getTrustedExternalReviewStatusForAcceptedSubmission(): TrustedExternalReviewStatus {
  return "FINALIZED";
}

export function buildTrustedExternalReviewWhere(input: {
  moduleId: string;
  subjectCompanyId: string;
  subjectProductId?: string | null;
  scoreVersion?: number;
}): Prisma.ExternalReviewSubmissionWhereInput {
  return {
    moduleId: input.moduleId,
    subjectCompanyId: input.subjectCompanyId,
    subjectProductId: input.subjectProductId ?? null,
    reviewStatus: {
      in: getTrustedExternalReviewStatuses(),
    },
    ...(typeof input.scoreVersion === "number" ? { scoreVersion: input.scoreVersion } : {}),
  };
}

// Deterministic duplicate policy: for the same reviewer identity and target, the newest
// accepted review becomes the only trusted/finalized row; older matching rows are rejected
// but retained for provenance.
export function buildExternalReviewDuplicateWhere(input: {
  reviewerCompanyId: string;
  reviewerUserId?: string | null;
  subjectCompanyId: string;
  subjectProductId?: string | null;
  moduleId: string;
}) {
  return {
    reviewerCompanyId: input.reviewerCompanyId,
    reviewerUserId: input.reviewerUserId ?? null,
    subjectCompanyId: input.subjectCompanyId,
    subjectProductId: input.subjectProductId ?? null,
    moduleId: input.moduleId,
  } satisfies Prisma.ExternalReviewSubmissionWhereInput;
}

export function computeNormalizedExternalReviewDimensions(input: {
  answers: Record<string, number>;
  questions: Array<{ id: string; key: string }>;
  scaleMin: number;
  scaleMax: number;
}) {
  const questionKeyById = new Map(input.questions.map((question) => [question.id, question.key]));
  const normalizedEntries = Object.entries(input.answers)
    .map(([questionId, rawValue]) => {
      const questionKey = questionKeyById.get(questionId);
      const normalizedScore = normalizeScoreTo100(rawValue, input.scaleMin, input.scaleMax);

      if (!questionKey || normalizedScore === null) {
        return null;
      }

      return [questionKey, normalizedScore] as const;
    })
    .filter((entry): entry is readonly [string, number] => entry !== null);

  if (normalizedEntries.length === 0) {
    return null;
  }

  return Object.fromEntries(normalizedEntries);
}
