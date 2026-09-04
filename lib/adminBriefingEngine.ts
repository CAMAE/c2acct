import { Prisma, QuestionInputType } from "@prisma/client";
import { normalizeQuestionRuntime, type NormalizedAnswer } from "@/lib/assessmentRuntime";
import { getFirmInsightReports } from "@/lib/firmInsightEngine";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_PRODUCT_MODULE_KEY,
} from "@/lib/firmPat";
import prisma from "@/lib/prisma";
import { CUSTOMER_FACING_BOUNDARIES } from "@/lib/dataBoundary";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { getFirmManagedUserRecords } from "@/lib/userPat";
import { getVendorAlignmentInsightBundle } from "@/lib/vendorAlignmentInsightEngine";
import {
  createVendorInsightContextResolver,
  getVendorProductInsightSnapshot,
  getVendorProductInsightSnapshotsByProductId,
  vendorProductInsightCatalogFromSnapshots,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";
import type { VendorAdaptiveOpenEndedQuestionSnapshot } from "@/lib/vendorProductAssessmentPlan";
import { buildProductAssessmentPlan } from "@/lib/vendorProductQuestionBank";
import {
  VENDOR_PRODUCT_MODULE_KEY,
  deriveVendorProductAssessmentCompletionStatus,
} from "@/lib/vendorPat";

type ModuleRecord = {
  id: string;
  key: string;
  title: string;
  SurveyQuestion: Array<{
    id: string;
    key: string;
    prompt: string;
    inputType: QuestionInputType;
    weight: number;
    order: number;
    required: boolean;
    meta: Prisma.JsonValue | null;
    SurveySection: {
      id: string;
      key: string;
      title: string;
      description: string | null;
      order: number;
      utilityFamily: string | null;
      utilityKey: string | null;
      utilityLabel: string | null;
      subcategoryKey: string | null;
      subcategoryTitle: string | null;
      basisKey: string | null;
    } | null;
  }>;
};

type ModuleSubmissionRecord = {
  id: string;
  moduleId: string;
  score: number;
  signalIntegrityScore: number;
  createdAt: Date;
  answers: unknown;
};

type BriefingConfidenceBand = "no_signal" | "directional" | "emerging" | "grounded";

export type BriefingCatalogItem = {
  companyId: string;
  companyName: string;
  userCount: number;
  completedModuleCount: number;
  productReviewCount: number;
  canonicalFirmScore: number | null;
  confidenceLabel: string;
  latestUpdatedAt: Date | null;
};

export type BriefingSectionScore = {
  key: string;
  title: string;
  score: number | null;
  answeredCount: number;
  questionCount: number;
};

export type BriefingModuleHeatmapItem = {
  key: string;
  title: string;
  canonicalScore: number | null;
  confidenceScore: number | null;
  latestSubmittedAt: Date | null;
  sectionScores: BriefingSectionScore[];
};

export type BriefingProductSummary = {
  productId: string;
  productName: string;
  vendorName: string;
  canonicalFirmReviewScore: number | null;
  firmReviewCount: number;
  vendorSelfReportedScore: number | null;
  combinedCurrentReadout: string;
  divergenceLabel: string;
  confidenceLabel: string;
  confidenceSummary: string;
  latestUpdatedAt: Date | null;
  utilityLabels: string[];
  taxonomyTitles: string[];
  capabilityKeys: string[];
  latestVendorAssessmentSubmittedAt: Date | null;
  openEndedResponseCount: number;
};

export type BriefingProductOpenEndedResponse = {
  productId: string;
  productName: string;
  vendorName: string;
  questionId: string;
  questionKey: string;
  questionPrompt: string;
  sectionTitle: string;
  sectionDescription: string;
  responseText: string;
  submittedAt: Date | null;
};

export type BriefingConfidenceEntry = {
  layer: string;
  sampleSize: number;
  confidenceLabel: string;
  confidenceSummary: string;
  latestUpdatedAt: Date | null;
  canonicalScore: number | null;
  caveats: string[];
};

export type BriefingActionItem = {
  window: "30 days" | "60 days" | "90 days";
  title: string;
  detail: string;
  evidence: string;
};

export type BriefingRiskOpportunity = {
  layer: "individual" | "firm" | "product" | "ecosystem";
  title: string;
  detail: string;
};

export type AdminCompanyBriefing = {
  company: {
    id: string;
    name: string;
    type: "FIRM";
    userCount: number;
    reviewedProductCount: number;
    latestUpdatedAt: Date | null;
  };
  executiveSummary: {
    headline: string;
    summary: string;
    canonicalFirmScore: number | null;
    confidenceLabel: string;
    confidenceSummary: string;
  };
  individualLayer: {
    summary: string;
    peopleAssessed: number;
    totalUsers: number;
    averageScore: number | null;
    latestUpdatedAt: Date | null;
    confidenceLabel: string;
    confidenceSummary: string;
    evidence: string[];
  };
  firmLayer: {
    summary: string;
    averageScore: number | null;
    completedModuleCount: number;
    moduleHeatmap: BriefingModuleHeatmapItem[];
    evidence: string[];
  };
  productLayer: {
    summary: string;
    averageFirmReviewScore: number | null;
    reviewedProductCount: number;
    products: BriefingProductSummary[];
    openEndedResponses: BriefingProductOpenEndedResponse[];
    evidence: string[];
  };
  ecosystemLayer: {
    summary: string;
    stackVendorCount: number;
    taxonomyBucketCount: number;
    capabilityMapCount: number;
    confidenceLabel: string;
    confidenceSummary: string;
    evidence: string[];
  };
  insightNarrative: string;
  risks: BriefingRiskOpportunity[];
  opportunities: BriefingRiskOpportunity[];
  nextActions: BriefingActionItem[];
  confidenceAppendix: BriefingConfidenceEntry[];
};

export type AdminProductBriefing = {
  company: {
    id: string;
    name: string;
  };
  product: BriefingProductSummary & {
    summary: string | null;
    website: string | null;
    productSignals: Array<{
      key: string;
      valueText: string | null;
      valueNumber: number | null;
    }>;
  };
  latestCompanyReview: {
    canonicalScore: number | null;
    confidenceScore: number | null;
    submittedAt: Date | null;
  };
  latestVendorAssessment: {
    submittedAt: Date | null;
    responseCount: number;
    openEndedResponses: BriefingProductOpenEndedResponse[];
  };
  narrative: string;
  risks: BriefingRiskOpportunity[];
  opportunities: BriefingRiskOpportunity[];
  confidenceAppendix: BriefingConfidenceEntry[];
};

const PRODUCT_OPEN_ENDED_RUNTIME_QUESTIONS = buildProductAssessmentPlan({
  selectedUtilityKeys: [],
  includeProductGeneral: false,
  includeOpenEnded: true,
}).modules.flatMap((module) => module.questions);

const PRODUCT_OPEN_ENDED_RUNTIME_BY_ID = new Map(
  PRODUCT_OPEN_ENDED_RUNTIME_QUESTIONS.map((question) => [question.id, question])
);

const PRODUCT_OPEN_ENDED_RUNTIME_BY_KEY = new Map(
  PRODUCT_OPEN_ENDED_RUNTIME_QUESTIONS.map((question) => [question.key, question])
);

type LayerConfidence = {
  band: BriefingConfidenceBand;
  label: string;
  summary: string;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function latestDate(dates: Array<Date | null | undefined>) {
  return dates
    .filter((date): date is Date => date instanceof Date)
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

function extractResponses(answers: unknown) {
  if (!answers || typeof answers !== "object") {
    return {};
  }

  const responses = (answers as { responses?: unknown }).responses;
  if (!responses || typeof responses !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(responses).filter(
      (entry): entry is [string, number] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "number" &&
        Number.isFinite(entry[1])
    )
  );
}

function getObjectRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getStringRecord(value: unknown) {
  const record = getObjectRecord(value);
  if (!record) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "string"
    )
  );
}

function getProductQuestionKeyFromId(questionId: string) {
  const parts = questionId.split("__");
  return parts[parts.length - 1] ?? questionId;
}

function getStoredProductOpenEndedQuestionMap(input: unknown) {
  if (!Array.isArray(input)) {
    return new Map<string, VendorAdaptiveOpenEndedQuestionSnapshot>();
  }

  const questions = input
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const question = entry as Record<string, unknown>;
      if (
        typeof question.id !== "string" ||
        typeof question.key !== "string" ||
        typeof question.prompt !== "string" ||
        typeof question.order !== "number" ||
        typeof question.sectionKey !== "string" ||
        typeof question.sectionTitle !== "string" ||
        typeof question.sectionDescription !== "string"
      ) {
        return null;
      }

      return question as VendorAdaptiveOpenEndedQuestionSnapshot;
    })
    .filter((entry): entry is VendorAdaptiveOpenEndedQuestionSnapshot => Boolean(entry));

  return new Map(questions.map((question) => [question.id, question]));
}

