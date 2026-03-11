import { evaluateExternalObservedUnlock, type EvaluateExternalObservedUnlockResult } from "@/lib/reviews/evaluateExternalObservedUnlock";
import { getExternalObservedAnnotation } from "@/lib/reviews/getExternalObservedAnnotation";

type GetExternalObservedUnlockDiagnosticsInput = {
  subjectCompanyId: string;
  subjectProductId?: string | null;
};

type ExternalObservedModuleRef = {
  id: string;
  key: string;
};

type ExternalObservedUnlockGlobalDiagnostics = {
  featureFlagEnabled: boolean;
  annotationEligible: boolean;
  unlockAt60: EvaluateExternalObservedUnlockResult | null;
  unlockAt75: EvaluateExternalObservedUnlockResult | null;
};

type ExternalObservedCardDiagnostics = {
  unlockAt60: EvaluateExternalObservedUnlockResult | null;
  unlockAt75: EvaluateExternalObservedUnlockResult | null;
};

export type ExternalObservedUnlockDiagnosticsResult = {
  ok: boolean;
  module: ExternalObservedModuleRef | null;
  subject: { companyId: string; productId: string | null };
  global: ExternalObservedUnlockGlobalDiagnostics;
  cardDiagnostics: Record<string, ExternalObservedCardDiagnostics>;
};

const OBSERVED_MODULE_KEY = "product_workflow_fit_review_v1";

// Temporary product-card mapping for diagnostics; all cards share the same observed result in this batch.
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

function buildCardDiagnostics(
  unlockAt60: EvaluateExternalObservedUnlockResult | null,
  unlockAt75: EvaluateExternalObservedUnlockResult | null
): Record<string, ExternalObservedCardDiagnostics> {
  return Object.fromEntries(
    PRODUCT_OUTPUT_CARD_IDS.map((cardId) => [
      cardId,
      {
        unlockAt60,
        unlockAt75,
      },
    ])
  );
}

export async function getExternalObservedUnlockDiagnostics(
  input: GetExternalObservedUnlockDiagnosticsInput
): Promise<ExternalObservedUnlockDiagnosticsResult> {
  const subjectCompanyId = normalizeRequired(input.subjectCompanyId);
  const subjectProductId = normalizeOptional(input.subjectProductId);

  const annotation = await getExternalObservedAnnotation({
    moduleKey: OBSERVED_MODULE_KEY,
    subjectCompanyId,
    subjectProductId,
  });

  const featureFlagEnabled = annotation.enabled;
  const moduleRef = annotation.module;

  if (!moduleRef) {
    return {
      ok: annotation.ok,
      module: null,
      subject: { companyId: subjectCompanyId, productId: subjectProductId },
      global: {
        featureFlagEnabled,
        annotationEligible: annotation.eligible,
        unlockAt60: null,
        unlockAt75: null,
      },
      cardDiagnostics: buildCardDiagnostics(null, null),
    };
  }

  const [unlockAt60, unlockAt75] = await Promise.all([
    evaluateExternalObservedUnlock({
      moduleId: moduleRef.id,
      subjectCompanyId,
      subjectProductId,
      minReviewCount: 3,
      featureFlagEnabled,
      minScoreAvg: 60,
    }),
    evaluateExternalObservedUnlock({
      moduleId: moduleRef.id,
      subjectCompanyId,
      subjectProductId,
      minReviewCount: 3,
      featureFlagEnabled,
      minScoreAvg: 75,
    }),
  ]);

  return {
    ok: annotation.ok && unlockAt60.ok && unlockAt75.ok,
    module: moduleRef,
    subject: { companyId: subjectCompanyId, productId: subjectProductId },
    global: {
      featureFlagEnabled,
      annotationEligible: annotation.eligible,
      unlockAt60,
      unlockAt75,
    },
    cardDiagnostics: buildCardDiagnostics(unlockAt60, unlockAt75),
  };
}
