import {
  getExternalObservedUnlockCandidates,
} from "@/lib/reviews/getExternalObservedUnlockCandidates";
import { PRODUCT_OBSERVED_SIGNAL_CARD_THRESHOLDS } from "@/lib/reviews/externalObservedCardRules";

type GetExternalObservedEffectiveUnlockPreviewInput = {
  subjectCompanyId: string;
  subjectProductId?: string | null;
};

export type ExternalObservedEffectiveUnlockPreviewItem = {
  cardId: string;
  realUnlockUnchanged: true;
  externalCandidateExists: boolean;
  wouldPreviewUnlock: boolean;
  reason: string;
  thresholdUsed: 60 | 75 | null;
};

export type ExternalObservedEffectiveUnlockPreviewResult = {
  ok: boolean;
  subject: { companyId: string; productId: string | null };
  global: {
    featureFlagEnabled: boolean;
    candidateCount: number;
    qualifyingCount: number;
  };
  previewByCardId: Record<string, ExternalObservedEffectiveUnlockPreviewItem>;
};

function normalizeRequired(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getExternalObservedEffectiveUnlockPreview(
  input: GetExternalObservedEffectiveUnlockPreviewInput
): Promise<ExternalObservedEffectiveUnlockPreviewResult> {
  const subjectCompanyId = normalizeRequired(input.subjectCompanyId);
  const subjectProductId = normalizeOptional(input.subjectProductId);

  const candidatesPayload = await getExternalObservedUnlockCandidates({
    subjectCompanyId,
    subjectProductId,
  });

  const candidatesByCardId = new Map(
    candidatesPayload.candidates.map((candidate) => [candidate.cardId, candidate])
  );

  const previewByCardId = Object.fromEntries(
    PRODUCT_OBSERVED_SIGNAL_CARD_THRESHOLDS.map(({ cardId }) => {
      const candidate = candidatesByCardId.get(cardId);

      const previewItem: ExternalObservedEffectiveUnlockPreviewItem = {
        cardId,
        realUnlockUnchanged: true,
        externalCandidateExists: Boolean(candidate),
        wouldPreviewUnlock: candidate ? candidate.wouldQualify : false,
        reason: candidate ? candidate.reason : "NO_CANDIDATE",
        thresholdUsed: candidate ? candidate.thresholdUsed : null,
      };

      return [cardId, previewItem];
    })
  );

  const candidateCount = candidatesPayload.candidates.length;
  const qualifyingCount = candidatesPayload.candidates.filter((candidate) => candidate.wouldQualify).length;

  return {
    ok: candidatesPayload.ok,
    subject: candidatesPayload.subject,
    global: {
      featureFlagEnabled: candidatesPayload.global.featureFlagEnabled,
      candidateCount,
      qualifyingCount,
    },
    previewByCardId,
  };
}