function resolveProductOpenEndedQuestion(questionId: string) {
  const directMatch = PRODUCT_OPEN_ENDED_RUNTIME_BY_ID.get(questionId);
  if (directMatch) {
    return directMatch;
  }

  return PRODUCT_OPEN_ENDED_RUNTIME_BY_KEY.get(getProductQuestionKeyFromId(questionId)) ?? null;
}

function extractProductOpenEndedResponses(input: {
  answers: unknown;
  productId: string;
  productName: string;
  vendorName: string;
  submittedAt: Date | null;
}) {
  const answerPayload = getObjectRecord(input.answers);
  const openEndedPayload = getStringRecord(answerPayload?.openEndedResponses);
  const storedOpenEndedQuestionMap = getStoredProductOpenEndedQuestionMap(answerPayload?.openEndedPlan);

  if (!openEndedPayload) {
    return [] satisfies BriefingProductOpenEndedResponse[];
  }

  return Object.entries(openEndedPayload)
    .map(([questionId, responseText]) => {
      const trimmedResponse = responseText.trim();
      if (trimmedResponse.length === 0) {
        return null;
      }

      const runtimeQuestion = resolveProductOpenEndedQuestion(questionId);
      const storedQuestion = storedOpenEndedQuestionMap.get(questionId);
      return {
        productId: input.productId,
        productName: input.productName,
        vendorName: input.vendorName,
        questionId,
        questionKey:
          storedQuestion?.key ?? runtimeQuestion?.key ?? getProductQuestionKeyFromId(questionId),
        questionPrompt:
          storedQuestion?.prompt ??
          runtimeQuestion?.prompt ??
          "Stored product open-ended question (" + questionId + ")",
        sectionTitle:
          storedQuestion?.sectionTitle ?? runtimeQuestion?.section.title ?? "Open-ended product responses",
        sectionDescription:
          storedQuestion?.sectionDescription ??
          runtimeQuestion?.section.description ??
          "Narrative vendor responses from the latest completed product assessment.",
        responseText: trimmedResponse,
        submittedAt: input.submittedAt,
      } satisfies BriefingProductOpenEndedResponse;
    })
    .filter(
      (response): response is BriefingProductOpenEndedResponse => Boolean(response)
    )
    .sort((left, right) => {
      const leftQuestion = resolveProductOpenEndedQuestion(left.questionId);
      const rightQuestion = resolveProductOpenEndedQuestion(right.questionId);
      return (leftQuestion?.order ?? Number.MAX_SAFE_INTEGER) - (rightQuestion?.order ?? Number.MAX_SAFE_INTEGER);
    });
}

export function filterBriefingOpenEndedResponses(
  responses: BriefingProductOpenEndedResponse[],
  query: string | null | undefined
) {
  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  if (normalizedQuery.length === 0) {
    return responses;
  }

  return responses.filter((response) =>
    [
      response.productName,
      response.vendorName,
      response.questionPrompt,
      response.sectionTitle,
      response.responseText,
    ].some((value) => value.toLowerCase().includes(normalizedQuery))
  );
}

function normalizeAnswerToPercent(
  question: ReturnType<typeof normalizeQuestionRuntime>,
  answer: unknown
) {
  if (typeof answer !== "number" || !Number.isFinite(answer)) {
    return null;
  }

  if (question.inputType === "SLIDER" && question.validation.slider) {
    const denominator = question.validation.slider.max - question.validation.slider.min;
    if (denominator <= 0) {
      return null;
    }
    return round1(((answer - question.validation.slider.min) / denominator) * 100);
  }

  if (
    question.inputType === "NUMBER" &&
    typeof question.validation.number?.min === "number" &&
    typeof question.validation.number?.max === "number"
  ) {
    const denominator = question.validation.number.max - question.validation.number.min;
    if (denominator <= 0) {
      return null;
    }
    return round1(((answer - question.validation.number.min) / denominator) * 100);
  }

  return null;
}

function getConfidenceFromCoverage(sampleSize: number, completeTarget: number, label: string): LayerConfidence {
  if (sampleSize <= 0) {
    return {
      band: "no_signal",
      label: "No signal",
      summary: `${label} has no completed PAT evidence yet.`,
    };
  }
  if (sampleSize < Math.max(1, Math.ceil(completeTarget / 2))) {
    return {
      band: "directional",
      label: "Early signal",
      summary: `${label} is based on ${sampleSize} completed data point${sampleSize === 1 ? "" : "s"}, so it remains directional.`,
    };
  }
  if (sampleSize < completeTarget) {
    return {
      band: "emerging",
      label: "Early signal",
      summary: `${label} covers ${sampleSize} of ${completeTarget} expected data points and is useful, but still incomplete.`,
    };
  }
  return {
    band: "grounded",
    label: "Grounded",
    summary: `${label} covers the current expected PAT data points and is grounded for current-state interpretation only.`,
  };
}

