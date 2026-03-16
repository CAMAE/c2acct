import prisma from "@/lib/prisma";
import { PRODUCT_EXTERNAL_REVIEW_MODULE_KEY } from "@/lib/assessment-module-catalog";
import { evaluateAndPersistUnlockedInsights } from "@/lib/engine/evaluateInsightUnlocks";
import { evaluateOutputGateRule } from "@/lib/intelligence/outputGates";
import {
  getOutputSectionsForAssessmentTarget,
  type OutputCardRegistryEntry,
  type OutputSectionRegistryEntry,
} from "@/lib/intelligence/outputRegistry";
import {
  FIRM_BASELINE_MODULE_KEY,
  PRODUCT_BASELINE_MODULE_KEY,
} from "@/lib/intelligence/runtimeConfig";
import { getVisibleProductCatalogForViewer } from "@/lib/intelligence/getVisibleProductCatalogForViewer";
import {
  computeVendorProductDimensionScores,
  PRODUCT_DIMENSION_LABELS,
  type ProductDimensionKey,
} from "@/lib/productOutputScoring";
import { getExternalObservedAnnotation } from "@/lib/reviews/getExternalObservedAnnotation";
import { getExternalObservedUnlockCandidates } from "@/lib/reviews/getExternalObservedUnlockCandidates";

type VisibleProductCatalogPayload = NonNullable<
  Awaited<ReturnType<typeof getVisibleProductCatalogForViewer>>
>;

type IntelligenceEvidenceSource = "SELF_SIGNAL" | "OBSERVED_SIGNAL";

type IntelligenceUnlockEvidenceItem = {
  source: IntelligenceEvidenceSource;
  label: string;
  detail: string;
};

export type IntelligenceCardViewModel = OutputCardRegistryEntry & {
  unlocked: boolean;
  unlockedInsightTitle: string | null;
  unlockedInsightBody: string | null;
  dimensionScore: number | null;
  observedSignal: {
    wouldQualify: boolean;
    reason: string;
    thresholdUsed: 60 | 75 | null;
    reviewCount: number;
    scoreAvg: number | null;
    weightedAvgAvg: number | null;
    signalIntegrityAvg: number | null;
  } | null;
  unlockEvidence: IntelligenceUnlockEvidenceItem[];
  evidenceSummary: string;
};

export type IntelligenceSectionViewModel = Omit<OutputSectionRegistryEntry, "cards"> & {
  cards: IntelligenceCardViewModel[];
};

export type ProductIntelligenceSignalSummary = {
  self: {
    score: number | null;
    weightedAvg: number | null;
    signalIntegrityScore: number;
    badgeCount: number;
  };
  observed: {
    eligible: boolean;
    reviewCount: number;
    scoreAvg: number | null;
    weightedAvgAvg: number | null;
    signalIntegrityAvg: number | null;
  } | null;
};

export type ViewerIntelligencePageData = {
  currentCompany: {
    id: string;
    name: string;
    type: "FIRM" | "VENDOR";
  };
  product: {
    id: string;
    name: string;
    companyId: string;
  } | null;
  catalog: VisibleProductCatalogPayload["products"];
  result: {
    score: number | null;
    weightedAvg: number | null;
    signalIntegrityScore: number;
  };
  outputSections: IntelligenceSectionViewModel[];
  sectionById: Map<string, IntelligenceSectionViewModel>;
  unlockedOutputCount: number;
  productDimensionAverage: number | null;
  dimensionEntries: Array<{ key: ProductDimensionKey; label: string; value: number | null }>;
  earnedBadges: Array<{ id: string; badgeId: string; moduleId: string; name: string }>;
  externalObservedAnnotation: Awaited<ReturnType<typeof getExternalObservedAnnotation>> | null;
  signalSummary: ProductIntelligenceSignalSummary;
};

export type ProductIntelligencePageData = ViewerIntelligencePageData & {
  product: {
    id: string;
    name: string;
    companyId: string;
  };
};

function normalizeBadgeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getEvidenceSummary(sources: readonly IntelligenceEvidenceSource[]) {
  if (sources.includes("SELF_SIGNAL") && sources.includes("OBSERVED_SIGNAL")) {
    return "Self signal and observed sponsor signal";
  }

  if (sources.includes("OBSERVED_SIGNAL")) {
    return "Observed sponsor signal";
  }

  return "Vendor self signal";
}

