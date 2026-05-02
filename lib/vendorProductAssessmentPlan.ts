import type {
  ProductProfileFieldKey,
  ProductQuestionBasisKey,
} from "@/lib/productUtilityRegistry";
import {
  buildProductAssessmentPlan,
  type ProductAssessmentPlan,
  type ProductAssessmentQuestion,
  type ProductAssessmentPerspective,
} from "@/lib/vendorProductQuestionBank";

export type VendorProductProfileInput = {
  productName: string;
  productDescription: string;
  logoReference: string;
  positioning: string;
  targetCustomer: string;
  targetUseContext: string;
  implementationStyle: string;
  operatingModelFit: string;
  primaryBuyer: string;
  integrationPosture: string;
};

export type VendorProductProfileRecord = {
  logoUrl: string | null;
  logoAssetRef: string | null;
  positioning: string | null;
  targetCustomer: string | null;
  targetUseContext: string | null;
  implementationStyle: string | null;
  operatingModelFit: string | null;
  primaryBuyer: string | null;
  integrationPosture: string | null;
};

export const VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE = 10;
export const VENDOR_PRODUCT_MAX_BROWSER_SESSION_QUESTIONS = 500;

export type VendorProductAssessmentPageEntry =
  | {
      key: string;
      kind: "profile" | "score" | "open-ended";
      question: ProductAssessmentQuestion;
    }
  | {
      key: "utility-declaration";
      kind: "utility-declaration";
    };

export type VendorProductAssessmentPage = {
  key: string;
  index: number;
  kind: "profile" | "score" | "open-ended";
  title: string;
  description: string;
  entries: VendorProductAssessmentPageEntry[];
  questionCount: number;
  questionIds: string[];
};

export type VendorProductAssessmentPagePlan = {
  version: string;
  pageSize: number;
  profileQuestions: ProductAssessmentQuestion[];
  scoredQuestions: ProductAssessmentQuestion[];
  openEndedQuestions: ProductAssessmentQuestion[];
  pages: VendorProductAssessmentPage[];
};

export type VendorProductAssessmentQuestionLoad = {
  totalQuestionCount: number;
  maxBrowserSessionQuestionCount: number;
  pageCount: number;
  pageSize: number;
  safeForBrowserSession: boolean;
};

export type VendorAdaptiveOpenEndedQuestionSnapshot = {
  id: string;
  key: string;
  prompt: string;
  order: number;
  sectionKey: string;
  sectionTitle: string;
  sectionDescription: string;
};

type VendorProductAssessmentEvidenceInput = {
  profile?: Partial<Record<keyof VendorProductProfileInput, string | null | undefined>>;
  answers?: Record<string, number>;
};

export const VENDOR_PRODUCT_PROFILE_FIELD_ORDER: ProductProfileFieldKey[] = [
  "productName",
  "productDescription",
  "logoReference",
  "positioning",
  "targetCustomer",
  "targetUseContext",
  "implementationStyle",
  "operatingModelFit",
  "primaryBuyer",
  "integrationPosture",
];

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function chunkQuestions<T>(questions: T[], pageSize: number) {
  const pages: T[][] = [];

  for (let index = 0; index < questions.length; index += pageSize) {
    pages.push(questions.slice(index, index + pageSize));
  }

  return pages;
}

function buildQuestionEntries(
  kind: "profile" | "score" | "open-ended",
  questions: ProductAssessmentQuestion[]
): VendorProductAssessmentPageEntry[] {
  return questions.map((question) => ({
    key: question.id,
    kind,
    question,
  }));
}

export function getVendorProductAssessmentQuestionLoad(
  pagePlan: Pick<
    VendorProductAssessmentPagePlan,
    "profileQuestions" | "scoredQuestions" | "openEndedQuestions" | "pages" | "pageSize"
  >
): VendorProductAssessmentQuestionLoad {
  const totalQuestionCount =
    pagePlan.profileQuestions.length +
    pagePlan.scoredQuestions.length +
    pagePlan.openEndedQuestions.length;

  return {
    totalQuestionCount,
    maxBrowserSessionQuestionCount: VENDOR_PRODUCT_MAX_BROWSER_SESSION_QUESTIONS,
    pageCount: pagePlan.pages.length,
    pageSize: pagePlan.pageSize,
    safeForBrowserSession: totalQuestionCount <= VENDOR_PRODUCT_MAX_BROWSER_SESSION_QUESTIONS,
  };
}