function getOverallConfidence(input: {
  completedModules: number;
  totalModules: number;
  peopleAssessed: number;
  productCount: number;
}) {
  const signalPoints = [
    input.completedModules === input.totalModules ? 2 : input.completedModules > 0 ? 1 : 0,
    input.peopleAssessed >= 3 ? 2 : input.peopleAssessed > 0 ? 1 : 0,
    input.productCount >= 2 ? 2 : input.productCount > 0 ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  if (signalPoints <= 1) {
    return {
      band: "directional" as const,
      label: "Early signal",
      summary: "The briefing is usable for triage, but multiple evidence layers are still thin.",
    };
  }
  if (signalPoints <= 4) {
    return {
      band: "emerging" as const,
      label: "Early signal",
      summary: "The briefing has meaningful evidence, but at least one layer remains sample-thin or incomplete.",
    };
  }
  return {
    band: "grounded" as const,
    label: "Grounded",
    summary: "The briefing is grounded across the current PAT layers, while still avoiding unsupported benchmark or projection claims.",
  };
}

function buildModuleHeatmap(
  modules: ModuleRecord[],
  submissions: ModuleSubmissionRecord[]
): BriefingModuleHeatmapItem[] {
  const latestSubmissionByModuleId = new Map<string, ModuleSubmissionRecord>();
  for (const submission of submissions) {
    if (!latestSubmissionByModuleId.has(submission.moduleId)) {
      latestSubmissionByModuleId.set(submission.moduleId, submission);
    }
  }

  return modules.map((module) => {
    const latestSubmission = latestSubmissionByModuleId.get(module.id) ?? null;
    const answers =
      latestSubmission?.answers && typeof latestSubmission.answers === "object"
        ? (extractResponses(latestSubmission.answers) as Record<string, NormalizedAnswer>)
        : {};
    const sectionScores = new Map<
      string,
      { title: string; order: number; values: number[]; questionCount: number }
    >();

    for (const question of module.SurveyQuestion) {
      const runtimeQuestion = normalizeQuestionRuntime(question);
      const sectionKey = runtimeQuestion.meta.section?.key ?? question.SurveySection?.key ?? module.key;
      const sectionTitle =
        runtimeQuestion.meta.section?.title ?? question.SurveySection?.title ?? module.title;
      const sectionOrder =
        runtimeQuestion.meta.section?.order ?? question.SurveySection?.order ?? question.order;
      const existing = sectionScores.get(sectionKey) ?? {
        title: sectionTitle,
        order: sectionOrder,
        values: [],
        questionCount: 0,
      };
      existing.questionCount += 1;
      const normalizedScore = normalizeAnswerToPercent(runtimeQuestion, answers[question.id]);
      if (normalizedScore !== null) {
        existing.values.push(normalizedScore);
      }
      sectionScores.set(sectionKey, existing);
    }

    return {
      key: module.key,
      title: module.title,
      canonicalScore: latestSubmission?.score ?? null,
      confidenceScore: latestSubmission?.signalIntegrityScore ?? null,
      latestSubmittedAt: latestSubmission?.createdAt ?? null,
      sectionScores: Array.from(sectionScores.entries())
        .map(([key, value]) => ({
          key,
          title: value.title,
          score: average(value.values),
          answeredCount: value.values.length,
          questionCount: value.questionCount,
        }))
        .sort((left, right) => left.title.localeCompare(right.title)),
    } satisfies BriefingModuleHeatmapItem;
  });
}

function buildExecutiveHeadline(input: {
  companyName: string;
  strongestModule: BriefingModuleHeatmapItem | null;
  weakestModule: BriefingModuleHeatmapItem | null;
  reviewedProductCount: number;
}) {
  if (!input.strongestModule && input.reviewedProductCount === 0) {
    return `${input.companyName} does not have enough PAT evidence yet for a board-ready readout.`;
  }

  if (!input.weakestModule || !input.strongestModule) {
    return `${input.companyName} has started to accumulate PAT evidence, but the current picture is still incomplete.`;
  }

  return `${input.companyName} is strongest in ${input.strongestModule.title.toLowerCase()} while the most immediate operating drag remains in ${input.weakestModule.title.toLowerCase()}.`;
}

function buildProductSummaryText(products: BriefingProductSummary[]) {
  if (products.length === 0) {
    return "No firm-side product reviews are recorded yet, so the product layer remains ungrounded.";
  }

  const strongestProduct = [...products]
    .filter((product) => product.canonicalFirmReviewScore !== null)
    .sort((left, right) => (right.canonicalFirmReviewScore ?? 0) - (left.canonicalFirmReviewScore ?? 0))[0];
  const highestDivergence = [...products]
    .filter((product) => product.divergenceLabel !== "Not enough shared signal yet")
    .sort((left, right) => {
      const leftPenalty = /above|below|aligned/i.test(left.divergenceLabel) ? 1 : 0;
      const rightPenalty = /above|below|aligned/i.test(right.divergenceLabel) ? 1 : 0;
      return rightPenalty - leftPenalty;
    })[0];

  return `${products.length} reviewed product${products.length === 1 ? "" : "s"} are in the current PAT stack. ${
    strongestProduct
      ? `${strongestProduct.productName} has the strongest current firm-reviewed posture at ${Math.round(
          strongestProduct.canonicalFirmReviewScore ?? 0
        )}%. `
      : ""
  }${
    highestDivergence
      ? `${highestDivergence.productName} carries the clearest calibration gap: ${highestDivergence.divergenceLabel.toLowerCase()}.`
      : ""
  }`.trim();
}

function buildNarrative(input: {
  companyName: string;
  firmSummary: string;
  individualSummary: string;
  productSummary: string;
  ecosystemSummary: string;
}) {
  return [
    `${input.companyName} currently reads as a live PAT current-state briefing rather than a forecast or benchmark report.`,
    input.firmSummary,
    input.individualSummary,
    input.productSummary,
    input.ecosystemSummary,
  ].join(" ");
}

// WS11-F (AUDIT-WS11-001): vendor-actionable next-step library. Voice is
// second-person to the vendor — what should THE VENDOR do next to better
// align their product with the firms in this ecosystem. Each title is a
// vendor verb (Schedule, Refresh, Stage); each detail names the specific
// product or capability driving the action so the consultant has a real
// talking point for the next operating review. The 4 input fields (weakest
// module, weakest product, missing-user coverage, ecosystem caveat) are
// reused from the prior PAT-meta library — no aggregator changes needed.
export function buildBriefingActionPlan(input: {
  weakestModuleTitle: string | null;
  weakestProductTitle: string | null;
  missingUserCoverage: boolean;
  ecosystemCaveat: string | null;
}) {
  return [
    {
      window: "30 days",
      title: input.missingUserCoverage
        ? "Schedule firm-side evidence outreach"
        : `Refresh self-report on ${input.weakestModuleTitle ?? "the weakest capability area"}`,
      detail: input.missingUserCoverage
        ? "Reach out to firm contacts to capture additional operating evidence. The current alignment readout is thin on firm-side signal — broader firm responses are what take the brief from directional to grounded across products and capabilities."
        : `Firms are rating your product below your stated position on ${input.weakestModuleTitle ?? "the weakest capability"}. Calibrate the self-report before the next operating review so the public claim set tracks firm experience, not the vendor's internal benchmark.`,
      evidence: input.missingUserCoverage
        ? "Firm-side sample size is currently thin."
        : `Firm layer weakness is concentrated in ${input.weakestModuleTitle ?? "the weakest module"}.`,
    },
    {
      window: "60 days",
      title: input.weakestProductTitle
        ? `Stage a product review on ${input.weakestProductTitle}`
        : "Open a firm-side product review channel",
      detail: input.weakestProductTitle
        ? `Bring ${input.weakestProductTitle} into the next quarterly operating review with the firms reviewing it now. Current firm-side feedback shows it is the weakest signal in your stack — vendor-side prep here pays back across the rest of the network because adjacent firms will see the calibration land.`
        : "Open a firm-side product review channel for at least one product in your catalog. The vendor brief currently operates on vendor self-report alone for product-level signal; firm-reviewed product data is what makes the alignment readout decision-grade for renewals and roadmap conversations.",
      evidence: input.weakestProductTitle
        ? `${input.weakestProductTitle} is the weakest current product signal in the stack.`
        : "No reviewed products are currently available.",
    },
    {
      window: "90 days",
      title: "Refresh public positioning after remediation lands",
      detail: input.ecosystemCaveat
        ? "Once the next round of firm responses arrives, restate your public position on the products and capabilities that have shifted. Today's ecosystem evidence is directional rather than grounded — re-anchor messaging, technical claims, and case-study language after the next cohort lands so the public claim set matches the new firm consensus."
        : "Bring the cleaner post-remediation evidence to your messaging and product-marketing teams. Update product positioning, capability claims, and case-study language so the external story matches the firm consensus the network now reflects.",
      evidence: input.ecosystemCaveat ?? "The current evidence set is strong enough for a post-remediation re-read.",
    },
  ] satisfies BriefingActionItem[];
}

export function buildRiskOpportunityPanels(input: {
  weakestModule: BriefingModuleHeatmapItem | null;
  strongestModule: BriefingModuleHeatmapItem | null;
  products: BriefingProductSummary[];
  ecosystemSummary: string;
  individualCoverageText: string;
}) {
  const weakestProduct = [...input.products]
    .filter((product) => product.canonicalFirmReviewScore !== null)
    .sort((left, right) => (left.canonicalFirmReviewScore ?? 0) - (right.canonicalFirmReviewScore ?? 0))[0] ?? null;
  const strongestProduct = [...input.products]
    .filter((product) => product.canonicalFirmReviewScore !== null)
    .sort((left, right) => (right.canonicalFirmReviewScore ?? 0) - (left.canonicalFirmReviewScore ?? 0))[0] ?? null;

  return {
    risks: [
      {
        layer: "firm" as const,
        title: input.weakestModule
          ? `Firm weakness in ${input.weakestModule.title}`
          : "Firm layer still incomplete",
        detail: input.weakestModule
          ? `The lowest current module score sits in ${input.weakestModule.title}, so PAT should treat it as the primary delivery risk until the next cycle.`
          : "The firm layer does not yet have enough completed modules to isolate a grounded operating risk.",
      },
      {
        layer: "product" as const,
        title: weakestProduct
          ? `${weakestProduct.productName} is the current product constraint`
          : "Product layer is still thin",
        detail: weakestProduct
          ? `${weakestProduct.productName} is the weakest reviewed product in the current stack and should be treated as the first product remediation thread.`
          : "No firm-reviewed product signal exists yet, so the stack risk remains mostly untested.",
      },
      {
        layer: "individual" as const,
        title: "Individual evidence coverage remains a gating factor",
        detail: input.individualCoverageText,
      },
    ] satisfies BriefingRiskOpportunity[],
    opportunities: [
      {
        layer: "firm" as const,
        title: input.strongestModule
          ? `Build from ${input.strongestModule.title}`
          : "Use the first completed PAT module as a base",
        detail: input.strongestModule
          ? `${input.strongestModule.title} is the strongest current firm module and can act as the stable base for the next operating cycle.`
          : "The strongest opportunity is to establish a fuller firm baseline before making broader claims.",
      },
      {
        layer: "product" as const,
        title: strongestProduct
          ? `${strongestProduct.productName} can anchor the product stack`
          : "Product opportunity remains open",
        detail: strongestProduct
          ? `${strongestProduct.productName} currently has the strongest firm-reviewed product score and can anchor repeatable practices while weaker products catch up.`
          : "The first firm product review will create the initial product-level opportunity map.",
      },
      {
        layer: "ecosystem" as const,
        title: "Use the ecosystem view as a context layer",
        detail: input.ecosystemSummary,
      },
    ] satisfies BriefingRiskOpportunity[],
  };
}

function summarizeIndividualLayer(input: {
  totalUsers: number;
  assessedUsers: number;
  averageScore: number | null;
  latestUpdatedAt: Date | null;
}) {
  const confidence = getConfidenceFromCoverage(
    input.assessedUsers,
    Math.max(1, input.totalUsers),
    "The individual layer"
  );

  return {
    confidence,
    summary:
      input.assessedUsers === 0
        ? "No individual PAT submissions are available yet, so the people layer remains a coverage gap rather than a current-state signal."
        : `${input.assessedUsers} of ${input.totalUsers} linked user${
            input.totalUsers === 1 ? "" : "s"
          } have person-level PAT submissions. The current average raw score is ${
            input.averageScore === null ? "--" : `${Math.round(input.averageScore)}%`
          }.`,
  };
}

export type BriefingLatestVendorAssessment = {
  submissionId: string;
  submittedAt: Date;
  openEndedResponses: BriefingProductOpenEndedResponse[];
};

async function getLatestVendorAssessmentsByProductId(
  products: Array<{
    id: string;
    name: string;
    Company: {
      name: string;
    } | null;
  }>,
  /**
   * The vendor product module when the caller already resolved it (null when
   * it resolved to nothing). Looked up here when undefined — the module is
   * keyed by a fixed string and does not vary within a request.
   */
  knownVendorModule?: { id: string } | null
) {
  if (products.length === 0) {
    return new Map<string, BriefingLatestVendorAssessment>();
  }

  const vendorModule =
    knownVendorModule !== undefined
      ? knownVendorModule
      : await prisma.surveyModule.findUnique({
          where: { key: VENDOR_PRODUCT_MODULE_KEY },
          select: { id: true },
        }).catch(() => null);

  if (!vendorModule) {
    return new Map<string, BriefingLatestVendorAssessment>();
  }

  const submissions = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      moduleId: vendorModule.id,
      Subject: { productId: { in: products.map((product) => product.id) } },
    }),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      score: true,
      answeredCount: true,
      createdAt: true,
      answers: true,
      Subject: {
        select: {
          productId: true,
        },
      },
    },
  }).catch(() => []);

  const latestSubmissionByProductId = new Map<(typeof products)[number]["id"], (typeof submissions)[number]>();
  for (const submission of submissions) {
    const productId = submission.Subject?.productId;
    if (!productId || latestSubmissionByProductId.has(productId)) {
      continue;
    }
    latestSubmissionByProductId.set(productId, submission);
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const latestAssessmentByProductId = new Map<string, BriefingLatestVendorAssessment>();

  for (const [productId, submission] of latestSubmissionByProductId.entries()) {
    const product = productById.get(productId);
    if (!product) {
      continue;
    }

    const completion = deriveVendorProductAssessmentCompletionStatus({
      latestSubmission: {
        id: submission.id,
        score: submission.score,
        createdAt: submission.createdAt,
        answeredCount: submission.answeredCount,
        answers: submission.answers,
      },
    });

    if (!completion.completed) {
      continue;
    }

    latestAssessmentByProductId.set(productId, {
      submissionId: submission.id,
      submittedAt: submission.createdAt,
      openEndedResponses: extractProductOpenEndedResponses({
        answers: submission.answers,
        productId,
        productName: product.name,
        vendorName: product.Company?.name ?? "Vendor",
        submittedAt: submission.createdAt,
      }),
    });
  }

  return latestAssessmentByProductId;
}

