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
import { getVendorScopedFirms } from "@/lib/tenancy";
import {
  DIMENSION_KEY_BY_BASIS,
  PRODUCT_FIT_DIMENSIONS,
  type ProductFitDimensionScore,
} from "@/lib/productFitDimensions";
import { confidenceBandForSampleSize } from "@/lib/confidenceBands";
import { scoreBandFor } from "@/lib/bandLexicon";
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
export type VendorProductInsightDetailSurfaceKey = "help" | "evidence" | "elite";

export type VendorProductInsightDetailCard = {
  key: string;
  title: string;
  summary: string;
  statusLabel?: string;
  tone: "active" | "locked";
  href: string | null;
  interactive: boolean;
  supportingText: string | null;
  metric?: { value: string; caption: string };
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
    category: string | null;
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
    /** Vendor self-reported answers rolled into the five product-fit dimensions. */
    dimensionEvidence: ProductFitDimensionScore[];
  };
  firmReviewed: {
    assessmentCount: number;
    averageScore: number | null;
    latestSubmittedAt: Date | null;
    utilityEvidence: UtilityEvidence[];
    /** Firm-review answers (cross-scoped-firm) rolled into the product-fit dimensions. */
    dimensionEvidence: ProductFitDimensionScore[];
  };
  divergence: {
    points: number | null;
    label: string;
    /** True when firm reviews are below the sample floor — gap is an early signal, not a divergence. */
    belowFloor: boolean;
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
    category?: string | null;
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
    case "help":
      return "help";
    // B8-8: vendor product intelligence has no real Elite layer yet, so there is
    // no Elite mode — an ?mode=elite URL coerces to Pro (no toggle renders it).
    case "pro":
    case "elite":
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
    case "elite":
      return "elite";
    case "evidence":
    case "basis":
    case "vendor-evidence":
    case "firm-evidence":
    case "confidence":
      return "evidence";
    default:
      // Block 11d: default to the data (evidence) pane, not Help — clicking a
      // product-insight card should land on the grounded readout, not the
      // help copy.
      return "evidence";
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
    input.firmAverageScore !== null &&
    // Divergence sample floor (CLASS 2): don't assert a calibration gap on an
    // anecdote — below the floor the gap is an early signal, not a divergence.
    input.firmAssessmentCount >= DIVERGENCE_MIN_FIRM_REVIEWS
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
    return "No declared feature scope";
  }

  return `${utilityKeys.length} declared feature${utilityKeys.length === 1 ? "" : "s"}: ${utilityLabels.join(", ")}`;
}