type SectionFact = {
  key: string;
  title: string;
  average: number;
};

type UtilityFact = {
  key: string;
  label: string;
  average: number;
};

type QuestionFact = {
  question: ProductAssessmentQuestion;
  score: number;
};

const IMPLEMENTATION_FOCUS_BASIS_KEYS: ProductQuestionBasisKey[] = [
  "implementation-friction",
  "training-onboarding",
  "configuration-depth",
];

const CHANGE_FOCUS_BASIS_KEYS: ProductQuestionBasisKey[] = [
  "adoption-ease",
  "training-onboarding",
  "workflow-fit",
];

const INTEGRATION_FOCUS_BASIS_KEYS: ProductQuestionBasisKey[] = [
  "integration-readiness",
  "reporting-visibility",
];

const CONTROL_FOCUS_BASIS_KEYS: ProductQuestionBasisKey[] = [
  "support-trust",
  "configuration-depth",
  "operational-dependence",
];

function formatAverageScore(score: number) {
  return score.toFixed(1);
}

function formatBasisLabel(basisKey: ProductQuestionBasisKey | undefined) {
  switch (basisKey) {
    case "workflow-fit":
      return "workflow fit";
    case "integration-readiness":
      return "integration readiness";
    case "implementation-friction":
      return "implementation friction";
    case "configuration-depth":
      return "configuration depth";
    case "training-onboarding":
      return "training and onboarding";
    case "support-trust":
      return "support and trust";
    case "reporting-visibility":
      return "reporting visibility";
    case "operational-dependence":
      return "operational dependence";
    case "adoption-ease":
      return "adoption ease";
    case "value-clarity":
      return "value clarity";
    default:
      return "current evidence";
  }
}

function getSectionFacts(scoredQuestions: ProductAssessmentQuestion[], answers: Record<string, number>) {
  const grouped = new Map<
    string,
    {
      title: string;
      scores: number[];
    }
  >();

  scoredQuestions.forEach((question) => {
    const score = answers[question.id];
    if (typeof score !== "number") {
      return;
    }

    const current = grouped.get(question.section.key);
    if (current) {
      current.scores.push(score);
      return;
    }

    grouped.set(question.section.key, {
      title: question.section.title,
      scores: [score],
    });
  });

  return Array.from(grouped.entries()).map(([key, value]) => ({
    key,
    title: value.title,
    average: value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length,
  }));
}

function getUtilityFacts(scoredQuestions: ProductAssessmentQuestion[], answers: Record<string, number>) {
  const grouped = new Map<
    string,
    {
      label: string;
      scores: number[];
    }
  >();

  scoredQuestions.forEach((question) => {
    const score = answers[question.id];
    if (typeof score !== "number" || !question.utilityKey || !question.utilityLabel) {
      return;
    }

    const current = grouped.get(question.utilityKey);
    if (current) {
      current.scores.push(score);
      return;
    }

    grouped.set(question.utilityKey, {
      label: question.utilityLabel,
      scores: [score],
    });
  });

  return Array.from(grouped.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    average: value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length,
  }));
}

function getQuestionFacts(scoredQuestions: ProductAssessmentQuestion[], answers: Record<string, number>) {
  return scoredQuestions
    .map((question) => {
      const score = answers[question.id];
      return typeof score === "number" ? ({ question, score } satisfies QuestionFact) : null;
    })
    .filter((entry): entry is QuestionFact => Boolean(entry));
}

function pickSection(sectionFacts: SectionFact[], direction: "strongest" | "weakest") {
  return [...sectionFacts].sort((left, right) => {
    if (left.average !== right.average) {
      return direction === "strongest" ? right.average - left.average : left.average - right.average;
    }

    return left.title.localeCompare(right.title);
  })[0] ?? null;
}

