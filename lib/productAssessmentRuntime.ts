import { computeScore } from "@/lib/scoring";
import { evaluateSignalIntegrity } from "@/lib/signalIntegrity";
import {
  buildVendorProductAssessmentPlan,
  normalizeVendorProductProfileInput,
  type VendorProductProfileInput,
} from "@/lib/vendorProductAssessmentPlan";
import {
  buildProductAssessmentPlan,
  type ProductAssessmentModuleKind,
  type ProductAssessmentPerspective,
  type ProductAssessmentPlan,
  type ProductAssessmentQuestion,
  type ProductAssessmentSection,
} from "@/lib/vendorProductQuestionBank";

export const PRODUCT_ASSESSMENT_PAGE_SIZE = 10;
export const PRODUCT_ASSESSMENT_SCALE_MIN = 0;
export const PRODUCT_ASSESSMENT_SCALE_MAX = 5;
export const PRODUCT_ASSESSMENT_FINAL_SCORE_VERSION = 2;
export const PRODUCT_ASSESSMENT_DRAFT_KIND = "product_assessment_draft";

export type ProductAssessmentPageSection = ProductAssessmentSection & {
  moduleKey: string;
  moduleKind: ProductAssessmentModuleKind;
  moduleTitle: string;
  questions: ProductAssessmentQuestion[];
};

export type ProductAssessmentPage = {
  key: string;
  order: number;
  questionCount: number;
  sectionKeys: string[];
  moduleKinds: ProductAssessmentModuleKind[];
  sections: ProductAssessmentPageSection[];
};

export type ProductAssessmentDraftPayload = {
  kind: typeof PRODUCT_ASSESSMENT_DRAFT_KIND;
  productId: string;
  perspective: ProductAssessmentPerspective;
  registryVersion: string;
  utilitySelection: string[];
  responses: Record<string, number>;
  openEndedResponses?: Record<string, string>;
  profile?: VendorProductProfileInput;
};

export type ParsedProductAssessmentState = {
  selectedUtilityKeys: string[];
  responses: Record<string, number>;
  openEndedResponses: Record<string, string>;
  profile: VendorProductProfileInput | null;
  registryVersion: string | null;
};

export type ProductAssessmentResumeState = ParsedProductAssessmentState & {
  currentPage: number;
  droppedResponseIds: string[];
  staleDraft: boolean;
};

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function normalizeUtilityKeys(utilityKeys: string[]) {
  const seen = new Set<string>();
  return utilityKeys.filter((utilityKey) => {
    if (!utilityKey || seen.has(utilityKey)) {
      return false;
    }
    seen.add(utilityKey);
    return true;
  });
}

function sanitizeScoreMap(
  values: Record<string, number>,
  allowedIds: Set<string>
) {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, number] =>
        allowedIds.has(entry[0]) &&
        typeof entry[1] === "number" &&
        Number.isFinite(entry[1]) &&
        Number.isInteger(entry[1]) &&
        entry[1] >= PRODUCT_ASSESSMENT_SCALE_MIN &&
        entry[1] <= PRODUCT_ASSESSMENT_SCALE_MAX
    )
  );
}

function sanitizeTextMap(values: Record<string, string>, allowedIds: Set<string>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, string] =>
        allowedIds.has(entry[0]) && typeof entry[1] === "string"
    )
  );
}

export function getProductAssessmentPlan(input: {
  perspective: ProductAssessmentPerspective;
  selectedUtilityKeys: string[];
}) {
  if (input.perspective === "vendor") {
    return buildVendorProductAssessmentPlan(input.selectedUtilityKeys);
  }

  return buildProductAssessmentPlan({
    perspective: input.perspective,
    selectedUtilityKeys: input.selectedUtilityKeys,
    includeProductGeneral: false,
    includeOpenEnded: false,
  });
}