function buildUnlockEvidence(params: {
  card: OutputCardRegistryEntry;
  unlockedInsight: { key: string } | null;
  observedSignal: IntelligenceCardViewModel["observedSignal"];
  unlocked: boolean;
}): IntelligenceUnlockEvidenceItem[] {
  const items: IntelligenceUnlockEvidenceItem[] = [];

  if (params.card.evidenceSources.includes("SELF_SIGNAL")) {
    items.push({
      source: "SELF_SIGNAL",
      label: "Self signal",
      detail: params.unlockedInsight?.key
        ? `Unlocked by self evidence for ${params.unlockedInsight.key}`
        : params.card.badgeName
          ? `Declared self gate via ${params.card.badgeName}`
          : params.unlocked
            ? "Unlocked by current self evidence"
            : "Awaiting self evidence",
    });
  }

  if (params.card.evidenceSources.includes("OBSERVED_SIGNAL")) {
    items.push({
      source: "OBSERVED_SIGNAL",
      label: "Observed signal",
      detail: params.observedSignal
        ? `Observed sponsor signal ${params.observedSignal.wouldQualify ? "qualified" : "did not qualify"} (${params.observedSignal.reason})`
        : "No qualifying observed sponsor signal yet",
    });
  }

  return items;
}

export async function getViewerIntelligencePageData(input?: {
  productId?: string | null;
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>;
}): Promise<ViewerIntelligencePageData | null> {
  const requestedProductId = input?.productId?.trim() || null;
  const catalogPayload = await getVisibleProductCatalogForViewer({
    searchParams: input?.searchParams,
    includeSponsoredProducts: true,
  });

  if (!catalogPayload?.currentCompany) {
    return null;
  }

  const viewerCompany = catalogPayload.currentCompany;
  const product = requestedProductId
    ? catalogPayload.products.find((entry) => entry.id === requestedProductId) ?? null
    : null;

  if (requestedProductId && !product) {
    return null;
  }

  const subjectCompanyId = product?.companyId ?? viewerCompany.id;
  const subjectProductId = product?.id ?? null;

  const [
    latestSubmission,
    earnedBadgeRows,
    unlockedEvaluation,
    latestProductSubmission,
    externalObservedAnnotation,
    externalObservedUnlockCandidates,
  ] = await Promise.all([
    prisma.surveySubmission.findFirst({
      where: {
        companyId: subjectCompanyId,
        productId: subjectProductId,
        SurveyModule: { key: subjectProductId ? PRODUCT_BASELINE_MODULE_KEY : FIRM_BASELINE_MODULE_KEY },
      },
      orderBy: { createdAt: "desc" },
      select: {
        score: true,
        weightedAvg: true,
        signalIntegrityScore: true,
      },
    }),
    prisma.companyBadge.findMany({
      where: {
        companyId: subjectCompanyId,
        productId: subjectProductId,
      },
      orderBy: { awardedAt: "desc" },
      include: { Badge: { select: { name: true } } },
    }),
    evaluateAndPersistUnlockedInsights({
      companyId: subjectCompanyId,
      productId: subjectProductId,
    }),
    subjectProductId
      ? prisma.surveySubmission.findFirst({
          where: {
            companyId: subjectCompanyId,
            productId: subjectProductId,
            SurveyModule: { key: PRODUCT_BASELINE_MODULE_KEY },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            moduleId: true,
            answers: true,
          },
        })
      : Promise.resolve(null),
    subjectProductId
      ? getExternalObservedAnnotation({
          moduleKey: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY,
          subjectCompanyId,
          subjectProductId,
        })
      : Promise.resolve(null),
    subjectProductId
      ? getExternalObservedUnlockCandidates({
          subjectCompanyId,
          subjectProductId,
        })
      : Promise.resolve(null),
  ]);

  const questionKeyById =
    latestProductSubmission
      ? new Map(
          (
            await prisma.surveyQuestion.findMany({
              where: { moduleId: latestProductSubmission.moduleId },
              select: { id: true, key: true },
            })
          ).map((question) => [question.id, question.key])
        )
      : new Map<string, string>();

  const dimensionScores =
    latestProductSubmission
      ? computeVendorProductDimensionScores({
          answers: latestProductSubmission.answers,
          questionKeyById,
        })
      : null;

  const dimensionEntries = (Object.entries(PRODUCT_DIMENSION_LABELS) as Array<
    [ProductDimensionKey, string]
  >).map(([key, label]) => ({
    key,
    label,
    value: dimensionScores?.[key] ?? null,
  }));

  const scoredDimensionValues = dimensionEntries
    .map((entry) => entry.value)
    .filter((value): value is number => typeof value === "number");
  const productDimensionAverage =
    scoredDimensionValues.length > 0
      ? Math.round(scoredDimensionValues.reduce((sum, value) => sum + value, 0) / scoredDimensionValues.length)
      : null;

  const earnedBadges = earnedBadgeRows.map((row) => ({
    id: row.id,
    badgeId: row.badgeId,
    moduleId: row.moduleId,
    name: row.Badge?.name ?? "",
  }));
  const badgeKeys = new Set<string>();
  for (const badge of earnedBadges) {
    if (badge.badgeId.trim()) {
      badgeKeys.add(`id:${badge.badgeId.trim().toLowerCase()}`);
    }
    if (badge.name.trim()) {
      badgeKeys.add(`name:${normalizeBadgeName(badge.name)}`);
    }
  }

  const unlockedByKey = new Map(unlockedEvaluation.unlocked.map((insight) => [insight.key, insight]));
  const unlockedInsightKeys = new Set(unlockedEvaluation.unlocked.map((insight) => insight.key));
  const observedCandidateByCardId = new Map(
    (externalObservedUnlockCandidates?.candidates ?? []).map((candidate) => [candidate.cardId, candidate])
  );
  const observedSignalCardIds = new Set(
    (externalObservedUnlockCandidates?.candidates ?? [])
      .filter((candidate) => candidate.wouldQualify)
      .map((candidate) => candidate.cardId)
  );
  const observedRollup = externalObservedAnnotation?.rollup ?? null;

  const outputSections = getOutputSectionsForAssessmentTarget({ productId: subjectProductId }).map((section) => ({
    ...section,
    cards: section.cards.map((card) => {
      const unlocked = evaluateOutputGateRule(card.gate, {
        badgeKeys,
        unlockedInsightKeys,
        observedSignalCardIds,
      });
      const unlockedInsight = card.insightKey ? unlockedByKey.get(card.insightKey) ?? null : null;
      const observedCandidate = observedCandidateByCardId.get(card.id) ?? null;
      const observedSignal =
        observedCandidate || card.evidenceSources.includes("OBSERVED_SIGNAL")
          ? {
              wouldQualify: observedCandidate?.wouldQualify ?? false,
              reason: observedCandidate?.reason ?? "ROLLUP_NOT_FOUND",
              thresholdUsed: observedCandidate?.thresholdUsed ?? null,
              reviewCount: observedRollup?.reviewCount ?? 0,
              scoreAvg: observedRollup?.scoreAvg ?? null,
              weightedAvgAvg: observedRollup?.weightedAvgAvg ?? null,
              signalIntegrityAvg: observedRollup?.signalIntegrityAvg ?? null,
            }
          : null;

      return {
        ...card,
        unlocked,
        unlockedInsightTitle: unlockedInsight?.title ?? null,
        unlockedInsightBody: unlockedInsight?.body ?? null,
        dimensionScore: card.dimensionKey ? dimensionScores?.[card.dimensionKey] ?? null : null,
        observedSignal,
        unlockEvidence: buildUnlockEvidence({
          card,
          unlockedInsight: unlockedInsight ? { key: unlockedInsight.key } : null,
          observedSignal,
          unlocked,
        }),
        evidenceSummary: getEvidenceSummary(card.evidenceSources),
      };
    }),
  }));

  const unlockedOutputCount = outputSections.flatMap((section) => section.cards).filter((card) => card.unlocked).length;
  const sectionById = new Map(outputSections.map((section) => [section.id, section]));
  const signalIntegrityScore =
    typeof latestSubmission?.signalIntegrityScore === "number" && latestSubmission.signalIntegrityScore > 0
      ? latestSubmission.signalIntegrityScore
      : 1;

  return {
    currentCompany: viewerCompany,
    product: product
      ? {
          id: product.id,
          name: product.name,
          companyId: product.companyId,
        }
      : null,
    catalog: catalogPayload.products,
    result: {
      score: latestSubmission?.score ?? null,
      weightedAvg: latestSubmission?.weightedAvg ?? null,
      signalIntegrityScore,
    },
    outputSections,
    sectionById,
    unlockedOutputCount,
    productDimensionAverage,
    dimensionEntries,
    earnedBadges,
    externalObservedAnnotation,
    signalSummary: {
      self: {
        score: latestSubmission?.score ?? null,
        weightedAvg: latestSubmission?.weightedAvg ?? null,
        signalIntegrityScore,
        badgeCount: earnedBadges.length,
      },
      observed: subjectProductId
        ? {
            eligible: externalObservedAnnotation?.eligible ?? false,
            reviewCount: externalObservedAnnotation?.annotation?.reviewCount ?? 0,
            scoreAvg: externalObservedAnnotation?.annotation?.scoreAvg ?? null,
            weightedAvgAvg: externalObservedAnnotation?.annotation?.weightedAvgAvg ?? null,
            signalIntegrityAvg: externalObservedAnnotation?.annotation?.signalIntegrityAvg ?? null,
          }
        : null,
    },
  };
}

export async function getProductIntelligencePageData(input: {
  productId: string;
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>;
}): Promise<ProductIntelligencePageData | null> {
  const data = await getViewerIntelligencePageData(input);
  if (!data?.product) {
    return null;
  }

  return data as ProductIntelligencePageData;
}