function pickUtility(utilityFacts: UtilityFact[], direction: "strongest" | "weakest") {
  return [...utilityFacts].sort((left, right) => {
    if (left.average !== right.average) {
      return direction === "strongest" ? right.average - left.average : left.average - right.average;
    }

    return left.label.localeCompare(right.label);
  })[0] ?? null;
}

function pickWeakestQuestionForBasis(
  questionFacts: QuestionFact[],
  basisKeys: ProductQuestionBasisKey[]
) {
  return [...questionFacts]
    .filter((fact) => fact.question.section.basisKey && basisKeys.includes(fact.question.section.basisKey))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      const leftBasisRank = basisKeys.indexOf(left.question.section.basisKey ?? basisKeys[0]);
      const rightBasisRank = basisKeys.indexOf(right.question.section.basisKey ?? basisKeys[0]);
      if (leftBasisRank !== rightBasisRank) {
        return leftBasisRank - rightBasisRank;
      }

      return left.question.section.title.localeCompare(right.question.section.title);
    })[0] ?? null;
}

function describeQuestionFocus(questionFact: QuestionFact | null) {
  if (!questionFact) {
    return null;
  }

  return `${questionFact.question.section.title} (${formatBasisLabel(questionFact.question.section.basisKey)} scored ${questionFact.score}/5)`;
}

function getSuggestedNextAction(input: {
  strongestSection: SectionFact | null;
  weakestSection: SectionFact | null;
}) {
  const strongestAverage = input.strongestSection?.average ?? null;
  const weakestAverage = input.weakestSection?.average ?? null;

  if (strongestAverage === null || weakestAverage === null) {
    return "gather evidence";
  }

  if (weakestAverage < 2) {
    return "narrow scope";
  }

  if (strongestAverage >= 4 && weakestAverage >= 3.5) {
    return "continue";
  }

  if (strongestAverage - weakestAverage >= 1.5) {
    return "reposition";
  }

  return "gather evidence";
}

