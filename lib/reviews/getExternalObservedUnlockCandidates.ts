import {
  getExternalObservedUnlockDiagnostics,
  type ExternalObservedUnlockDiagnosticsResult,
} from "@/lib/reviews/getExternalObservedUnlockDiagnostics";

type GetExternalObservedUnlockCandidatesInput = {
  subjectCompanyId: string;
  subjectProductId?: string | null;
};

export type ExternalObservedUnlockCandidate = {
  cardId: string;
  wouldQualify: boolean;
  basis: "EXTERNAL_OBSERVED_SCORE";
  thresholdUsed: 60 | 75;
  reason: string;
};

export type ExternalObservedUnlockCandidatesResult = {
  ok: boolean;
  module: { id: string; key: string } | null;
  subject: { companyId: string; productId: string | null };
  global: {
    featureFlagEnabled: boolean;
    annotationEligible: boolean;
    unlockAt60: ExternalObservedUnlockDiagnosticsResult["global"]["unlockAt60"];
    unlockAt75: ExternalObservedUnlockDiagnosticsResult["global"]["unlockAt75"];
  };
  candidates: ExternalObservedUnlockCandidate[];
};

const PRODUCT_OUTPUT_CARD_IDS = [
  "product_positioning_clarity",
  "product_workflow_fit_snapshot",
  "product_integration_readiness",
  "product_onboarding_friction_estimate",
  "product_support_confidence_signal",
  "product_gtm_readiness_summary",
  "product_improvement_priorities",
] as const;

function normalizeRequired(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildCandidates(
  diagnostics: ExternalObservedUnlockDiagnosticsResult
): ExternalObservedUnlockCandidate[] {
  const splitIndex = Math.ceil(PRODUCT_OUTPUT_CARD_IDS.length / 2);

  return PRODUCT_OUTPUT_CARD_IDS.map((cardId, index) => {
    const thresholdUsed: 60 | 75 = index < splitIndex ? 60 : 75;
    const unlockResult = thresholdUsed === 60 ? diagnostics.global.unlockAt60 : diagnostics.global.unlockAt75;

    return {
      cardId,
      wouldQualify: Boolean(unlockResult?.unlockQualified),
      basis: "EXTERNAL_OBSERVED_SCORE",
      thresholdUsed,
      reason: unlockResult?.reason ?? "ROLLUP_NOT_FOUND",
    };
  });
}

export async function getExternalObservedUnlockCandidates(
  input: GetExternalObservedUnlockCandidatesInput
): Promise<ExternalObservedUnlockCandidatesResult> {
  const subjectCompanyId = normalizeRequired(input.subjectCompanyId);
  const subjectProductId = normalizeOptional(input.subjectProductId);

  const diagnostics = await getExternalObservedUnlockDiagnostics({
    subjectCompanyId,
    subjectProductId,
  });

  return {
    ok: diagnostics.ok,
    module: diagnostics.module,
    subject: diagnostics.subject,
    global: diagnostics.global,
    candidates: buildCandidates(diagnostics),
  };
}
