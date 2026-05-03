import prisma from "@/lib/prisma";
import { FIRM_PRODUCT_MODULE_KEY, buildFirmProductQuestions } from "@/lib/firmPat";
import {
  ELITE_PLACEHOLDER_CTA,
  ELITE_PLACEHOLDER_MESSAGE,
  ELITE_PLACEHOLDER_TITLE,
  getVendorProductInsightContent,
} from "@/lib/insightContent";
import { buildHelpSurfaceContent, type InsightSurfaceContent } from "@/lib/insightSurface";
import { recordPatDiagnostic } from "@/lib/patDiagnostics";
import {
  normalizeAnswerForStoredScale,
  resolveStoredProductAssessmentScale,
} from "@/lib/productAssessmentRuntime";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import {
  PRODUCT_TIER1_INSIGHTS,
  PRODUCT_TIER2_INSIGHTS,
  VENDOR_PRODUCT_MODULE_KEY,
  buildVendorProductQuestions,
  deriveVendorProductAssessmentCompletionStatus,
  extractUtilityKeysFromSignals,
  getVendorCompanyContext,
  getVendorUtilityLabels,
} from "@/lib/vendorPat";

type ProductInsightDefinition = (typeof PRODUCT_TIER1_INSIGHTS)[number];

export type VendorProductInsightDetailMode = "pro" | "elite" | "help";
export type VendorProductInsightDetailSurfaceKey = "help" | "evidence";

export type VendorProductInsightDetailCard = {
  key: string;
  title: string;
  summary: string;
  statusLabel?: string;
  tone: "active" | "locked";
  href: string | null;
  interactive: boolean;
  supportingText: string | null;
};

export type VendorProductInsightDetailSurfaceCard = {
  key: VendorProductInsightDetailSurfaceKey;
  title: string;
  summary: string;
  href: string | null;
  interactive: boolean;
};

export type VendorProductInsightDetailSurfaceContent = InsightSurfaceContent<VendorProductInsightDetailSurfaceKey>;

type VendorSectionEvidence = {
  key: string;
  title: string;
  averageScore: number | null;
  questionCount: number;
};

type UtilityEvidence = {
  utilityKey: string;
  utilityLabel: string;
  averageScore: number | null;
  responseCount: number;
};

export type VendorProductInsightRecord = {
  key: ProductInsightDefinition["key"];
  title: string;
  confidenceBand: "no_signal" | "sample_thin" | "emerging" | "grounded";
  confidenceLabel: string;
  what: string;
  why: string;
  how: string;
  currentStateSummary: string;
  exactAssessmentBasis: string;
  vendorSectionEvidence: VendorSectionEvidence[];
  strongestVendorSections: VendorSectionEvidence[];
  weakestVendorSections: VendorSectionEvidence[];
  strongestFirmUtilities: UtilityEvidence[];
  weakestFirmUtilities: UtilityEvidence[];
  confidenceCaveats: string[];
};

export type VendorProductInsightSnapshot = {
  product: {
    id: string;
    name: string;
    summary: string | null;
    utilityKeys: string[];
    utilityLabels: string[];
    utilityScopeLabel: string;
  };
  vendorAssessmentStatus: {
    completed: boolean;
    latestSubmittedAt: Date | null;
    statusLabel: string;
    reason: string;
  };
  vendorSelfReported: {
    latestScore: number | null;
    submittedAt: Date | null;
    sectionEvidence: VendorSectionEvidence[];
  };
  firmReviewed: {
    assessmentCount: number;
    averageScore: number | null;
    latestSubmittedAt: Date | null;
    utilityEvidence: UtilityEvidence[];
  };
  divergence: {
    points: number | null;
    label: string;
  };
  latestUpdatedAt: Date | null;
  confidenceBand: "no_signal" | "sample_thin" | "emerging" | "grounded";
  confidenceLabel: string;
  confidenceSummary: string;
  combinedCurrentPatReadout: string;
  confidenceCaveats: string[];
  insightRecords: VendorProductInsightRecord[];
};

export type VendorProductInsightSnapshotInput = {
  product: {
    id: string;
    name: string;
    summary: string | null;
    utilityKeys: string[];
  };
  vendorAssessmentStatus: {
    completed: boolean;
    latestSubmittedAt: Date | null;
    statusLabel: string;
    reason: string;
  };
  vendorSelfReported: {
    latestScore: number | null;
    submittedAt: Date | null;
    responses: {
      answers: Record<string, number>;
      scaleMin: number;
      scaleMax: number;
    };
  };
  firmReviewed: {
    assessmentCount: number;
    latestSubmittedAt: Date | null;
    averageScore?: number | null;
    responseSets: Array<{
      answers: Record<string, number>;
      scaleMin: number;
      scaleMax: number;
    }>;
  };
};