export function buildVendorAdaptiveOpenEndedQuestions(input: {
  selectedUtilityKeys: string[];
  profile?: Partial<Record<keyof VendorProductProfileInput, string | null | undefined>>;
  answers?: Record<string, number>;
}) {
  const basePlan = buildProductAssessmentPlan({
    perspective: "vendor",
    selectedUtilityKeys: input.selectedUtilityKeys,
    includeProductGeneral: true,
    includeOpenEnded: true,
  });
  const baseOpenEndedQuestions =
    basePlan.modules.find((module) => module.kind === "open-ended")?.questions ?? [];
  const scoredQuestions = basePlan.modules
    .filter((module) => module.kind === "utility")
    .flatMap((module) => module.questions);
  const normalizedProfile = normalizeVendorProductProfileInput(input.profile ?? {});
  const answers = input.answers ?? {};
  const sectionFacts = getSectionFacts(scoredQuestions, answers);
  const utilityFacts = getUtilityFacts(scoredQuestions, answers);
  const questionFacts = getQuestionFacts(scoredQuestions, answers);
  const strongestSection = pickSection(sectionFacts, "strongest");
  const weakestSection = pickSection(sectionFacts, "weakest");
  const strongestUtility = pickUtility(utilityFacts, "strongest");
  const weakestUtility = pickUtility(utilityFacts, "weakest");
  const implementationFocus = describeQuestionFocus(
    pickWeakestQuestionForBasis(questionFacts, IMPLEMENTATION_FOCUS_BASIS_KEYS)
  );
  const changeFocus = describeQuestionFocus(
    pickWeakestQuestionForBasis(questionFacts, CHANGE_FOCUS_BASIS_KEYS)
  );
  const integrationFocus = describeQuestionFocus(
    pickWeakestQuestionForBasis(questionFacts, INTEGRATION_FOCUS_BASIS_KEYS)
  );
  const controlFocus = describeQuestionFocus(
    pickWeakestQuestionForBasis(questionFacts, CONTROL_FOCUS_BASIS_KEYS)
  );
  const suggestedNextAction = getSuggestedNextAction({
    strongestSection,
    weakestSection,
  });

  return baseOpenEndedQuestions.map((question) => {
    let prompt = question.prompt;

    switch (question.key) {
      case "strongest_workflow":
        if (strongestSection) {
          prompt = `PAT currently scores ${strongestSection.title} as the strongest active feature section (${formatAverageScore(strongestSection.average)}/5). What concrete workflow evidence supports that stronger read today?`;
        }
        break;
      case "weakest_workflow":
        if (weakestSection) {
          prompt = `PAT currently scores ${weakestSection.title} as the weakest active feature section (${formatAverageScore(weakestSection.average)}/5). What evidence gap, operating limit, or unresolved exception pattern drives that weaker read today?`;
        }
        break;
      case "implementation_risk":
        if (implementationFocus) {
          prompt = `PAT currently sees the most implementation pressure in ${implementationFocus}. What rollout or implementation risk matters most before this product should be treated as stronger than directional?`;
        }
        break;
      case "change_management_risk":
        if (changeFocus) {
          const audience = normalizedProfile.primaryBuyer || normalizedProfile.targetCustomer || "the real user and buyer set";
          prompt = `PAT currently sees the most adoption pressure in ${changeFocus}. For ${audience}, what change-management risk is most likely to slow adoption?`;
        }
        break;
      case "integration_gap":
        if (integrationFocus) {
          const posture = normalizedProfile.integrationPosture || "the current integration posture";
          prompt = `PAT currently sees the most integration pressure in ${integrationFocus}. Given ${posture}, what integration, data, or interoperability gap matters most before PAT should treat this product as stronger than directional?`;
        }
        break;
      case "control_concern":
        if (controlFocus) {
          prompt = `PAT currently sees the most control pressure in ${controlFocus}. What control, approval, auditability, or governance concern deserves explicit follow-up?`;
        }
        break;
      case "best_fit_customer":
        if (strongestUtility) {
          const targetCustomer = normalizedProfile.targetCustomer || "the declared target customer";
          prompt = `PAT currently sees the strongest feature read in ${strongestUtility.label} (${formatAverageScore(strongestUtility.average)}/5). Based on that evidence and the declared target customer (${targetCustomer}), who looks like the best-fit customer or operator for this product today?`;
        }
        break;
      case "poor_fit_customer":
        if (weakestUtility) {
          const operatingModelFit = normalizedProfile.operatingModelFit || "the declared operating-model fit";
          prompt = `PAT currently sees the weakest feature read in ${weakestUtility.label} (${formatAverageScore(weakestUtility.average)}/5). Based on that evidence and ${operatingModelFit}, who looks like the poorest-fit customer or operator for this product today, and why?`;
        }
        break;
      case "evidence_needed_next":
        if (weakestSection) {
          prompt = `PAT's weakest current section is ${weakestSection.title} (${formatAverageScore(weakestSection.average)}/5). What additional evidence would most improve confidence, calibration, or operator usefulness in that area next?`;
        }
        break;
      case "recommended_next_action":
        if (strongestSection && weakestSection) {
          prompt = `PAT's current read suggests ${suggestedNextAction} next, with ${strongestSection.title} at ${formatAverageScore(strongestSection.average)}/5 and ${weakestSection.title} at ${formatAverageScore(weakestSection.average)}/5. What is the single most sensible next action after this review, and why?`;
        }
        break;
      default:
        break;
    }

    return {
      ...question,
      prompt,
    };
  });
}

export function serializeVendorAdaptiveOpenEndedQuestionSnapshot(input: {
  selectedUtilityKeys: string[];
  profile?: Partial<Record<keyof VendorProductProfileInput, string | null | undefined>>;
  answers?: Record<string, number>;
}): VendorAdaptiveOpenEndedQuestionSnapshot[] {
  return buildVendorAdaptiveOpenEndedQuestions(input).map((question) => ({
    id: question.id,
    key: question.key,
    prompt: question.prompt,
    order: question.order,
    sectionKey: question.section.key,
    sectionTitle: question.section.title,
    sectionDescription: question.section.description,
  }));
}