/**
 * Request-level context for briefing MANY firms of ONE vendor.
 *
 * Everything in here depends on the vendor or on nothing at all, never on the
 * firm being briefed: the two module ids are keyed by fixed strings, and a
 * product's insight snapshot and latest vendor assessment are functions of
 * (vendor, product). The per-firm path re-derived all of it per firm — and per
 * product for the snapshots — so at 47 firms the ecosystem route built the same
 * 37 snapshots 94 times and looked the same two modules up 472 times.
 *
 * Same discipline as VendorProductInsightContext: computed ONCE by the caller
 * that knows the whole set, passed down, discarded with the request. Nothing is
 * stored, there is no TTL and no invalidation. Every entry point still works
 * without it — a standalone single-firm call derives what it needs as before.
 *
 * Products OUTSIDE vendorProductIds (a firm that also reviewed another vendor's
 * product) are not covered by the maps and are computed per firm exactly as
 * before, so the context can only ever replace work, never change an answer.
 */
export type AdminBriefingContext = {
  firmProductModuleId: string | null;
  vendorProductModuleId: string | null;
  /** The product ids the two vendor-level maps below are authoritative for. */
  vendorProductIds: ReadonlySet<string>;
  vendorSnapshotByProductId: ReadonlyMap<string, VendorProductInsightSnapshot | null>;
  latestVendorAssessmentByProductId: ReadonlyMap<string, BriefingLatestVendorAssessment>;
  /**
   * Per-firm product layers, when the caller computed them up front so the
   * briefing catalog and the company briefing — which both need them for the
   * same firms — share one computation instead of each running their own.
   */
  briefingProductsByFirmId?: ReadonlyMap<string, BriefingProduct[]>;
};