function getConfidenceBand(input: {
  vendorScore: number | null;
  firmAssessmentCount: number;
}) {
  if (input.vendorScore === null && input.firmAssessmentCount === 0) {
    return {
      band: "no_signal" as const,
      label: "No signal",
      summary:
        "Neither vendor self-reported signal nor firm-reviewed signal is available yet, so this remains an ungrounded placeholder.",
    };
  }
  // Vendor-only or a single firm review is always early-signal sample_thin —
  // there IS vendor signal (past the both-null guard), so it is never no_signal.
  if (input.firmAssessmentCount <= 1) {
    return {
      band: "sample_thin" as const,
      label: "Early signal",
      summary:
        "Firm-reviewed signal is absent or very thin, so the combined readout should be treated as early current-state signal rather than strong confirmation.",
    };
  }
  // CLASS 3: band boundaries (for ≥2 firm reviews) come from the ONE shared
  // definition; the copy below is product-engine-specific but keyed off the band.
  const band = confidenceBandForSampleSize(input.firmAssessmentCount);
  if (band === "sample_thin") {
    return {
      band,
      label: "Early signal",
      summary: `Firm-reviewed signal is based on ${input.firmAssessmentCount} assessments, so this remains sample-thin rather than broadly confirmed.`,
    };
  }
  if (band === "emerging") {
    return {
      band,
      label: "Early signal",
      summary: `Firm-reviewed signal is based on ${input.firmAssessmentCount} assessments and is useful for current-state interpretation, but still sample-thin.`,
    };
  }
  return {
    band: "grounded" as const,
    label: "Grounded",
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

/**
 * Minimum firm reviews before PAT will assert a divergence (2026-07-09 audit,
 * CLASS 2). One reviewer is an anecdote, not a divergence — below the floor the
 * copy says "early signal · N reviews" and no divergence direction is claimed.
 */
export const DIVERGENCE_MIN_FIRM_REVIEWS = 3;

function summarizeDivergence(
  vendorScore: number | null,
  firmAverageScore: number | null,
  firmAssessmentCount: number
) {
  if (vendorScore === null || firmAverageScore === null) {
    return {
      points: null,
      label: "Not enough shared signal yet",
      belowFloor: false,
    };
  }

  const points = round1(vendorScore - firmAverageScore);

  // Sample floor: below the minimum, report the gap as an early signal only —
  // never as a directional "divergence" assertion.
  if (firmAssessmentCount < DIVERGENCE_MIN_FIRM_REVIEWS) {
    return {
      points,
      label: `Early signal · ${firmAssessmentCount} firm review${
        firmAssessmentCount === 1 ? "" : "s"
      } — too few to read divergence`,
      belowFloor: true,
    };
  }

  if (Math.abs(points) < 5) {
    return { points, label: "Vendor self-view and firm review are closely aligned", belowFloor: false };
  }
  if (points > 0) {
    return { points, label: "Vendor self-view is running above firm-reviewed signal", belowFloor: false };
  }
  return { points, label: "Firm-reviewed signal is running above vendor self-view", belowFloor: false };
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

type ProductResponseSet = {
  answers: Record<string, number>;
  scaleMin: number;
  scaleMax: number;
};

/**
 * Roll a product's per-question review answers into the five product-fit
 * dimensions (P0 radar). Each question carries a `basisKey`; we normalize each
 * answered response to 0–100 and average it into the dimension its basis rolls
 * up to. `perspective` selects the firm-side or vendor-side question bank so the
 * question ids match the stored answer keys. Dimensions with no answered
 * questions come back `score: null, sampleSize: 0` — the caller renders those as
 * a confidence-band ("no signal") axis, never a fabricated movement.
 */
export function buildProductFitDimensions(
  utilityKeys: string[],
  responseSets: ProductResponseSet[],
  perspective: "firm" | "vendor"
): ProductFitDimensionScore[] {
  const questions =
    perspective === "firm"
      ? buildFirmProductQuestions(utilityKeys)
      : buildVendorProductQuestions(utilityKeys);

  const scoresByDimension = new Map<string, number[]>(
    PRODUCT_FIT_DIMENSIONS.map((dimension) => [dimension.key, [] as number[]])
  );

  for (const question of questions) {
    const basisKey = question.section?.basisKey;
    if (!basisKey) continue;
    const dimensionKey = DIMENSION_KEY_BY_BASIS[basisKey];
    if (!dimensionKey) continue;
    const bucket = scoresByDimension.get(dimensionKey);
    if (!bucket) continue;
    for (const responseSet of responseSets) {
      const rawAnswer = responseSet.answers[question.id];
      if (typeof rawAnswer !== "number") continue;
      const normalizedScore = normalizeStoredAnswer(
        rawAnswer,
        responseSet.scaleMin,
        responseSet.scaleMax
      );
      if (normalizedScore === null) continue;
      bucket.push(normalizedScore);
    }
  }

  return PRODUCT_FIT_DIMENSIONS.map((dimension) => {
    const scores = scoresByDimension.get(dimension.key) ?? [];
    return {
      key: dimension.key,
      title: dimension.title,
      score: average(scores),
      sampleSize: scores.length,
    };
  });
}

/**
 * This-firm product-fit dimensions for a set of the firm's own reviewed
 * products (Alignment Sandbox stack). Unlike the snapshot's cross-scoped-firm
 * `firmReviewed.dimensionEvidence`, this is scoped to a single firm's own review
 * submissions, so the stack radar reflects THIS firm's posture. Returns a map
 * keyed by productId; products the firm hasn't reviewed are simply absent.
 *
 * Tenancy: the caller MUST authorize `firmCompanyId` first; every submission
 * queried here is keyed by that company id.
 */
export async function getFirmProductFitDimensionsByProduct(
  firmCompanyId: string,
  products: Array<{ id: string; utilityKeys: string[] }>
): Promise<Map<string, ProductFitDimensionScore[]>> {
  const result = new Map<string, ProductFitDimensionScore[]>();
  if (products.length === 0) {
    return result;
  }

  const firmModule = await prisma.surveyModule
    .findUnique({ where: { key: FIRM_PRODUCT_MODULE_KEY }, select: { id: true } })
    .catch(() => null);
  if (!firmModule) {
    return result;
  }

  const productIds = products.map((product) => product.id);
  const submissions = await prisma.surveySubmission
    .findMany({
      where: getSurveyFinalWhere({
        moduleId: firmModule.id,
        companyId: firmCompanyId,
        Subject: { productId: { in: productIds } },
      }),
      select: {
        answers: true,
        scaleMin: true,
        scaleMax: true,
        Subject: { select: { productId: true } },
      },
    })
    .catch(() => []);

  const responsesByProduct = new Map<string, ProductResponseSet[]>();
  for (const submission of submissions) {
    const productId = submission.Subject?.productId;
    if (!productId) continue;
    const storedScale = resolveStoredProductAssessmentScale(submission.scaleMin, submission.scaleMax);
    const set: ProductResponseSet = {
      answers: extractResponses(submission.answers),
      scaleMin: storedScale.scaleMin,
      scaleMax: storedScale.scaleMax,
    };
    const existing = responsesByProduct.get(productId) ?? [];
    existing.push(set);
    responsesByProduct.set(productId, existing);
  }

  for (const product of products) {
    const responseSets = responsesByProduct.get(product.id);
    if (!responseSets || responseSets.length === 0) continue;
    result.set(product.id, buildProductFitDimensions(product.utilityKeys, responseSets, "firm"));
  }

  return result;
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
          )} points, so use the section evidence and firm feature evidence together when deciding whether the current product story is calibrated.`,
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
  const firmDimensionEvidence = buildProductFitDimensions(
    input.product.utilityKeys,
    input.firmReviewed.responseSets,
    "firm"
  );
  const vendorDimensionEvidence = buildProductFitDimensions(
    input.product.utilityKeys,
    [input.vendorSelfReported.responses],
    "vendor"
  );
  const firmAverageScore =
    typeof input.firmReviewed.averageScore === "number"
      ? input.firmReviewed.averageScore
      : average(
          firmUtilityEvidence.flatMap((utility) =>
            typeof utility.averageScore === "number" ? [utility.averageScore] : []
          )
        );
  const divergence = summarizeDivergence(
    input.vendorSelfReported.latestScore,
    firmAverageScore,
    input.firmReviewed.assessmentCount
  );
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
      category: input.product.category ?? null,
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
      dimensionEvidence: vendorDimensionEvidence,
    },
    firmReviewed: {
      assessmentCount: input.firmReviewed.assessmentCount,
      averageScore: firmAverageScore,
      latestSubmittedAt: input.firmReviewed.latestSubmittedAt,
      utilityEvidence: firmUtilityEvidence,
      dimensionEvidence: firmDimensionEvidence,
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

export type VendorProductGapCallout = {
  points: number | null;
  /** Full directional callout for the detail hero, e.g. "9.5 pt divergence · firms read…". */
  label: string;
  /** Concise magnitude for compact product cards, e.g. "9.5 pt divergence" (B7-3). */
  magnitudeLabel: string;
};

/**
 * Divergence chip copy for the DivergenceBar hero and product cards, e.g.
 * "9.5 pt divergence · firms read this product lower than the vendor story".
 */
export function buildVendorProductGapCallout(
  snapshot: Pick<VendorProductInsightSnapshot, "divergence">
): VendorProductGapCallout {
  const points = snapshot.divergence.points;
  if (points === null) {
    return { points: null, label: "Not enough shared signal yet", magnitudeLabel: "No divergence yet" };
  }
  const magnitude = Math.round(Math.abs(points) * 10) / 10;
  const magnitudeLabel = `${magnitude} pt divergence`;
  if (Math.abs(points) < 5) {
    return { points, label: `${magnitudeLabel} · vendor story and firm reviews closely aligned`, magnitudeLabel };
  }
  if (points > 0) {
    return { points, label: `${magnitudeLabel} · firms read this product lower than the vendor story`, magnitudeLabel };
  }
  return { points, label: `${magnitudeLabel} · firms read this product higher than the vendor story`, magnitudeLabel };
}

export type VendorProductPlainLanguage = {
  summary: string;
  nextSteps: string[];
};

/**
 * Zero-context "What this means for your product" copy, vendor point of view.
 * Stays on current-state evidence only — no benchmark, percentile, market
 * ranking, projection, or forecast claims (CLAUDE.md hard rule).
 */
export function buildVendorProductPlainLanguage(
  snapshot: VendorProductInsightSnapshot,
  record: VendorProductInsightRecord | null
): VendorProductPlainLanguage | null {
  const vendorScore = snapshot.vendorSelfReported.latestScore;
  const firmScore = snapshot.firmReviewed.averageScore;
  if (vendorScore === null && firmScore === null) {
    return null;
  }

  const productName = snapshot.product.name;
  const assessmentCount = snapshot.firmReviewed.assessmentCount;
  const assessmentNoun = `${assessmentCount} firm review${assessmentCount === 1 ? "" : "s"}`;
  const sections = record?.vendorSectionEvidence ?? snapshot.vendorSelfReported.sectionEvidence;
  const weakestSection = sortScoredSections(sections).at(-1) ?? null;
  const sentences: string[] = [];

  if (vendorScore !== null && firmScore !== null) {
    const points = snapshot.divergence.points ?? round1(vendorScore - firmScore);
    const magnitude = Math.round(Math.abs(points) * 10) / 10;
    sentences.push(
      `${productName} reads ${Math.round(vendorScore)}% in your self-assessment and ${Math.round(firmScore)}% across ${assessmentNoun} — a ${magnitude}-point divergence.`
    );
    if (Math.abs(points) < 5) {
      sentences.push(
        "Firms are broadly confirming the self-view, which means the current product story is holding up in front of the people using it."
      );
    } else if (points > 0) {
      sentences.push(
        "Firms are currently reading the product lower than the vendor story, which means the self-view is running ahead of what reviewers can see in day-to-day operation."
      );
    } else {
      sentences.push(
        "Firms are currently reading the product higher than the vendor story — reviewers are confirming more operational value than the self-assessment claims."
      );
    }
  } else if (vendorScore !== null) {
    sentences.push(
      `${productName} reads ${Math.round(vendorScore)}% in your self-assessment, and no firm has reviewed it yet.`
    );
    sentences.push(
      "Until firm reviews arrive, this is a vendor-authored story without buyer confirmation, so treat every claim in it as unconfirmed rather than wrong."
    );
  } else if (firmScore !== null) {
    sentences.push(
      `${productName} reads ${Math.round(firmScore)}% across ${assessmentNoun}, while your own self-assessment signal is still missing.`
    );
    sentences.push(
      "Firms are describing the product without a vendor self-view to compare against, so the calibration question cannot be answered yet."
    );
  }

  if (weakestSection && weakestSection.averageScore !== null) {
    sentences.push(
      `${weakestSection.title} is your softest self-reported section at ${Math.round(weakestSection.averageScore)}%, which makes it the most likely place the gap is being decided.`
    );
  }

  sentences.push(
    "Closing the distance between the self-view and the firm-reviewed view generally strengthens your product-market evidence, because every later conversation can point at confirmed signal instead of claims."
  );
  sentences.push(
    assessmentCount > 0
      ? `Each additional firm review either confirms the story or shows exactly where it needs recalibrating — ${assessmentNoun} currently stand behind the firm-reviewed signal.`
      : "The fastest way to firm this picture up is getting the product in front of firm reviewers, because that is the only source of buyer-side signal PAT will count."
  );

  return {
    summary: sentences.join(" "),
    nextSteps:
      weakestSection && weakestSection.averageScore !== null
        ? [`Strengthen the ${weakestSection.title.toLowerCase()} story before the next round of firm reviews.`]
        : [],
  };
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

function areaLabel(x: UtilityEvidence | VendorSectionEvidence | undefined): string | undefined {
  if (!x) return undefined;
  return "utilityLabel" in x ? x.utilityLabel : x.title;
}

function recencyClause(at: Date | null): string {
  if (!at) return "";
  const days = Math.floor((Date.now() - at.getTime()) / 86_400_000);
  if (days <= 1) return " · updated today";
  if (days < 30) return ` · updated ${days}d ago`;
  const months = Math.max(1, Math.round(days / 30));
  return ` · updated ${months}mo ago`;
}

/**
 * B8-1: each Pro product card gets its OWN headline number + band chip + one
 * card-specific sentence, drawn from that card's own slice of existing evidence
 * (no new pipelines). Kills the 3× duplicated currentStateSummary boilerplate.
 */
function buildVendorProductCardFace(
  insight: VendorProductInsightRecord,
  snapshot: VendorProductInsightSnapshot
): Pick<VendorProductInsightDetailCard, "summary" | "supportingText" | "metric" | "statusLabel"> {
  const firmScore = snapshot.firmReviewed.averageScore;
  const vendorScore = snapshot.vendorSelfReported.latestScore;

  if (insight.key === "current-product-fit") {
    // Self-reported vs firm-reviewed delta.
    if (firmScore != null && vendorScore != null && !snapshot.divergence.belowFloor) {
      const band = scoreBandFor(firmScore);
      const gap = Math.round(Math.abs((snapshot.divergence.points ?? vendorScore - firmScore)));
      const dir = vendorScore >= firmScore ? "above" : "below";
      return {
        metric: { value: `${gap} pts`, caption: `self-report vs firm-reviewed gap` },
        statusLabel: band.label,
        summary: `Firms rate this product ${Math.round(firmScore)} · ${band.label}; the vendor self-reports ${Math.round(vendorScore)} — a ${gap}-point gap with self-report ${dir} firm-reviewed evidence.`,
        supportingText: null,
      };
    }
    if (vendorScore != null) {
      const band = scoreBandFor(vendorScore);
      return {
        metric: { value: `${Math.round(vendorScore)}`, caption: "vendor self-reported fit" },
        statusLabel: band.label,
        summary: `Vendor self-reported fit reads ${Math.round(vendorScore)} · ${band.label}. Firm-reviewed evidence is not yet deep enough to confirm a gap.`,
        supportingText: null,
      };
    }
    return {
      metric: undefined,
      summary: "Neither vendor self-report nor firm-reviewed evidence is present yet, so product-fit cannot be grounded.",
      supportingText: null,
    };
  }

  if (insight.key === "implementation-friction") {
    // Per-feature / per-section bars: surface the weakest and strongest area.
    const weakest = insight.weakestFirmUtilities[0] ?? insight.weakestVendorSections[0];
    const strongest = insight.strongestFirmUtilities[0] ?? insight.strongestVendorSections[0];
    const weakLabel = areaLabel(weakest);
    const strongLabel = areaLabel(strongest);
    if (weakest?.averageScore != null) {
      const band = scoreBandFor(weakest.averageScore);
      const strongClause =
        strongest?.averageScore != null && strongLabel
          ? ` ${strongLabel} carries the least friction at ${Math.round(strongest.averageScore)}.`
          : "";
      return {
        metric: { value: `${Math.round(weakest.averageScore)}`, caption: `weakest area: ${weakLabel}` },
        statusLabel: band.label,
        summary: `Implementation weight concentrates in ${weakLabel} at ${Math.round(weakest.averageScore)} · ${band.label}.${strongClause}`,
        supportingText: null,
      };
    }
    return {
      metric: undefined,
      summary: "Not enough per-area evidence yet to separate where implementation friction concentrates.",
      supportingText: null,
    };
  }

  // visibility-and-value: review count + recency.
  const count = snapshot.firmReviewed.assessmentCount;
  const clearest = insight.strongestFirmUtilities[0];
  const faintest = insight.weakestFirmUtilities[0];
  const valueClause =
    clearest?.utilityLabel && faintest?.utilityLabel
      ? ` ${clearest.utilityLabel} is the clearest value signal; ${faintest.utilityLabel} is the least visible.`
      : "";
  return {
    metric: {
      value: `${count}`,
      caption: `firm review${count === 1 ? "" : "s"}${recencyClause(snapshot.firmReviewed.latestSubmittedAt)}`,
    },
    statusLabel: insight.confidenceLabel,
    summary:
      count > 0
        ? `This readout draws on ${count} firm review${count === 1 ? "" : "s"}.${valueClause}`
        : "No firm reviews yet, so value visibility rests on vendor self-report alone.",
    supportingText: null,
  };
}

export function buildVendorProductProInsightCards(
  snapshot: VendorProductInsightSnapshot
): VendorProductInsightDetailCard[] {
  return snapshot.insightRecords.map((insight) => {
    const face = buildVendorProductCardFace(insight, snapshot);
    return {
      key: insight.key,
      title: insight.title,
      summary: face.summary,
      // Block 11c: no score-band chip on the face card (number + one line only);
      // the band word lives in the detail hero. face.statusLabel dropped.
      statusLabel: undefined,
      metric: face.metric,
      tone: "active" as const,
      href: `/vendor/product-insight/${snapshot.product.id}/${insight.key}`,
      interactive: true,
      supportingText: face.supportingText,
    };
  });
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
  // Block 11e: show the Elite upsell toggle ONLY to non-entitled (Pro) vendors.
  // There is no live product-level Elite layer yet, so an entitled Elite vendor
  // must NOT see a locked pane for something they bought — the toggle is hidden
  // for them and flips live when the real Elite layers ship.
  showElite?: boolean;
}) {
  const content = getVendorProductInsightContent(input.insightKey);
  const lockedState = content?.lockedState;
  const baseHref = `/vendor/product-insight/${input.snapshot.product.id}/${input.insightKey}`;
  const vendorEvidenceCount = input.record?.vendorSectionEvidence.length ?? 0;
  const firmEvidenceCount = input.snapshot.firmReviewed.utilityEvidence.filter(
    (utility) => utility.averageScore !== null
  ).length;

  // Block 11d: data (Evidence) pane leads the toggle, Help second — the card
  // click lands on the grounded readout first.
  const surfaces: VendorProductInsightDetailSurfaceCard[] = [
    {
      key: "evidence",
      title: "Evidence",
      summary:
        input.record || vendorEvidenceCount > 0 || firmEvidenceCount > 0
          ? "Review the vendor section evidence alongside the firm-reviewed feature evidence behind this readout."
          : input.snapshot.combinedCurrentPatReadout,
      href: `${baseHref}?surface=evidence`,
      interactive: true,
    },
    {
      key: "help",
      title: "Help",
      summary: input.locked
        ? lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE
        : input.record?.currentStateSummary ?? input.snapshot.combinedCurrentPatReadout,
      href: `${baseHref}?surface=help`,
      interactive: true,
    },
  ];

  if (input.showElite) {
    surfaces.push({
      key: "elite",
      title: "Elite",
      summary: "A blurred preview of the Elite product-intelligence layers — available with Elite membership.",
      href: `${baseHref}?surface=elite`,
      interactive: true,
    });
  }

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

  if (snapshot.firmReviewed.assessmentCount === 0) {
    return "Insufficient firm-reviewed evidence: no firm product assessments have been submitted for this product yet. PAT is showing vendor-authored current-state evidence only and is not treating buyer confirmation as present.";
  }

  if (!groundedUtilities.length) {
    return "Insufficient firm-reviewed evidence: firm product assessments exist, but the scored feature evidence is still too thin to separate feature-level strengths and weaknesses cleanly.";
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

function buildEvidenceProvenanceItem(snapshot: VendorProductInsightSnapshot) {
  const vendorSubmittedAt = snapshot.vendorAssessmentStatus.latestSubmittedAt
    ? snapshot.vendorAssessmentStatus.latestSubmittedAt.toISOString()
    : "not recorded";
  const firmReviewedAt = snapshot.firmReviewed.latestSubmittedAt
    ? snapshot.firmReviewed.latestSubmittedAt.toISOString()
    : "not available";
  const firmEvidence =
    snapshot.firmReviewed.assessmentCount > 0
      ? `${snapshot.firmReviewed.assessmentCount} final firm product assessment${
          snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"
        }, latest submitted ${firmReviewedAt}`
      : "insufficient firm-reviewed evidence: no final firm product assessments are present";

  return {
    title: "Evidence provenance",
    body: [
      `Vendor source: completed final vendor product assessment submitted ${vendorSubmittedAt}.`,
      `Firm-reviewed source: ${firmEvidence}.`,
      `Product feature scope: ${snapshot.product.utilityScopeLabel}.`,
      "PAT uses only these current assessment records for this detail page; it is not claiming benchmark, projection, or market-comparison proof.",
    ].join(" "),
  };
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
  /** Hybrid Elite depth: an entitled Elite vendor gets the live elite intro. */
  eliteEntitled?: boolean;
}) {
  const content = getVendorProductInsightContent(input.insightKey);
  const lockedState = content?.lockedState;

  switch (input.surface) {
    case "elite":
      // Hybrid Elite depth: an ENTITLED vendor gets a live intro (the depth card
      // renders the real cohort position + ranked action alongside). A
      // non-entitled vendor gets the honest upsell — named layers, zero data.
      if (input.eliteEntitled) {
        return {
          key: "elite",
          title: "Elite",
          intro:
            "Live product intelligence: where this product ranks in its category's cohort of firm-reviewed peers, the ranked move to climb, and the trend as review history builds.",
          items: [
            {
              title: "Grounding",
              body: "Cohort position is computed from the firm-reviewed strength of every peer product in this category — the same evidence base as your alignment benchmarks, at the product grain.",
            },
          ],
        } satisfies VendorProductInsightDetailSurfaceContent;
      }
      // Non-entitled upsell — names the Elite layers with ZERO data, rendered
      // alongside a blurred LockedElitePreview in the page.
      return {
        key: "elite",
        title: "Elite",
        intro:
          "Elite product intelligence adds a cohort position, a ranked action, and a trend for this product — each grounded in firm-reviewed evidence. Available with Elite membership.",
        items: [
          {
            title: "Market comparison view",
            body: "Where this product's firm-reviewed strength sits against the peer field in its category — a percentile position, not a ranking of named competitors.",
          },
          {
            title: "Forward demand projection",
            body: "The directional demand signal for this product's capability area across the firm base — a projection, not a guarantee.",
          },
          {
            title: "Locked Elite boundary",
            body: "This is a preview only — no live Elite data is shown here. PAT does not expose benchmark, projection, or market-wide figures until you hold Elite membership.",
          },
        ],
      } satisfies VendorProductInsightDetailSurfaceContent;
    case "help": {
      const helpSurface = buildHelpSurfaceContent<VendorProductInsightDetailSurfaceKey>({
        key: "help",
        intro: input.locked
          ? lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE
          : input.record?.currentStateSummary ?? input.snapshot.combinedCurrentPatReadout,
        what: input.locked
          ? lockedState?.what ?? content?.what ?? "Live with Elite membership."
          : input.record?.what ?? content?.what ?? "No product-intelligence explanation is available yet.",
        why: input.locked
          ? lockedState?.why ?? content?.why ?? ELITE_PLACEHOLDER_CTA
          : input.record?.why ?? content?.why ?? "No product-intelligence rationale is available yet.",
        how: input.locked
          ? lockedState?.how ?? content?.how ?? ELITE_PLACEHOLDER_CTA
          : input.record?.how ?? content?.how ?? "No product-intelligence use guidance is available yet.",
      });
      return {
        ...helpSurface,
        items: input.locked
          ? [
              ...helpSurface.items,
              {
                title: "Locked Elite boundary",
                body: `${lockedState?.basis ?? "Elite evidence is not available in the current PAT product."} This page is muted because the Elite insight is not live; the visible evidence is limited to the current vendor and firm assessment records already shown in PAT.`,
              },
            ]
          : [...helpSurface.items, buildEvidenceProvenanceItem(input.snapshot)],
      } satisfies VendorProductInsightDetailSurfaceContent;
    }
    case "evidence":
      return {
        key: "evidence",
        title: "Evidence and provenance",
        intro: input.locked
          ? "This is not a live Elite interpretation. PAT is only showing the current evidence boundary while the deeper Elite product view remains locked and muted."
          : "PAT keeps this surface focused on the exact evidence and provenance that supports this product readout today.",
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
          buildEvidenceProvenanceItem(input.snapshot),
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
          ? lockedState?.summary ?? "Live with Elite membership."
          : input.record?.currentStateSummary ?? input.snapshot.combinedCurrentPatReadout,
        what: input.locked
          ? lockedState?.what ?? content?.what ?? "Live with Elite membership."
          : input.record?.what ?? content?.what ?? "No product-intelligence explanation is available yet.",
        why: input.locked
          ? lockedState?.why ?? content?.why ?? "Live with Elite membership."
          : input.record?.why ?? content?.why ?? "No product-intelligence rationale is available yet.",
        how: input.locked
          ? lockedState?.how ?? content?.how ?? "Live with Elite membership."
          : input.record?.how ?? content?.how ?? "No product-intelligence use guidance is available yet.",
      });
  }
}

/**
 * The reads that are INVARIANT across every product of one vendor.
 *
 * The two SurveyModule rows are looked up by fixed key, and the vendor's scoped
 * firm list depends only on the vendor. Neither varies with productId, so
 * re-deriving them inside a per-product loop is pure repetition: at 47 firms x
 * 37 products the ecosystem route issued ~3,500 Ecosystem.findUnique and ~7,300
 * SurveyModule.findUnique calls for values that never changed within the request.
 *
 * Resolved ONCE by the loop and passed down. This is a hoist, not a cache: there
 * is no store, no TTL and no invalidation question — the values are computed at
 * the top of the loop that needs them and discarded when it ends.
 */
export type VendorProductInsightContext = {
  vendorModuleId: string | null;
  firmModuleId: string | null;
  scopedFirmIds: string[];
  /**
   * Submissions pre-fetched for a whole product set and grouped by productId.
   *
   * Present only when the caller resolved the context for a KNOWN set of
   * products (the vendor catalog, or a briefing's product list). Absent for a
   * one-off single-product call, which then queries as before.
   *
   * This is the batching half of the fix. The per-product queries were not slow
   * SQL — averaged 1.6s each, which is queue time, not execution time. Thousands
   * of concurrent point queries saturate the connection pool and every one of
   * them waits behind the others. Two queries for the whole set replace ~3,500,
   * and the wall stops being dominated by contention the route created itself.
   */
  vendorSubmissionByProductId?: Map<string, VendorSubmissionRow>;
  firmSubmissionsByProductId?: Map<string, FirmSubmissionRow[]>;
};

type VendorSubmissionRow = {
  id: string;
  score: number;
  createdAt: Date;
  answeredCount: number;
  answers: unknown;
  scaleMin: number;
  scaleMax: number;
};

type FirmSubmissionRow = {
  id: string;
  score: number;
  createdAt: Date;
  answers: unknown;
  scaleMin: number;
  scaleMax: number;
};

export async function resolveVendorProductInsightContext(
  companyId: string,
  productIds?: string[]
): Promise<VendorProductInsightContext> {
  const [vendorModule, firmModule, scopedFirmIds] = await Promise.all([
    prisma.surveyModule
      .findUnique({ where: { key: VENDOR_PRODUCT_MODULE_KEY }, select: { id: true } })
      .catch(() => null),
    prisma.surveyModule
      .findUnique({ where: { key: FIRM_PRODUCT_MODULE_KEY }, select: { id: true } })
      .catch(() => null),
    getVendorScopedFirms(companyId),
  ]);

  const context: VendorProductInsightContext = {
    vendorModuleId: vendorModule?.id ?? null,
    firmModuleId: firmModule?.id ?? null,
    scopedFirmIds,
  };

  if (!productIds || productIds.length === 0) {
    return context;
  }

  // TWO queries for the whole product set, replacing two per product. Ordered
  // newest-first and grouped in memory, so the per-product code below sees
  // exactly what its own query would have returned — same rows, same order,
  // same tenancy predicates.
  const [vendorRows, firmRows] = await Promise.all([
    context.vendorModuleId
      ? prisma.surveySubmission
          .findMany({
            where: getSurveyFinalWhere({
              moduleId: context.vendorModuleId,
              companyId,
              Subject: { productId: { in: productIds } },
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
              Subject: { select: { productId: true } },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
    context.firmModuleId
      ? prisma.surveySubmission
          .findMany({
            where: getSurveyFinalWhere({
              moduleId: context.firmModuleId,
              Subject: { productId: { in: productIds } },
              Company: { type: "FIRM", id: { in: scopedFirmIds } },
            }),
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              score: true,
              createdAt: true,
              answers: true,
              scaleMin: true,
              scaleMax: true,
              Subject: { select: { productId: true } },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const vendorByProduct = new Map<string, VendorSubmissionRow>();
  for (const row of vendorRows) {
    const productId = row.Subject?.productId;
    if (!productId) continue;
    // Newest-first ordering means the FIRST row per product is the latest, which
    // is what findFirst({orderBy: createdAt desc}) returned.
    if (!vendorByProduct.has(productId)) {
      // Drop the Subject join used only for grouping, so the shape handed on
      // is exactly what the per-product query returned.
      const rest = { ...row, Subject: undefined };
      delete (rest as { Subject?: unknown }).Subject;
      vendorByProduct.set(productId, rest as unknown as VendorSubmissionRow);
    }
  }

  const firmByProduct = new Map<string, FirmSubmissionRow[]>();
  for (const row of firmRows) {
    const productId = row.Subject?.productId;
    if (!productId) continue;
    const rest = { ...row, Subject: undefined };
    delete (rest as { Subject?: unknown }).Subject;
    const bucket = firmByProduct.get(productId) ?? [];
    bucket.push(rest as unknown as FirmSubmissionRow);
    firmByProduct.set(productId, bucket);
  }

  // Every requested product gets an entry, so a product with no submissions is
  // a present-and-empty bucket rather than a cache miss that silently falls back
  // to a per-product query.
  for (const productId of productIds) {
    if (!firmByProduct.has(productId)) firmByProduct.set(productId, []);
  }

  return {
    ...context,
    vendorSubmissionByProductId: vendorByProduct,
    firmSubmissionsByProductId: firmByProduct,
  };
}

/**
 * Per-vendor context resolver for a loop that spans several vendor companies.
 *
 * The admin briefing iterates products that may belong to different vendors, so
 * one hoisted context is not enough — but re-deriving per product is what this
 * change exists to remove. A loop-local Map keyed by companyId gives each vendor
 * exactly one resolution, and dies with the loop.
 */
export function createVendorInsightContextResolver(
  productIdsByCompany?: Map<string, string[]>
) {
  const byCompany = new Map<string, Promise<VendorProductInsightContext>>();
  return (companyId: string): Promise<VendorProductInsightContext> => {
    const existing = byCompany.get(companyId);
    if (existing) return existing;
    // The caller knows every product it will ask about, so the submissions for
    // all of them are fetched in one pair of queries rather than one pair each.
    const resolved = resolveVendorProductInsightContext(
      companyId,
      productIdsByCompany?.get(companyId)
    );
    byCompany.set(companyId, resolved);
    return resolved;
  };
}

export async function getVendorProductInsightSnapshot(
  companyId: string,
  productId: string,
  context?: VendorProductInsightContext
) {
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

  // Hoisted by the caller when it is looping products; resolved here only for a
  // one-off single-product call, so the standalone path keeps working unchanged.
  const insightContext = context ?? (await resolveVendorProductInsightContext(companyId));
  const vendorModule = insightContext.vendorModuleId ? { id: insightContext.vendorModuleId } : null;
  const firmModule = insightContext.firmModuleId ? { id: insightContext.firmModuleId } : null;
  // Batched by the caller when the product set was known up front; the
  // per-product queries below run only for a standalone single-product call.
  const batchedVendor = insightContext.vendorSubmissionByProductId;
  const batchedFirm = insightContext.firmSubmissionsByProductId;

  const [latestVendorSubmission, firmSubmissions] = batchedFirm
    ? [batchedVendor?.get(productId) ?? null, batchedFirm.get(productId) ?? []]
    : await Promise.all([
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
      ? (async () => {
          // Phase 1 / Day-10 tenancy: restrict firm-side product reviews to
          // firms in the vendor's ecosystem (per Q6 walled-tenancy). companyId
          // here is the vendor's own company; getVendorScopedFirms returns
          // all FIRM-type companies in open mode so the IN-clause is a no-op
          // for the pre-Phase-1 baseline behavior.
          //
          // Hoisted: the scope depends on the VENDOR, not the product, so a
          // per-product re-derivation was re-reading the same ecosystem row
          // once per product per firm. Same value, same wall, one query.
          const scopedFirmIds = insightContext.scopedFirmIds;
          return prisma.surveySubmission.findMany({
            where: getSurveyFinalWhere({
              moduleId: firmModule.id,
              Subject: { productId },
              Company: { type: "FIRM", id: { in: scopedFirmIds } },
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
          }).catch(() => []);
        })()
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
      category: product.category,
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
  // One resolution for the whole catalog: every product here belongs to the
  // same vendor, so the modules and the scoped firm list are identical for all
  // of them.
  const insightContext = await resolveVendorProductInsightContext(
    companyId,
    vendorContext.products.map((product) => product.id)
  );
  const snapshots = await Promise.all(
    vendorContext.products.map((product) =>
      getVendorProductInsightSnapshot(companyId, product.id, insightContext)
    )
  );

  const catalog: VendorProductInsightSnapshot[] = [];
  for (const snapshot of snapshots) {
    if (snapshot) {
      catalog.push(snapshot);
    }
  }
  return filterVendorProductInsightCatalogToCompleted(catalog);
}