export function buildVendorProductAssessmentPlan(
  selectedUtilityKeys: string[],
  evidence?: VendorProductAssessmentEvidenceInput
) {
  const plan = buildProductAssessmentPlan({
    perspective: "vendor",
    selectedUtilityKeys,
    includeProductGeneral: true,
    includeOpenEnded: true,
  });
  const adaptiveOpenEndedQuestions =
    selectedUtilityKeys.length > 0
      ? buildVendorAdaptiveOpenEndedQuestions({
          selectedUtilityKeys,
          profile: evidence?.profile,
          answers: evidence?.answers,
        })
      : plan.modules.find((module) => module.kind === "open-ended")?.questions ?? [];

  return {
    ...plan,
    modules: plan.modules.map((module) =>
      module.kind === "open-ended"
        ? {
            ...module,
            description:
              "Final text questions derived deterministically from the declared feature scope, scored PAT results, and product profile context.",
            questions: adaptiveOpenEndedQuestions,
          }
        : module
    ),
  };
}

export function buildVendorProductAssessmentPagePlan(input: {
  assessmentPlan: ProductAssessmentPlan;
  pageSize?: number;
}): VendorProductAssessmentPagePlan {
  const pageSize = input.pageSize ?? VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE;
  const profileQuestions =
    input.assessmentPlan.modules.find((module) => module.kind === "general")?.questions ?? [];
  const scoredQuestions = input.assessmentPlan.modules
    .filter((module) => module.kind === "utility")
    .flatMap((module) => module.questions);
  const openEndedQuestions = input.assessmentPlan.modules
    .filter((module) => module.kind === "open-ended")
    .flatMap((module) => module.questions);

  const pages: VendorProductAssessmentPage[] = [
    {
      key: "product-profile",
      index: 1,
      kind: "profile",
      title: "Product profile and feature declaration",
      description:
        "Capture the stable product profile first, then declare the features that activate the scored PAT question set.",
      entries: [
        ...buildQuestionEntries("profile", profileQuestions),
        {
          key: "utility-declaration",
          kind: "utility-declaration",
        },
      ],
      questionCount: profileQuestions.length,
      questionIds: profileQuestions.map((question) => question.id),
    },
  ];

  let pageIndex = 2;

  chunkQuestions(scoredQuestions, pageSize).forEach((questions, chunkIndex, chunks) => {
    pages.push({
      key: `utility-scoring-${chunkIndex + 1}`,
      index: pageIndex,
      kind: "score",
      title: chunks.length === 1 ? "Feature scoring" : `Feature scoring page ${chunkIndex + 1}`,
      description:
        "Work through the active feature-scored questions in focused 10-question pages while PAT preserves the declared feature scope.",
      entries: buildQuestionEntries("score", questions),
      questionCount: questions.length,
      questionIds: questions.map((question) => question.id),
    });
    pageIndex += 1;
  });

  chunkQuestions(openEndedQuestions, pageSize).forEach((questions, chunkIndex, chunks) => {
    pages.push({
      key: `open-ended-${chunkIndex + 1}`,
      index: pageIndex,
      kind: "open-ended",
      title: chunks.length === 1 ? "Open-ended responses" : `Open-ended responses page ${chunkIndex + 1}`,
      description:
        "Keep the narrative PAT context in the same flow with deterministic follow-up prompts tied to the selected features, scored results, and product profile.",
      entries: buildQuestionEntries("open-ended", questions),
      questionCount: questions.length,
      questionIds: questions.map((question) => question.id),
      });
    pageIndex += 1;
  });

  return {
    version: input.assessmentPlan.version,
    pageSize,
    profileQuestions,
    scoredQuestions,
    openEndedQuestions,
    pages,
  };
}