export async function buildAdminBriefingContext(
  vendorCompanyId: string
): Promise<AdminBriefingContext & { vendorCatalog: VendorProductInsightSnapshot[] }> {
  const [firmModule, vendorModule, snapshots] = await Promise.all([
    prisma.surveyModule.findUnique({
      where: { key: FIRM_PRODUCT_MODULE_KEY },
      select: { id: true },
    }),
    prisma.surveyModule
      .findUnique({
        where: { key: VENDOR_PRODUCT_MODULE_KEY },
        select: { id: true },
      })
      .catch(() => null),
    getVendorProductInsightSnapshotsByProductId(vendorCompanyId),
  ]);

  // The same product fields the per-firm path hands to the assessment reader,
  // so the open-ended responses it extracts are labelled identically.
  const vendorProducts = await prisma.product.findMany({
    where: { id: { in: snapshots.productIds } },
    select: {
      id: true,
      name: true,
      Company: { select: { name: true } },
    },
  });

  return {
    firmProductModuleId: firmModule?.id ?? null,
    vendorProductModuleId: vendorModule?.id ?? null,
    vendorProductIds: new Set(snapshots.productIds),
    vendorSnapshotByProductId: snapshots.snapshotByProductId,
    latestVendorAssessmentByProductId: await getLatestVendorAssessmentsByProductId(
      vendorProducts,
      vendorModule
    ),
    vendorCatalog: vendorProductInsightCatalogFromSnapshots(snapshots),
  };
}

/** The product layer for each firm, computed once so several consumers can share it. */
export async function getBriefingProductsForFirms(
  firmIds: readonly string[],
  context: AdminBriefingContext
): Promise<Map<string, BriefingProduct[]>> {
  const layers = await Promise.all(
    firmIds.map(async (firmId) => [firmId, await getBriefingProducts(firmId, context)] as const)
  );
  return new Map(layers);
}

export type BriefingProduct = Awaited<ReturnType<typeof getBriefingProducts>>[number];

async function getBriefingProducts(companyId: string, context?: AdminBriefingContext) {
  const firmModule = context
    ? context.firmProductModuleId
      ? { id: context.firmProductModuleId }
      : null
    : await prisma.surveyModule.findUnique({
        where: { key: FIRM_PRODUCT_MODULE_KEY },
        select: { id: true },
      });
  if (!firmModule) {
    return [];
  }

  const submissions = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      companyId,
      moduleId: firmModule.id,
      Subject: { kind: "PRODUCT" },
    }),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      score: true,
      signalIntegrityScore: true,
      createdAt: true,
      subjectId: true,
      Subject: {
        select: {
          productId: true,
        },
      },
    },
  }).catch(() => []);

  const latestSubmissionByProductId = new Map<
    string,
    {
      score: number;
      signalIntegrityScore: number;
      createdAt: Date;
    }
  >();
  for (const submission of submissions) {
    const productId = submission.Subject?.productId;
    if (!productId || latestSubmissionByProductId.has(productId)) {
      continue;
    }
    latestSubmissionByProductId.set(productId, {
      score: submission.score,
      signalIntegrityScore: submission.signalIntegrityScore,
      createdAt: submission.createdAt,
    });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(latestSubmissionByProductId.keys()) } },
    select: {
      id: true,
      name: true,
      companyId: true,
      summary: true,
      website: true,
      Company: {
        select: { name: true },
      },
      ProductTaxonomyAssignment: {
        include: {
          Bucket: {
            select: { title: true },
          },
        },
      },
      ProductCapabilityMap: {
        select: { capabilityKey: true },
      },
      ProductSignal: {
        orderBy: { signalKey: "asc" },
        select: {
          signalKey: true,
          valueText: true,
          valueNumber: true,
        },
      },
    },
  });

  // Products the context covers take their vendor-level results from it; any
  // other product (another vendor's) is computed here exactly as before.
  const coveredByContext = (productId: string) => context?.vendorProductIds.has(productId) ?? false;
  const latestVendorAssessmentsByProductId = context
    ? new Map<string, BriefingLatestVendorAssessment>([
        ...products.flatMap((product) => {
          const entry = coveredByContext(product.id)
            ? context.latestVendorAssessmentByProductId.get(product.id)
            : undefined;
          return entry ? [[product.id, entry] as const] : [];
        }),
        ...(await getLatestVendorAssessmentsByProductId(
          products.filter((product) => !coveredByContext(product.id)),
          context.vendorProductModuleId ? { id: context.vendorProductModuleId } : null
        )),
      ])
    : await getLatestVendorAssessmentsByProductId(products);

  // Products here may span several vendor companies, so one hoisted context is
  // not enough — but re-deriving per product is exactly what this removes. The
  // resolver gives each vendor one resolution and dies with the loop.
  const productIdsByCompany = new Map<string, string[]>();
  for (const product of products) {
    if (!product.companyId) continue;
    const bucket = productIdsByCompany.get(product.companyId) ?? [];
    bucket.push(product.id);
    productIdsByCompany.set(product.companyId, bucket);
  }
  const insightContextFor = createVendorInsightContextResolver(productIdsByCompany);

  const items = await Promise.all(
    products.map(async (product) => {
      const latestCompanyReview = latestSubmissionByProductId.get(product.id) ?? null;
      const latestVendorAssessment = latestVendorAssessmentsByProductId.get(product.id) ?? null;
      const snapshot = coveredByContext(product.id)
        ? (context?.vendorSnapshotByProductId.get(product.id) ?? null)
        : product.companyId
          ? await getVendorProductInsightSnapshot(
              product.companyId,
              product.id,
              await insightContextFor(product.companyId)
            )
          : null;

      return {
        productId: product.id,
        productName: product.name,
        vendorName: product.Company?.name ?? "Vendor",
        canonicalFirmReviewScore: latestCompanyReview?.score ?? null,
        firmReviewCount: snapshot?.firmReviewed.assessmentCount ?? 0,
        vendorSelfReportedScore: snapshot?.vendorSelfReported.latestScore ?? null,
        combinedCurrentReadout:
          snapshot?.combinedCurrentPatReadout ??
          "No product-level combined PAT readout is available yet.",
        divergenceLabel: snapshot?.divergence.label ?? "Not enough shared signal yet",
        confidenceLabel: snapshot?.confidenceLabel ?? "No live signal",
        confidenceSummary:
          snapshot?.confidenceSummary ?? "Product evidence is not yet populated enough for a grounded readout.",
        latestUpdatedAt:
          latestDate([latestCompanyReview?.createdAt ?? null, snapshot?.latestUpdatedAt ?? null]) ?? null,
        utilityLabels: snapshot?.product.utilityLabels ?? [],
        taxonomyTitles: product.ProductTaxonomyAssignment.map((entry) => entry.Bucket.title),
        capabilityKeys: product.ProductCapabilityMap.map((entry) => entry.capabilityKey),
        latestVendorAssessmentSubmittedAt: latestVendorAssessment?.submittedAt ?? null,
        openEndedResponseCount: latestVendorAssessment?.openEndedResponses.length ?? 0,
        summary: product.summary,
        website: product.website,
        productSignals: product.ProductSignal.map((signal) => ({
          key: signal.signalKey,
          valueText: signal.valueText,
          valueNumber: signal.valueNumber,
        })),
        latestVendorAssessment,
        latestCompanyReview,
        snapshot,
      };
    })
  );

  return items.sort((left, right) => left.productName.localeCompare(right.productName));
}