export function buildProductAssessmentPages(
  plan: ProductAssessmentPlan,
  pageSize = PRODUCT_ASSESSMENT_PAGE_SIZE
) {
  const orderedSections: ProductAssessmentPageSection[] = plan.modules.flatMap((module) =>
    module.sections.map((section) => ({
      ...section,
      moduleKey: module.key,
      moduleKind: module.kind,
      moduleTitle: module.title,
      questions: module.questions.filter((question) => section.questionIds.includes(question.id)),
    }))
  );

  const pages: ProductAssessmentPage[] = [];
  let pageSections: ProductAssessmentPageSection[] = [];
  let questionCount = 0;

  function pushPage() {
    if (pageSections.length === 0) {
      return;
    }

    pages.push({
      key: pageSections.map((section) => section.key).join("::"),
      order: pages.length + 1,
      questionCount,
      sectionKeys: pageSections.map((section) => section.key),
      moduleKinds: Array.from(new Set(pageSections.map((section) => section.moduleKind))),
      sections: pageSections,
    });
    pageSections = [];
    questionCount = 0;
  }

  for (const section of orderedSections) {
    const sectionQuestionCount = section.questions.length;
    if (pageSections.length > 0 && questionCount + sectionQuestionCount > pageSize) {
      pushPage();
    }

    pageSections.push(section);
    questionCount += sectionQuestionCount;
  }

  pushPage();
  return pages;
}

export function parseStoredProductAssessmentState(
  answers: unknown
): ParsedProductAssessmentState {
  if (!answers || typeof answers !== "object") {
    return {
      selectedUtilityKeys: [],
      responses: {},
      openEndedResponses: {},
      profile: null,
      registryVersion: null,
    };
  }

  const payload = answers as {
    utilitySelection?: unknown;
    responses?: unknown;
    openEndedResponses?: unknown;
    profile?: unknown;
    registryVersion?: unknown;
  };

  return {
    selectedUtilityKeys: Array.isArray(payload.utilitySelection)
      ? normalizeUtilityKeys(
          payload.utilitySelection.filter(
            (value): value is string => typeof value === "string" && value.length > 0
          )
        )
      : [],
    responses:
      payload.responses && typeof payload.responses === "object"
        ? Object.fromEntries(
            Object.entries(payload.responses).filter(
              (entry): entry is [string, number] =>
                typeof entry[0] === "string" &&
                typeof entry[1] === "number" &&
                Number.isFinite(entry[1])
            )
          )
        : {},
    openEndedResponses:
      payload.openEndedResponses && typeof payload.openEndedResponses === "object"
        ? Object.fromEntries(
            Object.entries(payload.openEndedResponses).filter(
              (entry): entry is [string, string] =>
                typeof entry[0] === "string" && typeof entry[1] === "string"
            )
          )
        : {},
    profile:
      payload.profile && typeof payload.profile === "object"
        ? normalizeVendorProductProfileInput(
            payload.profile as Partial<Record<keyof VendorProductProfileInput, string | null | undefined>>
          )
        : null,
    registryVersion: typeof payload.registryVersion === "string" ? payload.registryVersion : null,
  };
}