export function serializeProductAssessmentPlan(input: {
  perspective: ProductAssessmentPerspective;
  selectedUtilityKeys: string[];
  includeProductGeneral?: boolean;
  includeOpenEnded?: boolean;
}) {
  const plan = buildProductAssessmentPlan({
    perspective: input.perspective,
    selectedUtilityKeys: input.selectedUtilityKeys,
    includeProductGeneral: input.includeProductGeneral,
    includeOpenEnded: input.includeOpenEnded,
  });

  return {
    plan,
    registryVersion: plan.version,
    selectedUtilityKeys: input.selectedUtilityKeys,
    generatedQuestionIds: plan.modules.flatMap((module) => module.questions.map((question) => question.id)),
    profileQuestionIds:
      plan.modules.find((module) => module.kind === "general")?.questions.map((question) => question.id) ?? [],
    scoredQuestionIds: plan.modules
      .filter((module) => module.kind === "utility")
      .flatMap((module) => module.questions.map((question) => question.id)),
    openEndedQuestionIds:
      plan.modules.find((module) => module.kind === "open-ended")?.questions.map((question) => question.id) ?? [],
    moduleOrder: plan.modules.map((module) => module.key),
    sectionOrder: plan.modules.flatMap((module) => module.sections.map((section) => section.key)),
    modulePlan: plan.modules.map((module) => ({
      key: module.key,
      title: module.title,
      description: module.description,
      kind: module.kind,
      utilityKey: module.utilityKey ?? null,
      sectionKeys: module.sections.map((section) => section.key),
      questionIds: module.questions.map((question) => question.id),
    })),
    sectionPlan: plan.modules.flatMap((module) =>
      module.sections.map((section) => ({
        key: section.key,
        moduleKey: module.key,
        moduleKind: module.kind,
        title: section.title,
        description: section.description,
        order: section.order,
        utilityFamily: section.utilityFamily ?? null,
        utilityKey: section.utilityKey ?? null,
        utilityLabel: section.utilityLabel ?? null,
        subcategoryKey: section.subcategoryKey ?? null,
        subcategoryTitle: section.subcategoryTitle ?? null,
        basisKey: section.basisKey ?? null,
        questionIds: section.questionIds,
      }))
    ),
  };
}

export function serializeVendorProductAssessmentPlan(selectedUtilityKeys: string[]) {
  return serializeProductAssessmentPlan({
    perspective: "vendor",
    selectedUtilityKeys,
    includeProductGeneral: true,
    includeOpenEnded: true,
  });
}

export function getVendorProductProfileQuestions() {
  const plan = buildVendorProductAssessmentPlan([]);
  return plan.modules.find((module) => module.kind === "general")?.questions ?? [];
}

export function getInitialVendorProductProfile(input: {
  product: {
    name: string;
    summary: string | null;
  };
  profile: VendorProductProfileRecord | null;
}): VendorProductProfileInput {
  const profile = input.profile;

  return {
    productName: normalizeText(input.product.name),
    productDescription: normalizeText(input.product.summary),
    logoReference: normalizeText(profile?.logoUrl ?? profile?.logoAssetRef),
    positioning: normalizeText(profile?.positioning),
    targetCustomer: normalizeText(profile?.targetCustomer),
    targetUseContext: normalizeText(profile?.targetUseContext),
    implementationStyle: normalizeText(profile?.implementationStyle),
    operatingModelFit: normalizeText(profile?.operatingModelFit),
    primaryBuyer: normalizeText(profile?.primaryBuyer),
    integrationPosture: normalizeText(profile?.integrationPosture),
  };
}

export function normalizeVendorProductProfileInput(
  input: Partial<Record<keyof VendorProductProfileInput, string | null | undefined>>
): VendorProductProfileInput {
  return {
    productName: normalizeText(input.productName),
    productDescription: normalizeText(input.productDescription),
    logoReference: normalizeText(input.logoReference),
    positioning: normalizeText(input.positioning),
    targetCustomer: normalizeText(input.targetCustomer),
    targetUseContext: normalizeText(input.targetUseContext),
    implementationStyle: normalizeText(input.implementationStyle),
    operatingModelFit: normalizeText(input.operatingModelFit),
    primaryBuyer: normalizeText(input.primaryBuyer),
    integrationPosture: normalizeText(input.integrationPosture),
  };
}