export async function getAdminBriefingCatalog(input?: {
  companyIds?: string[];
  context?: AdminBriefingContext;
}): Promise<BriefingCatalogItem[]> {
  const context = input?.context;
  const companies = await prisma.company.findMany({
    where: {
      type: "FIRM",
      // Data-integrity wall (CLASS 1): an EXPLICIT id list is trusted (callers
      // pass boundary-scoped ids from getVendorScopedFirms, or a single firm's
      // own id). The UNSCOPED path (no ids = "all firms") pools REAL+PILOT only
      // so demo firms never enter a customer-facing catalog average.
      ...(input?.companyIds?.length
        ? { id: { in: input.companyIds } }
        : { dataBoundary: { in: [...CUSTOMER_FACING_BOUNDARIES] } }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { User: true } },
    },
  });

  const catalog = await Promise.all(
    companies.map(async (company) => {
      const [assessmentProgress, products] = await Promise.all([
        prisma.surveySubmission.findMany({
          where: getSurveyFinalWhere({
            companyId: company.id,
            SurveyModule: { key: { in: FIRM_MODULE_DEFINITIONS.map((entry) => entry.key) } },
          }),
          orderBy: { createdAt: "desc" },
          select: {
            moduleId: true,
            score: true,
            createdAt: true,
          },
        }),
        context?.briefingProductsByFirmId?.get(company.id) ?? getBriefingProducts(company.id, context),
      ]);

      const latestSubmissionByModule = new Map<string, (typeof assessmentProgress)[number]>();
      for (const submission of assessmentProgress) {
        if (!latestSubmissionByModule.has(submission.moduleId)) {
          latestSubmissionByModule.set(submission.moduleId, submission);
        }
      }

      const latestScores = Array.from(latestSubmissionByModule.values()).map((entry) => entry.score);
      const confidence = getConfidenceFromCoverage(
        latestSubmissionByModule.size,
        FIRM_MODULE_DEFINITIONS.length,
        "The firm layer"
      );

      return {
        companyId: company.id,
        companyName: company.name,
        userCount: company._count.User,
        completedModuleCount: latestSubmissionByModule.size,
        productReviewCount: products.length,
        canonicalFirmScore: average(latestScores),
        confidenceLabel: confidence.label,
        latestUpdatedAt: latestDate([
          ...Array.from(latestSubmissionByModule.values()).map((entry) => entry.createdAt),
          ...products.map((product) => product.latestUpdatedAt),
        ]),
      } satisfies BriefingCatalogItem;
    })
  );

  return catalog;
}

