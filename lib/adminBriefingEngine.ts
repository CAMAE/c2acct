import { Prisma, QuestionInputType } from "@prisma/client";
import { normalizeQuestionRuntime, type NormalizedAnswer } from "@/lib/assessmentRuntime";
import { getFirmInsightReports } from "@/lib/firmInsightEngine";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_PRODUCT_MODULE_KEY,
} from "@/lib/firmPat";
import prisma from "@/lib/prisma";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { getFirmManagedUserRecords } from "@/lib/userPat";
import { getVendorAlignmentInsightBundle } from "@/lib/vendorAlignmentInsightEngine";
import { getVendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

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
  narrative: string;
  risks: BriefingRiskOpportunity[];
  opportunities: BriefingRiskOpportunity[];
  confidenceAppendix: BriefingConfidenceEntry[];
};

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
      label: "No live signal",
      summary: `${label} has no completed PAT evidence yet.`,
    };
  }
  if (sampleSize < Math.max(1, Math.ceil(completeTarget / 2))) {
    return {
      band: "directional",
      label: "Directional",
      summary: `${label} is based on ${sampleSize} completed data point${sampleSize === 1 ? "" : "s"}, so it remains directional.`,
    };
  }
  if (sampleSize < completeTarget) {
    return {
      band: "emerging",
      label: "Emerging signal",
      summary: `${label} covers ${sampleSize} of ${completeTarget} expected data points and is useful, but still incomplete.`,
    };
  }
  return {
    band: "grounded",
    label: "Grounded current-state signal",
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
      label: "Directional",
      summary: "The briefing is usable for triage, but multiple evidence layers are still thin.",
    };
  }
  if (signalPoints <= 4) {
    return {
      band: "emerging" as const,
      label: "Emerging signal",
      summary: "The briefing has meaningful evidence, but at least one layer remains sample-thin or incomplete.",
    };
  }
  return {
    band: "grounded" as const,
    label: "Grounded current-state signal",
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
        ? "Close the person-level evidence gap"
        : "Stabilize the weakest operating section",
      detail: input.missingUserCoverage
        ? "Get more individual PAT submissions in place so the briefing stops relying only on firm-level operating evidence."
        : `Use the weakest firm module, ${input.weakestModuleTitle ?? "the current constraint module"}, as the first operating workstream.`,
      evidence: input.missingUserCoverage
        ? "Individual layer sample size is currently thin."
        : `Firm layer weakness is concentrated in ${input.weakestModuleTitle ?? "the weakest module"}.`,
    },
    {
      window: "60 days",
      title: "Work through product-stack friction",
      detail: input.weakestProductTitle
        ? `Use ${input.weakestProductTitle} as the priority product review and remediation track, then compare the next firm review against the current PAT readout.`
        : "Add at least one firm-side product review so the product layer becomes decision-usable.",
      evidence: input.weakestProductTitle
        ? `${input.weakestProductTitle} is the weakest current product signal in the stack.`
        : "No reviewed products are currently available.",
    },
    {
      window: "90 days",
      title: "Re-run the integrated PAT briefing",
      detail: input.ecosystemCaveat
        ? "Refresh the briefing after the next round of firm, user, and product submissions so ecosystem interpretation becomes less directional."
        : "Refresh the briefing after action owners complete the first remediation cycle and check whether the same risks still dominate.",
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

async function getBriefingProducts(companyId: string) {
  const firmModule = await prisma.surveyModule.findUnique({
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

  const items = await Promise.all(
    products.map(async (product) => {
      const latestCompanyReview = latestSubmissionByProductId.get(product.id) ?? null;
      const snapshot =
        product.companyId ? await getVendorProductInsightSnapshot(product.companyId, product.id) : null;

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
        summary: product.summary,
        website: product.website,
        productSignals: product.ProductSignal.map((signal) => ({
          key: signal.signalKey,
          valueText: signal.valueText,
          valueNumber: signal.valueNumber,
        })),
        latestCompanyReview,
        snapshot,
      };
    })
  );

  return items.sort((left, right) => left.productName.localeCompare(right.productName));
}

export async function getAdminBriefingCatalog(): Promise<BriefingCatalogItem[]> {
  const companies = await prisma.company.findMany({
    where: { type: "FIRM" },
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
        getBriefingProducts(company.id),
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

export async function getAdminCompanyBriefing(companyId: string): Promise<AdminCompanyBriefing | null> {
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
      getBriefingProducts(companyId),
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
      })),
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
          : `${product.productName} still needs clearer utility evidence before the next product cycle becomes richer.`,
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
      summary: product.summary,
      website: product.website,
      productSignals: product.productSignals,
    },
    latestCompanyReview: {
      canonicalScore: product.latestCompanyReview?.score ?? null,
      confidenceScore: product.latestCompanyReview?.signalIntegrityScore ?? null,
      submittedAt: product.latestCompanyReview?.createdAt ?? null,
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