export function getRequestedVendorProductInsightDetailMode(
  rawMode: string | undefined
): VendorProductInsightDetailMode {
  switch (rawMode?.trim().toLowerCase()) {
    case "elite":
      return "elite";
    case "help":
      return "help";
    case "pro":
    default:
      return "pro";
  }
}

export function getRequestedVendorProductInsightDetailSurface(
  rawSurface: string | undefined
): VendorProductInsightDetailSurfaceKey {
  switch (rawSurface?.trim().toLowerCase()) {
    case "help":
      return "help";
    case "evidence":
    case "basis":
    case "vendor-evidence":
    case "firm-evidence":
    case "confidence":
      return "evidence";
    default:
      return "help";
  }
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizeStoredAnswer(value: number, scaleMin: number, scaleMax: number) {
  const normalized = normalizeAnswerForStoredScale(value, scaleMin, scaleMax);
  return normalized === null ? null : round1(normalized);
}

function extractResponses(answers: unknown) {
  if (!answers || typeof answers !== "object") {
    return {};
  }

  const maybeResponses = (answers as { responses?: unknown }).responses;
  if (!maybeResponses || typeof maybeResponses !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(maybeResponses).filter(
      (entry): entry is [string, number] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "number" &&
        Number.isFinite(entry[1])
    )
  );
}

function buildConfidenceCaveats(input: {
  utilityKeys: string[];
  vendorScore: number | null;
  vendorSectionCount: number;
  firmAssessmentCount: number;
  firmAverageScore: number | null;
  firmUtilityCount: number;
  divergencePoints: number | null;
}) {
  const caveats: string[] = [];

  if (input.utilityKeys.length === 0) {
    caveats.push(
      "No product utility declaration is available yet, so PAT cannot treat this as a scoped product-utility readout."
    );
  }

  if (input.vendorScore === null) {
    caveats.push(
      "No vendor self-assessment has been submitted yet, so current product posture cannot be described from vendor-authored PAT evidence."
    );
  } else if (input.vendorSectionCount < 2) {
    caveats.push(
      `Vendor self-reported evidence only separates ${input.vendorSectionCount} scored section${
        input.vendorSectionCount === 1 ? "" : "s"
      } clearly, so section-level interpretation remains thin.`
    );
  }

  if (input.firmAssessmentCount === 0) {
    caveats.push(
      "No firm product reviews are available yet, so firm-reviewed signal should be treated as absent rather than implied."
    );
  } else if (input.firmAssessmentCount === 1) {
    caveats.push(
      "Firm-reviewed signal is based on 1 assessment only, so it remains early and sample-thin."
    );
  } else if (input.firmAssessmentCount < 4) {
    caveats.push(
      `Firm-reviewed signal is based on ${input.firmAssessmentCount} assessments, so it is useful but still sample-thin.`
    );
  }

  if (input.firmAssessmentCount > 0 && input.firmUtilityCount < 2) {
    caveats.push(
      "Firm-reviewed evidence is not yet rich enough to separate utility-family strengths and weaknesses with much confidence."
    );
  }

  if (
    input.divergencePoints !== null &&
    Math.abs(input.divergencePoints) >= 15 &&
    input.firmAverageScore !== null
  ) {
    caveats.push(
      `Vendor self-view and firm-reviewed signal are currently ${Math.abs(
        input.divergencePoints
      )} points apart, so PAT should treat the gap as a current calibration issue rather than a cosmetic difference.`
    );
  }

  if (caveats.length === 0) {
    caveats.push(
      "This remains current-state PAT evidence only. No external benchmark, market ranking, or projection is being claimed."
    );
  }

  return caveats;
}

function describeUtilityScope(utilityKeys: string[], utilityLabels: string[]) {
  if (utilityKeys.length === 0) {
    return "No declared utility scope";
  }

  return `${utilityKeys.length} declared utilit${utilityKeys.length === 1 ? "y" : "ies"}: ${utilityLabels.join(", ")}`;
}

function getConfidenceBand(input: {
  vendorScore: number | null;
  firmAssessmentCount: number;
}) {
  if (input.vendorScore === null && input.firmAssessmentCount === 0) {
    return {
      band: "no_signal" as const,
      label: "No current-state signal",
      summary:
        "Neither vendor self-reported signal nor firm-reviewed signal is available yet, so this remains an ungrounded placeholder.",
    };
  }
  if (input.firmAssessmentCount <= 1) {
    return {
      band: "sample_thin" as const,
      label: "Early current-state signal",
      summary:
        "Firm-reviewed signal is absent or very thin, so the combined readout should be treated as early current-state signal rather than strong confirmation.",
    };
  }
  if (input.firmAssessmentCount < 4) {
    return {
      band: "sample_thin" as const,
      label: "Sample-thin current-state signal",
      summary: `Firm-reviewed signal is based on ${input.firmAssessmentCount} assessments, so this remains sample-thin rather than broadly confirmed.`,
    };
  }
  if (input.firmAssessmentCount < 8) {
    return {
      band: "emerging" as const,
      label: "Emerging signal",
      summary: `Firm-reviewed signal is based on ${input.firmAssessmentCount} assessments and is useful for current-state interpretation, but still sample-thin.`,
    };
  }
  return {
    band: "grounded" as const,
    label: "Grounded current-state signal",
    summary:
      `Firm-reviewed signal is based on ${input.firmAssessmentCount} assessments and is grounded for current-state interpretation only. ` +
      "PAT is not claiming benchmark or forecast support.",
  };
}

function formatScore(score: number | null) {
  if (score === null) {
    return "--";
  }
  return `${Math.round(score)}%`;
}

function summarizeDivergence(vendorScore: number | null, firmAverageScore: number | null) {
  if (vendorScore === null || firmAverageScore === null) {
    return {
      points: null,
      label: "Not enough shared signal yet",
    };
  }

  const points = round1(vendorScore - firmAverageScore);
  if (Math.abs(points) < 5) {
    return { points, label: "Vendor self-view and firm review are closely aligned" };
  }
  if (points > 0) {
    return { points, label: "Vendor self-view is running above firm-reviewed signal" };
  }
  return { points, label: "Firm-reviewed signal is running above vendor self-view" };
}

function describeCombinedReadout(input: {
  productName: string;
  vendorScore: number | null;
  firmAssessmentCount: number;
  firmAverageScore: number | null;
  divergenceLabel: string;
}) {
  if (input.vendorScore === null && input.firmAverageScore === null) {
    return `${input.productName} does not have enough current PAT evidence yet. Vendor self-reported signal and firm-reviewed signal are both still missing.`;
  }

  if (input.vendorScore !== null && input.firmAverageScore === null) {
    return `${input.productName} currently reads mainly from vendor self-reported signal at ${formatScore(
      input.vendorScore
    )}. Firm-reviewed signal is not established yet, so PAT should treat this as a vendor-authored current-state view rather than a market-confirmed readout.`;
  }

  if (input.vendorScore === null && input.firmAverageScore !== null) {
    return `${input.productName} currently reads mainly from firm-reviewed signal at ${formatScore(
      input.firmAverageScore
    )} across ${input.firmAssessmentCount} assessment${
      input.firmAssessmentCount === 1 ? "" : "s"
    }. Vendor self-reported posture is still missing.`;
  }

  return `${input.productName} currently combines vendor self-reported signal at ${formatScore(
    input.vendorScore
  )} with firm-reviewed signal at ${formatScore(
    input.firmAverageScore
  )} across ${input.firmAssessmentCount} assessment${
    input.firmAssessmentCount === 1 ? "" : "s"
  }. ${input.divergenceLabel}.`;
}

function buildVendorSectionEvidence(
  utilityKeys: string[],
  vendorResponses: {
    answers: Record<string, number>;
    scaleMin: number;
    scaleMax: number;
  },
  basisSectionKeys?: string[]
) {
  if (utilityKeys.length === 0) {
    return [];
  }

  const questionBank = buildVendorProductQuestions(utilityKeys);
  const grouped = new Map<
    string,
    { title: string; scores: number[]; questionIds: string[] }
  >();

  for (const question of questionBank) {
    if (
      basisSectionKeys &&
      basisSectionKeys.length > 0 &&
      (!question.section.basisKey || !basisSectionKeys.includes(question.section.basisKey))
    ) {
      continue;
    }

    const rawAnswer = vendorResponses.answers[question.id];
    if (typeof rawAnswer !== "number") {
      continue;
    }
    const normalizedScore = normalizeStoredAnswer(
      rawAnswer,
      vendorResponses.scaleMin,
      vendorResponses.scaleMax
    );
    if (normalizedScore === null) {
      continue;
    }

    const existing = grouped.get(question.section.key) ?? {
      title: question.section.title,
      scores: [],
      questionIds: [],
    };
    existing.scores.push(normalizedScore);
    existing.questionIds.push(question.id);
    grouped.set(question.section.key, existing);
  }

  return Array.from(grouped.entries()).map(([key, value]) => ({
    key,
    title: value.title,
    averageScore: average(value.scores),
    questionCount: value.questionIds.length,
  }));
}

function buildFirmUtilityEvidence(
  utilityKeys: string[],
  firmResponseSets: Array<{
    answers: Record<string, number>;
    scaleMin: number;
    scaleMax: number;
  }>
) {
  const questionBank = buildFirmProductQuestions(utilityKeys);
  const scoresByUtility = new Map<string, { label: string; scores: number[] }>();

  for (const question of questionBank) {
    scoresByUtility.set(question.utilityKey, {
      label: question.utilityLabel,
      scores: [],
    });
  }

  for (const responseSet of firmResponseSets) {
    for (const question of questionBank) {
      const rawAnswer = responseSet.answers[question.id];
      if (typeof rawAnswer !== "number") {
        continue;
      }
      const normalizedScore = normalizeStoredAnswer(
        rawAnswer,
        responseSet.scaleMin,
        responseSet.scaleMax
      );
      if (normalizedScore === null) {
        continue;
      }
      scoresByUtility.get(question.utilityKey)?.scores.push(normalizedScore);
    }
  }

  return utilityKeys.map((utilityKey) => {
    const entry = scoresByUtility.get(utilityKey);
    return {
      utilityKey,
      utilityLabel: entry?.label ?? utilityKey,
      averageScore: average(entry?.scores ?? []),
      responseCount: entry?.scores.length ?? 0,
    };
  });
}

function sortScoredSections(sections: VendorSectionEvidence[]) {
  return [...sections]
    .filter((section) => section.averageScore !== null)
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
}

function sortScoredUtilities(utilities: UtilityEvidence[]) {
  return [...utilities]
    .filter((utility) => utility.averageScore !== null)
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
}

function buildInsightRecord(input: {
  definition: ProductInsightDefinition;
  vendorScore: number | null;
  firmAssessmentCount: number;
  firmAverageScore: number | null;
  divergence: VendorProductInsightSnapshot["divergence"];
  confidenceBand: "no_signal" | "sample_thin" | "emerging" | "grounded";
  confidenceLabel: string;
  utilityKeys: string[];
  vendorResponses: {
    answers: Record<string, number>;
    scaleMin: number;
    scaleMax: number;
  };
  firmUtilityEvidence: UtilityEvidence[];
  confidenceCaveats: string[];
}) {
  const vendorSectionEvidence = buildVendorSectionEvidence(
    input.utilityKeys,
    input.vendorResponses,
    input.definition.basisSectionKeys
  );
  const strongestVendorSections = sortScoredSections(vendorSectionEvidence).slice(0, 2);
  const weakestVendorSections = [...sortScoredSections(vendorSectionEvidence)]
    .reverse()
    .slice(0, 2);
  const strongestFirmUtilities = sortScoredUtilities(input.firmUtilityEvidence).slice(0, 2);
  const weakestFirmUtilities = [...sortScoredUtilities(input.firmUtilityEvidence)]
    .reverse()
    .slice(0, 2);

  const sectionSummary =
    strongestVendorSections.length > 0
      ? `Strongest vendor self-reported sections: ${strongestVendorSections
          .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
          .join(", ")}.`
      : "Vendor self-reported section evidence is not populated yet.";

  const weakSectionSummary =
    weakestVendorSections.length > 0
      ? `Weakest vendor self-reported sections: ${weakestVendorSections
          .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
          .join(", ")}.`
      : "";

  const firmUtilitySummary =
    strongestFirmUtilities.length > 0
      ? `Firm-reviewed utility signal: strongest in ${strongestFirmUtilities
          .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
          .join(", ")}; weakest in ${weakestFirmUtilities
          .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
          .join(", ")}.`
      : "Firm-reviewed utility signal is not yet rich enough to separate utilities cleanly.";

  const currentStateSummary =
    input.vendorScore === null && input.firmAverageScore === null
      ? `${input.definition.title} cannot be grounded yet because neither vendor self-reported signal nor firm-reviewed signal is present.`
      : `${input.definition.title} currently reads vendor self-reported signal at ${formatScore(
          input.vendorScore
        )}, firm-reviewed signal at ${formatScore(
          input.firmAverageScore
        )}, and uses their current relationship as part of the PAT interpretation.`;

  return {
    key: input.definition.key,
    title: input.definition.title,
    confidenceBand: input.confidenceBand,
    confidenceLabel: input.confidenceLabel,
    what: `${input.definition.what} Vendor self-reported signal and firm-reviewed signal stay explicitly separate inside this view.`,
    why:
      input.firmAssessmentCount > 0
        ? `${input.definition.why} PAT also checks whether firms are confirming or challenging the vendor self-view.`
        : `${input.definition.why} Firm-reviewed signal is still absent, so PAT cannot yet test whether buyers are confirming the vendor self-view.`,
    how:
      input.divergence.points === null
        ? `${input.definition.how} Use the vendor self-reported sections as a current posture readout, then wait for more firm reviews before treating the picture as externally confirmed.`
        : `${input.definition.how} The current divergence is ${Math.abs(
            input.divergence.points
          )} points, so use the section evidence and firm utility evidence together when deciding whether the current product story is calibrated.`,
    currentStateSummary,
    exactAssessmentBasis: [
      `Vendor self-reported signal: ${formatScore(input.vendorScore)} from the latest vendor product assessment.`,
      `Firm-reviewed signal: ${formatScore(input.firmAverageScore)} across ${input.firmAssessmentCount} firm assessment${
        input.firmAssessmentCount === 1 ? "" : "s"
      }.`,
      `Utility scope: ${describeUtilityScope(input.utilityKeys, getVendorUtilityLabels(input.utilityKeys))}.`,
      `Combined current PAT readout: ${input.divergence.label}.`,
      sectionSummary,
      weakSectionSummary,
      firmUtilitySummary,
    ]
      .filter(Boolean)
      .join(" "),
    vendorSectionEvidence,
    strongestVendorSections,
    weakestVendorSections,
    strongestFirmUtilities,
    weakestFirmUtilities,
    confidenceCaveats: input.confidenceCaveats,
  } satisfies VendorProductInsightRecord;
}

export function buildVendorProductInsightSnapshot(
  input: VendorProductInsightSnapshotInput
): VendorProductInsightSnapshot {
  const utilityLabels = getVendorUtilityLabels(input.product.utilityKeys);
  const vendorSectionEvidence = buildVendorSectionEvidence(
    input.product.utilityKeys,
    input.vendorSelfReported.responses
  );
  const firmUtilityEvidence = buildFirmUtilityEvidence(
    input.product.utilityKeys,
    input.firmReviewed.responseSets
  );
  const firmAverageScore =
    typeof input.firmReviewed.averageScore === "number"
      ? input.firmReviewed.averageScore
      : average(
          firmUtilityEvidence.flatMap((utility) =>
            typeof utility.averageScore === "number" ? [utility.averageScore] : []
          )
        );
  const divergence = summarizeDivergence(input.vendorSelfReported.latestScore, firmAverageScore);
  const confidence = getConfidenceBand({
    vendorScore: input.vendorSelfReported.latestScore,
    firmAssessmentCount: input.firmReviewed.assessmentCount,
  });
  const confidenceCaveats = buildConfidenceCaveats({
    utilityKeys: input.product.utilityKeys,
    vendorScore: input.vendorSelfReported.latestScore,
    vendorSectionCount: vendorSectionEvidence.length,
    firmAssessmentCount: input.firmReviewed.assessmentCount,
    firmAverageScore,
    firmUtilityCount: firmUtilityEvidence.filter((utility) => utility.averageScore !== null).length,
    divergencePoints: divergence.points,
  });
  const utilityScopeLabel = describeUtilityScope(input.product.utilityKeys, utilityLabels);

  const insightRecords = PRODUCT_TIER1_INSIGHTS.map((definition) =>
    buildInsightRecord({
      definition,
      vendorScore: input.vendorSelfReported.latestScore,
      firmAssessmentCount: input.firmReviewed.assessmentCount,
      firmAverageScore,
      divergence,
      confidenceBand: confidence.band,
      confidenceLabel: confidence.label,
      utilityKeys: input.product.utilityKeys,
      vendorResponses: input.vendorSelfReported.responses,
      firmUtilityEvidence,
      confidenceCaveats,
    })
  );

  const snapshot = {
    product: {
      id: input.product.id,
      name: input.product.name,
      summary: input.product.summary,
      utilityKeys: input.product.utilityKeys,
      utilityLabels,
      utilityScopeLabel,
    },
    vendorAssessmentStatus: input.vendorAssessmentStatus,
    vendorSelfReported: {
      latestScore: input.vendorSelfReported.latestScore,
      submittedAt: input.vendorSelfReported.submittedAt,
      sectionEvidence: vendorSectionEvidence,
    },
    firmReviewed: {
      assessmentCount: input.firmReviewed.assessmentCount,
      averageScore: firmAverageScore,
      latestSubmittedAt: input.firmReviewed.latestSubmittedAt,
      utilityEvidence: firmUtilityEvidence,
    },
    divergence,
    latestUpdatedAt:
      [input.vendorSelfReported.submittedAt, input.firmReviewed.latestSubmittedAt]
        .filter((value): value is Date => value instanceof Date)
        .sort((left, right) => right.getTime() - left.getTime())[0] ?? null,
    confidenceBand: confidence.band,
    confidenceLabel: confidence.label,
    confidenceSummary: confidence.summary,
    combinedCurrentPatReadout: describeCombinedReadout({
      productName: input.product.name,
      vendorScore: input.vendorSelfReported.latestScore,
      firmAssessmentCount: input.firmReviewed.assessmentCount,
      firmAverageScore,
      divergenceLabel: divergence.label,
    }),
    confidenceCaveats,
    insightRecords,
  } satisfies VendorProductInsightSnapshot;

  recordPatDiagnostic({
    area: "vendor_product",
    level: input.firmReviewed.assessmentCount < 4 ? "warn" : "info",
    status: input.firmReviewed.assessmentCount < 4 ? "warn" : "ok",
    summary: "Vendor product insight snapshot generated.",
    details: {
      completedVendorAssessment: input.vendorAssessmentStatus.completed,
      vendorSignalPresent: input.vendorSelfReported.latestScore !== null,
      firmAssessmentCount: input.firmReviewed.assessmentCount,
      lowSample: input.firmReviewed.assessmentCount < 4,
      divergencePoints: divergence.points,
    },
  });

  return snapshot;
}

export function canOpenVendorProductInsight(
  status: Pick<VendorProductInsightSnapshot["vendorAssessmentStatus"], "completed">
) {
  return status.completed === true;
}

export function filterVendorProductInsightCatalogToCompleted(
  snapshots: readonly VendorProductInsightSnapshot[]
) {
  return snapshots.filter((snapshot) => canOpenVendorProductInsight(snapshot.vendorAssessmentStatus));
}

export function buildVendorProductProInsightCards(
  snapshot: VendorProductInsightSnapshot
): VendorProductInsightDetailCard[] {
  return snapshot.insightRecords.map((insight) => ({
    key: insight.key,
    title: insight.title,
    summary: insight.currentStateSummary,
    tone: "active" as const,
    href: `/vendor/product-insight/${snapshot.product.id}/${insight.key}`,
    interactive: true,
    supportingText:
      insight.strongestVendorSections.length > 0
        ? `Strongest current sections: ${insight.strongestVendorSections
            .map((section) => section.title)
            .join(", ")}`
        : "No clear section separation yet.",
  }));
}

export function buildVendorProductEliteInsightCards() {
  return PRODUCT_TIER2_INSIGHTS.map((insight) => {
    const content = getVendorProductInsightContent(insight.key);

    return {
      key: insight.key,
      title: insight.title,
      summary:
        content?.lockedState?.summary ??
        `${ELITE_PLACEHOLDER_TITLE}.`,
      statusLabel: ELITE_PLACEHOLDER_TITLE,
      tone: "locked" as const,
      href: null,
      interactive: false,
      supportingText: content?.lockedState?.disclaimer ?? ELITE_PLACEHOLDER_CTA,
    } satisfies VendorProductInsightDetailCard;
  });
}

export function buildVendorProductInsightDetailSurfaceCards(input: {
  snapshot: VendorProductInsightSnapshot;
  insightKey: string;
  record: VendorProductInsightRecord | null;
  locked: boolean;
}) {
  const content = getVendorProductInsightContent(input.insightKey);
  const lockedState = content?.lockedState;
  const baseHref = `/vendor/product-insight/${input.snapshot.product.id}/${input.insightKey}`;
  const vendorEvidenceCount = input.record?.vendorSectionEvidence.length ?? 0;
  const firmEvidenceCount = input.snapshot.firmReviewed.utilityEvidence.filter(
    (utility) => utility.averageScore !== null
  ).length;

  const surfaces: VendorProductInsightDetailSurfaceCard[] = [
    {
      key: "help",
      title: "Help",
      summary: input.locked
        ? lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE
        : input.record?.currentStateSummary ?? input.snapshot.combinedCurrentPatReadout,
      href: `${baseHref}?surface=help`,
      interactive: true,
    },
    {
      key: "evidence",
      title: "Evidence",
      summary:
        input.record || vendorEvidenceCount > 0 || firmEvidenceCount > 0
          ? "Review the vendor section evidence alongside the firm-reviewed utility evidence behind this readout."
          : input.snapshot.combinedCurrentPatReadout,
      href: `${baseHref}?surface=evidence`,
      interactive: true,
    },
  ];

  return surfaces;
}

function summarizeVendorEvidence(record: VendorProductInsightRecord | null) {
  if (!record?.vendorSectionEvidence.length) {
    return "No vendor-reported section evidence is populated yet for this product.";
  }

  const strongest =
    record.strongestVendorSections.length > 0
      ? `Strongest right now: ${record.strongestVendorSections
          .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
          .join(", ")}.`
      : "";
  const weakest =
    record.weakestVendorSections.length > 0
      ? `Weakest right now: ${record.weakestVendorSections
          .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
          .join(", ")}.`
      : "";

  return [
    `PAT currently separates ${record.vendorSectionEvidence.length} vendor-reported section${
      record.vendorSectionEvidence.length === 1 ? "" : "s"
    } for this product.`,
    strongest,
    weakest,
  ]
    .filter(Boolean)
    .join(" ");
}

function summarizeFirmEvidence(snapshot: VendorProductInsightSnapshot, record: VendorProductInsightRecord | null) {
  const groundedUtilities = snapshot.firmReviewed.utilityEvidence.filter(
    (utility) => utility.averageScore !== null
  );

  if (!groundedUtilities.length) {
    return "Firm-reviewed evidence is still too thin to separate utility-level strengths and weaknesses cleanly.";
  }

  const strongest =
    record?.strongestFirmUtilities.length
      ? `Strongest right now: ${record.strongestFirmUtilities
          .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
          .join(", ")}.`
      : "";
  const weakest =
    record?.weakestFirmUtilities.length
      ? `Weakest right now: ${record.weakestFirmUtilities
          .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
          .join(", ")}.`
      : "";

  return [
    `Firm-reviewed signal is grounded across ${groundedUtilities.length} utilit${
      groundedUtilities.length === 1 ? "y" : "ies"
    } and ${snapshot.firmReviewed.assessmentCount} assessment${
      snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"
    }.`,
    strongest,
    weakest,
  ]
    .filter(Boolean)
    .join(" ");
}

function summarizeCurrentLimits(snapshot: VendorProductInsightSnapshot, record: VendorProductInsightRecord | null) {
  const caveats = (record?.confidenceCaveats ?? snapshot.confidenceCaveats).slice(0, 2);
  return [snapshot.confidenceSummary, ...caveats].filter(Boolean).join(" ");
}

export function buildVendorProductInsightDetailSurfaceContent(input: {
  snapshot: VendorProductInsightSnapshot;
  insightKey: string;
  record: VendorProductInsightRecord | null;
  surface: VendorProductInsightDetailSurfaceKey;
  locked: boolean;
}) {
  const content = getVendorProductInsightContent(input.insightKey);
  const lockedState = content?.lockedState;

  switch (input.surface) {
    case "help":
      return buildHelpSurfaceContent<VendorProductInsightDetailSurfaceKey>({
        key: "help",
        intro: input.locked
          ? lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE
          : input.record?.currentStateSummary ?? input.snapshot.combinedCurrentPatReadout,
        what: input.locked
          ? lockedState?.what ?? content?.what ?? "Coming soon."
          : input.record?.what ?? content?.what ?? "No product-intelligence explanation is available yet.",
        why: input.locked
          ? lockedState?.why ?? content?.why ?? ELITE_PLACEHOLDER_CTA
          : input.record?.why ?? content?.why ?? "No product-intelligence rationale is available yet.",
        how: input.locked
          ? lockedState?.how ?? content?.how ?? ELITE_PLACEHOLDER_CTA
          : input.record?.how ?? content?.how ?? "No product-intelligence use guidance is available yet.",
      });
    case "evidence":
      return {
        key: "evidence",
        title: "Evidence",
        intro: input.locked
          ? "PAT can still show the current product evidence here, even while the deeper Elite interpretation remains locked."
          : "PAT keeps the lower surface focused on the evidence that supports this product readout today.",
        items: [
          {
            title: "Current PAT picture",
            body: [
              input.snapshot.combinedCurrentPatReadout,
              `Utility scope: ${input.snapshot.product.utilityScopeLabel}.`,
              `Vendor self-reported signal: ${formatScore(input.snapshot.vendorSelfReported.latestScore)}.`,
              `Firm-reviewed signal: ${formatScore(input.snapshot.firmReviewed.averageScore)} across ${
                input.snapshot.firmReviewed.assessmentCount
              } assessment${input.snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}.`,
            ].join(" "),
          },
          {
            title: "Vendor-reported evidence",
            body: summarizeVendorEvidence(input.record),
          },
          {
            title: "Firm-reviewed evidence",
            body: summarizeFirmEvidence(input.snapshot, input.record),
          },
          {
            title: input.locked ? "Why the deeper view is still locked" : "Current limits",
            body: input.locked
              ? `${summarizeCurrentLimits(input.snapshot, input.record)} ${lockedState?.disclaimer ?? ELITE_PLACEHOLDER_CTA}.`
              : summarizeCurrentLimits(input.snapshot, input.record),
          },
        ],
      } satisfies VendorProductInsightDetailSurfaceContent;
    default:
      return buildHelpSurfaceContent<VendorProductInsightDetailSurfaceKey>({
        key: "help",
        intro: input.locked
          ? lockedState?.summary ?? "Coming soon. Unlock with Elite membership."
          : input.record?.currentStateSummary ?? input.snapshot.combinedCurrentPatReadout,
        what: input.locked
          ? lockedState?.what ?? content?.what ?? "Coming soon."
          : input.record?.what ?? content?.what ?? "No product-intelligence explanation is available yet.",
        why: input.locked
          ? lockedState?.why ?? content?.why ?? "Unlock with Elite membership."
          : input.record?.why ?? content?.why ?? "No product-intelligence rationale is available yet.",
        how: input.locked
          ? lockedState?.how ?? content?.how ?? "Unlock with Elite membership."
          : input.record?.how ?? content?.how ?? "No product-intelligence use guidance is available yet.",
      });
  }
}

export async function getVendorProductInsightSnapshot(companyId: string, productId: string) {
  const vendorContext = await getVendorCompanyContext(companyId);
  const product = vendorContext.products.find((entry) => entry.id === productId);
  if (!product || !vendorContext.company) {
    return null;
  }

  if (vendorContext.compatibilityMode) {
    recordPatDiagnostic({
      area: "db_compat",
      level: "warn",
      status: "compat",
      summary: "Vendor product insight is running in compatibility mode.",
      details: {
        hasProducts: vendorContext.products.length > 0,
      },
    });
  }

  const utilityKeys = extractUtilityKeysFromSignals(product.signals);

  const [vendorModule, firmModule] = await Promise.all([
    prisma.surveyModule.findUnique({
      where: { key: VENDOR_PRODUCT_MODULE_KEY },
      select: { id: true },
    }).catch(() => null),
    prisma.surveyModule.findUnique({
      where: { key: FIRM_PRODUCT_MODULE_KEY },
      select: { id: true },
    }).catch(() => null),
  ]);

  const [latestVendorSubmission, firmSubmissions] = await Promise.all([
    vendorModule
      ? prisma.surveySubmission.findFirst({
          where: getSurveyFinalWhere({
            moduleId: vendorModule.id,
            companyId,
            Subject: { productId },
          }),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            score: true,
            createdAt: true,
            answeredCount: true,
            answers: true,
            scaleMin: true,
            scaleMax: true,
          },
        }).catch(() => null)
      : Promise.resolve(null),
    firmModule
      ? prisma.surveySubmission.findMany({
          where: getSurveyFinalWhere({
            moduleId: firmModule.id,
            Subject: { productId },
            Company: { type: "FIRM" },
          }),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            score: true,
            createdAt: true,
            answers: true,
            scaleMin: true,
            scaleMax: true,
          },
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const vendorAssessmentStatus = deriveVendorProductAssessmentCompletionStatus({
    latestSubmission: latestVendorSubmission
      ? {
          id: latestVendorSubmission.id,
          score: latestVendorSubmission.score,
          createdAt: latestVendorSubmission.createdAt,
          answeredCount: latestVendorSubmission.answeredCount,
          answers: latestVendorSubmission.answers,
        }
      : null,
  });

  if (!canOpenVendorProductInsight(vendorAssessmentStatus)) {
    recordPatDiagnostic({
      area: "vendor_product",
      level: "info",
      status: "warn",
      summary: "Vendor product insight blocked until a completed final vendor product assessment exists.",
      details: {
        productId,
        latestVendorSubmissionId: vendorAssessmentStatus.latestSubmissionId,
        statusLabel: vendorAssessmentStatus.statusLabel,
        reason: vendorAssessmentStatus.reason,
      },
    });

    return null;
  }

  const vendorScale = resolveStoredProductAssessmentScale(
    latestVendorSubmission?.scaleMin,
    latestVendorSubmission?.scaleMax
  );
  const vendorResponses = {
    answers: extractResponses(latestVendorSubmission?.answers),
    scaleMin: vendorScale.scaleMin,
    scaleMax: vendorScale.scaleMax,
  };
  const firmResponseSets = firmSubmissions.map((submission) => {
    const storedScale = resolveStoredProductAssessmentScale(submission.scaleMin, submission.scaleMax);
    return {
      answers: extractResponses(submission.answers),
      scaleMin: storedScale.scaleMin,
      scaleMax: storedScale.scaleMax,
    };
  });
  return buildVendorProductInsightSnapshot({
    product: {
      id: product.id,
      name: product.name,
      summary: product.summary,
      utilityKeys:
        vendorAssessmentStatus.utilityKeys.length > 0
          ? vendorAssessmentStatus.utilityKeys
          : utilityKeys,
    },
    vendorAssessmentStatus: {
      completed: vendorAssessmentStatus.completed,
      latestSubmittedAt: vendorAssessmentStatus.latestSubmittedAt,
      statusLabel: vendorAssessmentStatus.statusLabel,
      reason: vendorAssessmentStatus.reason,
    },
    vendorSelfReported: {
      latestScore: latestVendorSubmission?.score ?? null,
      submittedAt: latestVendorSubmission?.createdAt ?? null,
      responses: vendorResponses,
    },
    firmReviewed: {
      assessmentCount: firmSubmissions.length,
      latestSubmittedAt: firmSubmissions[0]?.createdAt ?? null,
      averageScore: average(firmSubmissions.map((submission) => submission.score)),
      responseSets: firmResponseSets,
    },
  });
}

export async function getVendorProductInsightCatalog(
  companyId: string
): Promise<VendorProductInsightSnapshot[]> {
  const vendorContext = await getVendorCompanyContext(companyId);
  const snapshots = await Promise.all(
    vendorContext.products.map((product) => getVendorProductInsightSnapshot(companyId, product.id))
  );

  const catalog: VendorProductInsightSnapshot[] = [];
  for (const snapshot of snapshots) {
    if (snapshot) {
      catalog.push(snapshot);
    }
  }
  return filterVendorProductInsightCatalogToCompleted(catalog);
}