export async function getAdminCompanyBriefing(
  companyId: string,
  context?: AdminBriefingContext
): Promise<AdminCompanyBriefing | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { User: true } },
    },
  });

  if (!company || company.type !== "FIRM") {
    return null;
  }

  const [firmModules, firmSubmissions, managedUsers, insightReports, ecosystemBundle, products] =
    await Promise.all([
      prisma.surveyModule.findMany({
        where: { key: { in: FIRM_MODULE_DEFINITIONS.map((entry) => entry.key) } },
        orderBy: { key: "asc" },
        select: {
          id: true,
          key: true,
          title: true,
          SurveyQuestion: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              key: true,
              prompt: true,
              inputType: true,
              weight: true,
              order: true,
              required: true,
              meta: true,
              SurveySection: {
                select: {
                  id: true,
                  key: true,
                  title: true,
                  description: true,
                  order: true,
                  utilityFamily: true,
                  utilityKey: true,
                  utilityLabel: true,
                  subcategoryKey: true,
                  subcategoryTitle: true,
                  basisKey: true,
                },
              },
            },
          },
        },
      }),
      prisma.surveySubmission.findMany({
        where: getSurveyFinalWhere({
          companyId,
          SurveyModule: { key: { in: FIRM_MODULE_DEFINITIONS.map((entry) => entry.key) } },
        }),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          moduleId: true,
          score: true,
          signalIntegrityScore: true,
          createdAt: true,
          answers: true,
        },
      }),
      getFirmManagedUserRecords(companyId, null),
      getFirmInsightReports(companyId),
      getVendorAlignmentInsightBundle(),
      context?.briefingProductsByFirmId?.get(companyId) ?? getBriefingProducts(companyId, context),
    ]);

  const moduleHeatmap = buildModuleHeatmap(firmModules as ModuleRecord[], firmSubmissions);
  const completedModuleCount = moduleHeatmap.filter((module) => module.canonicalScore !== null).length;
  const averageFirmScore = average(
    moduleHeatmap
      .map((module) => module.canonicalScore)
      .filter((score): score is number => typeof score === "number")
  );
  const strongestModule = [...moduleHeatmap]
    .filter((module) => module.canonicalScore !== null)
    .sort((left, right) => (right.canonicalScore ?? 0) - (left.canonicalScore ?? 0))[0] ?? null;
  const weakestModule = [...moduleHeatmap]
    .filter((module) => module.canonicalScore !== null)
    .sort((left, right) => (left.canonicalScore ?? 0) - (right.canonicalScore ?? 0))[0] ?? null;

  const assessedUsers = managedUsers.filter((user) => user.assessmentCount > 0);
  const individualAverageScore = average(
    assessedUsers
      .map((user) => user.latestScore)
      .filter((score): score is number => typeof score === "number")
  );
  const individualLatestUpdatedAt = latestDate(assessedUsers.map((user) => user.latestSubmittedAt));
  const individualLayer = summarizeIndividualLayer({
    totalUsers: managedUsers.length,
    assessedUsers: assessedUsers.length,
    averageScore: individualAverageScore,
    latestUpdatedAt: individualLatestUpdatedAt,
  });

  const averageProductScore = average(
    products
      .map((product) => product.canonicalFirmReviewScore)
      .filter((score): score is number => typeof score === "number")
  );
  const stackVendorCount = new Set(products.map((product) => product.vendorName)).size;
  const taxonomyBucketCount = new Set(products.flatMap((product) => product.taxonomyTitles)).size;
  const capabilityMapCount = new Set(products.flatMap((product) => product.capabilityKeys)).size;
  const productSummaryText = buildProductSummaryText(products);
  const ecosystemSummary = `The ecosystem layer uses current PAT ecosystem evidence only. The live vendor alignment engine is based on ${ecosystemBundle.sampleSize} assessed firm${
    ecosystemBundle.sampleSize === 1 ? "" : "s"
  } and ${products.length} reviewed stack product${products.length === 1 ? "" : "s"} inside this company briefing.`;

  const confidence = getOverallConfidence({
    completedModules: completedModuleCount,
    totalModules: FIRM_MODULE_DEFINITIONS.length,
    peopleAssessed: assessedUsers.length,
    productCount: products.length,
  });

  const firmInsightHighlights = Array.from(insightReports.values())
    .sort((left, right) => {
      const leftScore = left.strongestModules[0]?.score ?? 0;
      const rightScore = right.strongestModules[0]?.score ?? 0;
      return rightScore - leftScore;
    })
    .slice(0, 2)
    .map((report) => `${report.title}: ${report.currentStateSummary}`);

  const panelData = buildRiskOpportunityPanels({
    weakestModule,
    strongestModule,
    products,
    ecosystemSummary,
    individualCoverageText: individualLayer.confidence.summary,
  });
  const nextActions = buildBriefingActionPlan({
    weakestModuleTitle: weakestModule?.title ?? null,
    weakestProductTitle:
      [...products]
        .filter((product) => product.canonicalFirmReviewScore !== null)
        .sort((left, right) => (left.canonicalFirmReviewScore ?? 0) - (right.canonicalFirmReviewScore ?? 0))[0]
        ?.productName ?? null,
    missingUserCoverage: assessedUsers.length < Math.max(1, managedUsers.length),
    ecosystemCaveat: ecosystemBundle.confidenceBand === "grounded" ? null : ecosystemBundle.confidenceSummary,
  });

  return {
    company: {
      id: company.id,
      name: company.name,
      type: "FIRM",
      userCount: managedUsers.length,
      reviewedProductCount: products.length,
      latestUpdatedAt: latestDate([
        ...moduleHeatmap.map((module) => module.latestSubmittedAt),
        individualLatestUpdatedAt,
        ...products.map((product) => product.latestUpdatedAt),
      ]),
    },
    executiveSummary: {
      headline: buildExecutiveHeadline({
        companyName: company.name,
        strongestModule,
        weakestModule,
        reviewedProductCount: products.length,
      }),
      summary: `${completedModuleCount} of ${FIRM_MODULE_DEFINITIONS.length} firm modules have current submissions. ${
        products.length === 0
          ? "No product reviews are on record yet."
          : `${products.length} reviewed product${products.length === 1 ? "" : "s"} are included in the current stack.`
      } ${assessedUsers.length} user${assessedUsers.length === 1 ? "" : "s"} have person-level PAT evidence.`,
      canonicalFirmScore: averageFirmScore,
      confidenceLabel: confidence.label,
      confidenceSummary: confidence.summary,
    },
    individualLayer: {
      summary: individualLayer.summary,
      peopleAssessed: assessedUsers.length,
      totalUsers: managedUsers.length,
      averageScore: individualAverageScore,
      latestUpdatedAt: individualLatestUpdatedAt,
      confidenceLabel: individualLayer.confidence.label,
      confidenceSummary: individualLayer.confidence.summary,
      evidence: assessedUsers.slice(0, 4).map(
        (user) =>
          `${user.email}: latest raw score ${user.latestScore ?? "--"}%${
            user.latestSubmittedAt ? ` on ${user.latestSubmittedAt.toLocaleDateString()}` : ""
          }.`
      ),
    },
    firmLayer: {
      summary:
        completedModuleCount === 0
          ? "No completed firm alignment modules are available yet."
          : `The current firm PAT layer averages ${averageFirmScore === null ? "--" : `${Math.round(averageFirmScore)}%`} across ${completedModuleCount} completed module${completedModuleCount === 1 ? "" : "s"}. ${
              strongestModule
                ? `${strongestModule.title} is strongest at ${Math.round(strongestModule.canonicalScore ?? 0)}%. `
                : ""
            }${
              weakestModule
                ? `${weakestModule.title} is the current low point at ${Math.round(weakestModule.canonicalScore ?? 0)}%.`
                : ""
            }`.trim(),
      averageScore: averageFirmScore,
      completedModuleCount,
      moduleHeatmap,
      evidence: firmInsightHighlights.length > 0 ? firmInsightHighlights : ["No firm insight narratives are available yet."],
    },
    productLayer: {
      summary: productSummaryText,
      averageFirmReviewScore: averageProductScore,
      reviewedProductCount: products.length,
      products: products.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        vendorName: product.vendorName,
        canonicalFirmReviewScore: product.canonicalFirmReviewScore,
        firmReviewCount: product.firmReviewCount,
        vendorSelfReportedScore: product.vendorSelfReportedScore,
        combinedCurrentReadout: product.combinedCurrentReadout,
        divergenceLabel: product.divergenceLabel,
        confidenceLabel: product.confidenceLabel,
        confidenceSummary: product.confidenceSummary,
        latestUpdatedAt: product.latestUpdatedAt,
        utilityLabels: product.utilityLabels,
        taxonomyTitles: product.taxonomyTitles,
        capabilityKeys: product.capabilityKeys,
        latestVendorAssessmentSubmittedAt: product.latestVendorAssessmentSubmittedAt,
        openEndedResponseCount: product.openEndedResponseCount,
      })),
      openEndedResponses: products.flatMap((product) => product.latestVendorAssessment?.openEndedResponses ?? []),
      evidence: products.slice(0, 3).map(
        (product) =>
          `${product.productName}: firm raw score ${product.canonicalFirmReviewScore ?? "--"}%, vendor self-report ${
            product.vendorSelfReportedScore ?? "--"
          }%, ${product.divergenceLabel.toLowerCase()}.`
      ),
    },
    ecosystemLayer: {
      summary: ecosystemSummary,
      stackVendorCount,
      taxonomyBucketCount,
      capabilityMapCount,
      confidenceLabel: ecosystemBundle.confidenceLabel,
      confidenceSummary: ecosystemBundle.confidenceSummary,
      evidence: ecosystemBundle.reports
        .filter((report) => !report.locked)
        .slice(0, 3)
        .map((report) => `${report.title}: ${report.currentStateSummary}`),
    },
    insightNarrative: buildNarrative({
      companyName: company.name,
      firmSummary:
        completedModuleCount === 0
          ? "The firm layer is not yet populated."
          : `Firm signal is led by ${strongestModule?.title ?? "the strongest module"} and constrained by ${weakestModule?.title ?? "the weakest module"}.`,
      individualSummary: individualLayer.summary,
      productSummary: productSummaryText,
      ecosystemSummary,
    }),
    risks: panelData.risks,
    opportunities: panelData.opportunities,
    nextActions,
    confidenceAppendix: [
      {
        layer: "Executive",
        sampleSize: completedModuleCount + assessedUsers.length + products.length,
        confidenceLabel: confidence.label,
        confidenceSummary: confidence.summary,
        latestUpdatedAt: latestDate([
          ...moduleHeatmap.map((module) => module.latestSubmittedAt),
          individualLatestUpdatedAt,
          ...products.map((product) => product.latestUpdatedAt),
        ]),
        canonicalScore: averageFirmScore,
        caveats: [
          "Executive confidence reflects evidence coverage, not a blended score.",
          "Canonical PAT score remains the raw firm module score average shown separately here.",
        ],
      },
      {
        layer: "Individual",
        sampleSize: assessedUsers.length,
        confidenceLabel: individualLayer.confidence.label,
        confidenceSummary: individualLayer.confidence.summary,
        latestUpdatedAt: individualLatestUpdatedAt,
        canonicalScore: individualAverageScore,
        caveats: assessedUsers.length === 0 ? ["No person-level PAT submissions are available yet."] : [],
      },
      {
        layer: "Firm",
        sampleSize: completedModuleCount,
        confidenceLabel: getConfidenceFromCoverage(completedModuleCount, FIRM_MODULE_DEFINITIONS.length, "The firm layer").label,
        confidenceSummary: getConfidenceFromCoverage(completedModuleCount, FIRM_MODULE_DEFINITIONS.length, "The firm layer").summary,
        latestUpdatedAt: latestDate(moduleHeatmap.map((module) => module.latestSubmittedAt)),
        canonicalScore: averageFirmScore,
        caveats: [
          "Firm canonical score is the raw module score from PAT submissions.",
          "Signal integrity remains separate in the module heatmap.",
        ],
      },
      {
        layer: "Product",
        sampleSize: products.length,
        confidenceLabel: getConfidenceFromCoverage(products.length, Math.max(1, products.length), "The product layer").label,
        confidenceSummary:
          products.length === 0
            ? "No firm-reviewed products are currently available."
            : "Product confidence depends on firm review count and vendor/firm signal alignment per product.",
        latestUpdatedAt: latestDate(products.map((product) => product.latestUpdatedAt)),
        canonicalScore: averageProductScore,
        caveats: [
          "Combined product interpretation does not replace the canonical firm review score.",
          "Vendor self-report and firm-reviewed product signal stay explicitly separate.",
        ],
      },
      {
        layer: "Ecosystem",
        sampleSize: ecosystemBundle.sampleSize,
        confidenceLabel: ecosystemBundle.confidenceLabel,
        confidenceSummary: ecosystemBundle.confidenceSummary,
        latestUpdatedAt: ecosystemBundle.latestUpdatedAt,
        canonicalScore: ecosystemBundle.averageModuleScore,
        caveats: ecosystemBundle.averageModuleScore === null
          ? ["No PAT ecosystem aggregate is available yet."]
          : ["The ecosystem layer is current-state PAT context only, not a benchmark or forecast."],
      },
    ],
  };
}