export function buildProductAssessmentResumeState(input: {
  perspective: ProductAssessmentPerspective;
  selectedUtilityKeys: string[];
  draftAnswers?: unknown;
  draftCurrentPage?: number | null;
  fallbackAnswers?: unknown;
  defaultProfile?: VendorProductProfileInput | null;
}) {
  const plan = getProductAssessmentPlan({
    perspective: input.perspective,
    selectedUtilityKeys: normalizeUtilityKeys(input.selectedUtilityKeys),
  });
  const pages = buildProductAssessmentPages(plan);
  const staleCandidates: string[] = [];

  const primary = parseStoredProductAssessmentState(input.draftAnswers);
  const fallback = parseStoredProductAssessmentState(input.fallbackAnswers);
  const selectedUtilityKeys =
    input.perspective === "vendor" && primary.selectedUtilityKeys.length > 0
      ? primary.selectedUtilityKeys
      : normalizeUtilityKeys(input.selectedUtilityKeys);
  const activePlan =
    input.perspective === "vendor" && selectedUtilityKeys.join("|") !== input.selectedUtilityKeys.join("|")
      ? getProductAssessmentPlan({ perspective: input.perspective, selectedUtilityKeys })
      : plan;
  const activePages =
    activePlan === plan ? pages : buildProductAssessmentPages(activePlan);
  const activeQuestionIds = new Set(
    activePlan.modules.flatMap((module) => module.questions.map((question) => question.id))
  );
  const activeOpenEndedIds = new Set(
    activePlan.modules
      .filter((module) => module.kind === "open-ended")
      .flatMap((module) => module.questions.map((question) => question.id))
  );

  const sourceResponses =
    Object.keys(primary.responses).length > 0 || Object.keys(primary.openEndedResponses).length > 0 || primary.profile
      ? primary
      : fallback;

  for (const questionId of [
    ...Object.keys(sourceResponses.responses),
    ...Object.keys(sourceResponses.openEndedResponses),
  ]) {
    if (!activeQuestionIds.has(questionId)) {
      staleCandidates.push(questionId);
    }
  }

  return {
    selectedUtilityKeys,
    responses: sanitizeScoreMap(sourceResponses.responses, activeQuestionIds),
    openEndedResponses: sanitizeTextMap(sourceResponses.openEndedResponses, activeOpenEndedIds),
    profile:
      input.perspective === "vendor"
        ? sourceResponses.profile ?? input.defaultProfile ?? null
        : null,
    registryVersion: activePlan.version,
    currentPage: clampPage(input.draftCurrentPage ?? 1, activePages.length),
    droppedResponseIds: staleCandidates,
    staleDraft:
      staleCandidates.length > 0 ||
      (sourceResponses.registryVersion !== null && sourceResponses.registryVersion !== activePlan.version) ||
      (input.perspective === "vendor" &&
        primary.selectedUtilityKeys.length > 0 &&
        primary.selectedUtilityKeys.join("|") !== selectedUtilityKeys.join("|")),
  } satisfies ProductAssessmentResumeState;
}

export function buildProductAssessmentDraftPayload(input: {
  perspective: ProductAssessmentPerspective;
  productId: string;
  registryVersion: string;
  selectedUtilityKeys: string[];
  responses: Record<string, number>;
  openEndedResponses?: Record<string, string>;
  profile?: VendorProductProfileInput | null;
}): ProductAssessmentDraftPayload {
  return {
    kind: PRODUCT_ASSESSMENT_DRAFT_KIND,
    productId: input.productId,
    perspective: input.perspective,
    registryVersion: input.registryVersion,
    utilitySelection: normalizeUtilityKeys(input.selectedUtilityKeys),
    responses: input.responses,
    openEndedResponses: input.openEndedResponses ?? {},
    profile: input.profile ?? undefined,
  };
}

export function countRequiredProductPageAnswers(input: {
  page: ProductAssessmentPage;
  responses: Record<string, number>;
  openEndedResponses: Record<string, string>;
  profile: VendorProductProfileInput | null;
}) {
  let present = 0;
  let required = 0;

  for (const section of input.page.sections) {
    for (const question of section.questions) {
      const isRequired = question.required || question.moduleKind === "open-ended";
      if (isRequired) {
        required += 1;
      }

      if (question.responseKind === "score") {
        if (typeof input.responses[question.id] === "number") {
          present += 1;
        }
        continue;
      }

      if (question.moduleKind === "general" && question.fieldKey) {
        if (input.profile?.[question.fieldKey]?.trim().length) {
          present += 1;
        }
        continue;
      }

      if (input.openEndedResponses[question.id]?.trim().length) {
        present += 1;
      }
    }
  }

  return { present, required };
}

export function computeProductAssessmentMetrics(answers: Record<string, number>) {
  const score = computeScore({
    answers,
    scaleMin: PRODUCT_ASSESSMENT_SCALE_MIN,
    scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
  });

  const integrity = evaluateSignalIntegrity(answers, {
    expectedQuestionCount: Object.keys(answers).length,
    scaleMin: PRODUCT_ASSESSMENT_SCALE_MIN,
    scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
  });

  return {
    score,
    integrity,
  };
}

export function normalizeAnswerForStoredScale(
  value: number,
  scaleMin: number,
  scaleMax: number
) {
  const denominator = scaleMax - scaleMin;
  if (!Number.isFinite(value) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return Math.round((((value - scaleMin) / denominator) * 100) * 10) / 10;
}