export async function getAdminProductBriefing(
  companyId: string,
  productId: string
): Promise<AdminProductBriefing | null> {
  const briefing = await getAdminCompanyBriefing(companyId);
  if (!briefing) {
    return null;
  }

  const products = await getBriefingProducts(companyId);
  const product = products.find((entry) => entry.productId === productId);
  if (!product) {
    return null;
  }

  const productRisks: BriefingRiskOpportunity[] = [
    {
      layer: "product",
      title: `${product.productName} calibration risk`,
      detail:
        product.divergenceLabel === "Not enough shared signal yet"
          ? "Vendor self-reported and firm-reviewed evidence are not both populated yet, so this product remains sample-thin."
          : `${product.productName} currently reads as: ${product.divergenceLabel}.`,
    },
  ];

  const productOpportunities: BriefingRiskOpportunity[] = [
    {
      layer: "product",
      title: `${product.productName} next-use opportunity`,
      detail:
        product.utilityLabels.length > 0
          ? `${product.productName} is already tied to ${product.utilityLabels.join(", ")} in the PAT utility model, so the next product cycle can stay inside declared scope.`
          : `${product.productName} still needs clearer feature evidence before the next product cycle becomes richer.`,
    },
  ];

  return {
    company: {
      id: briefing.company.id,
      name: briefing.company.name,
    },
    product: {
      productId: product.productId,
      productName: product.productName,
      vendorName: product.vendorName,
      canonicalFirmReviewScore: product.canonicalFirmReviewScore,
      firmReviewCount: product.firmReviewCount,
      vendorSelfReportedScore: product.vendorSelfReportedScore,
      combinedCurrentReadout: product.combinedCurrentReadout,
      divergenceLabel: product.divergenceLabel,
      confidenceLabel: product.confidenceLabel,
      confidenceSummary: product.confidenceSummary,
      latestUpdatedAt: product.latestUpdatedAt,
      utilityLabels: product.utilityLabels,
      taxonomyTitles: product.taxonomyTitles,
      capabilityKeys: product.capabilityKeys,
      latestVendorAssessmentSubmittedAt: product.latestVendorAssessmentSubmittedAt,
      openEndedResponseCount: product.openEndedResponseCount,
      summary: product.summary,
      website: product.website,
      productSignals: product.productSignals,
    },
    latestCompanyReview: {
      canonicalScore: product.latestCompanyReview?.score ?? null,
      confidenceScore: product.latestCompanyReview?.signalIntegrityScore ?? null,
      submittedAt: product.latestCompanyReview?.createdAt ?? null,
    },
    latestVendorAssessment: {
      submittedAt: product.latestVendorAssessment?.submittedAt ?? null,
      responseCount: product.latestVendorAssessment?.openEndedResponses.length ?? 0,
      openEndedResponses: product.latestVendorAssessment?.openEndedResponses ?? [],
    },
    narrative: `${product.productName} is currently summarized from the company's latest raw firm review score of ${
      product.latestCompanyReview?.score ?? "--"
    }%, vendor self-reported signal of ${product.vendorSelfReportedScore ?? "--"}%, and the shared product insight confidence label of ${
      product.confidenceLabel
    }. ${product.combinedCurrentReadout}`,
    risks: productRisks,
    opportunities: productOpportunities,
    confidenceAppendix: [
      {
        layer: "Product detail",
        sampleSize: product.firmReviewCount,
        confidenceLabel: product.confidenceLabel,
        confidenceSummary: product.confidenceSummary,
        latestUpdatedAt: product.latestUpdatedAt,
        canonicalScore: product.canonicalFirmReviewScore,
        caveats: [
          "Canonical firm review score stays separate from confidence.",
          "Vendor self-report is displayed as supporting evidence, not as the canonical firm score.",
        ],
      },
    ],
  };
}
