import {
  PRODUCT_GENERAL_MODULE,
  PRODUCT_GENERAL_QUESTION_COUNT,
  PRODUCT_OPEN_ENDED_MODULE,
  PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY,
  PRODUCT_UTILITY_REGISTRY,
  PRODUCT_UTILITY_REGISTRY_METADATA,
  PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
  type ProductQuestionBasisKey,
  type ProductProfileFieldKey,
} from "@/lib/productUtilityRegistry";

export type ProductAssessmentPerspective = "vendor" | "firm" | "individual";

export type ProductAssessmentModuleKind = "general" | "utility" | "open-ended";
export type ProductAssessmentResponseKind = "score" | "text";

export type ProductAssessmentQuestion = {
  id: string;
  key: string;
  prompt: string;
  order: number;
  required: boolean;
  responseKind: ProductAssessmentResponseKind;
  moduleKey: string;
  moduleKind: ProductAssessmentModuleKind;
  utilityKey?: string;
  utilityLabel?: string;
  subcategory?: {
    key: string;
    label: string;
    description: string;
  };
  fieldKey?: ProductProfileFieldKey;
  section: {
    key: string;
    title: string;
    description: string;
    order: number;
    utilityFamily?: string;
    utilityKey?: string;
    utilityLabel?: string;
    subcategoryKey?: string;
    subcategoryTitle?: string;
    basisKey?: ProductQuestionBasisKey;
  };
  version: string;
};

export type ProductAssessmentSection = {
  key: string;
  title: string;
  description: string;
  order: number;
  utilityFamily?: string;
  utilityKey?: string;
  utilityLabel?: string;
  subcategoryKey?: string;
  subcategoryTitle?: string;
  basisKey?: ProductQuestionBasisKey;
  questionIds: string[];
};

export type ProductAssessmentModule = {
  key: string;
  title: string;
  description: string;
  kind: ProductAssessmentModuleKind;
  utilityKey?: string;
  utilityLabel?: string;
  sections: ProductAssessmentSection[];
  questions: ProductAssessmentQuestion[];
};

export type ProductAssessmentPlan = {
  version: string;
  perspective: ProductAssessmentPerspective;
  modules: ProductAssessmentModule[];
};

export type ProductUtilityCatalogEntry = {
  key: string;
  label: string;
  description: string;
};

function buildId(parts: string[]) {
  return parts.join("__");
}

function getSelectedUtilities(selectedUtilityKeys: string[], utilityCap: number) {
  const seen = new Set<string>();

  return selectedUtilityKeys
    .filter((utilityKey) => {
      if (seen.has(utilityKey)) {
        return false;
      }
      seen.add(utilityKey);
      return true;
    })
    .slice(0, utilityCap)
    .map((utilityKey) => PRODUCT_UTILITY_REGISTRY.find((utility) => utility.key === utilityKey))
    .filter((utility): utility is (typeof PRODUCT_UTILITY_REGISTRY)[number] => Boolean(utility));
}

function buildGeneralModule(orderOffset: number): ProductAssessmentModule {
  const sections: ProductAssessmentSection[] = [
    {
      key: `${PRODUCT_GENERAL_MODULE.key}-identity`,
      title: "Product identity and positioning",
      description: "Foundational profile fields for product identity, positioning, and target fit.",
      order: 1,
      questionIds: [],
    },
    {
      key: `${PRODUCT_GENERAL_MODULE.key}-operating-context`,
      title: "Operating context and implementation fit",
      description: "Implementation posture, operating-model fit, buyer context, and interoperability framing.",
      order: 2,
      questionIds: [],
    },
  ];

  const questions = PRODUCT_GENERAL_MODULE.questions.map((question, index) => {
    const section = index < 5 ? sections[0] : sections[1];
    const id = buildId([PRODUCT_UTILITY_REGISTRY_METADATA.version, PRODUCT_GENERAL_MODULE.key, question.key]);
    section.questionIds.push(id);

    return {
      id,
      key: question.key,
      prompt: question.prompt,
      order: orderOffset + index + 1,
      required: true,
      responseKind: "text" as const,
      moduleKey: PRODUCT_GENERAL_MODULE.key,
      moduleKind: "general" as const,
      fieldKey: question.fieldKey,
      section: {
        key: section.key,
        title: section.title,
        description: section.description,
        order: section.order,
      },
      version: PRODUCT_UTILITY_REGISTRY_METADATA.version,
    };
  });

  return {
    key: PRODUCT_GENERAL_MODULE.key,
    title: PRODUCT_GENERAL_MODULE.title,
    description: PRODUCT_GENERAL_MODULE.description,
    kind: "general",
    sections,
    questions,
  };
}

function buildUtilityModules(
  selectedUtilityKeys: string[],
  utilityCap: number,
  orderOffset: number
): ProductAssessmentModule[] {
  const utilities = getSelectedUtilities(selectedUtilityKeys, utilityCap);
  let order = orderOffset;

  return utilities.map((utility) => {
    const sections: ProductAssessmentSection[] = utility.subcategories.map((subcategory, index) => ({
      key: `${utility.key}-${subcategory.key}`,
      title: `${utility.label}: ${subcategory.label}`,
      description: subcategory.description,
      order: index + 1,
      utilityFamily: utility.label,
      utilityKey: utility.key,
      utilityLabel: utility.label,
      subcategoryKey: subcategory.key,
      subcategoryTitle: subcategory.label,
      questionIds: [],
    }));

    const sectionByKey = new Map(sections.map((section) => [section.subcategoryKey ?? section.key, section]));
    const questions = utility.subcategories.flatMap((subcategory) =>
      subcategory.questions.map((question) => {
        order += 1;
        const section = sectionByKey.get(subcategory.key);
        if (!section) {
          throw new Error(`Missing section for product utility subcategory ${utility.key}/${subcategory.key}`);
        }
        const id = buildId([
          PRODUCT_UTILITY_REGISTRY_METADATA.version,
          utility.key,
          subcategory.key,
          question.key,
        ]);
        section.questionIds.push(id);

        return {
          id,
          key: `${utility.key}_${subcategory.key}_${question.key}`,
          prompt: question.prompt,
          order,
          required: true,
          responseKind: "score" as const,
          moduleKey: utility.key,
          moduleKind: "utility" as const,
          utilityKey: utility.key,
          utilityLabel: utility.label,
          subcategory: {
            key: subcategory.key,
            label: subcategory.label,
            description: subcategory.description,
          },
          section: {
            key: section.key,
            title: section.title,
            description: section.description,
            order: section.order,
            utilityFamily: section.utilityFamily,
            utilityKey: section.utilityKey,
            utilityLabel: section.utilityLabel,
            subcategoryKey: section.subcategoryKey,
            subcategoryTitle: section.subcategoryTitle,
            basisKey: question.basisKey,
          },
          version: PRODUCT_UTILITY_REGISTRY_METADATA.version,
        };
      })
    );

    return {
      key: utility.key,
      title: utility.label,
      description: utility.description,
      kind: "utility" as const,
      utilityKey: utility.key,
      utilityLabel: utility.label,
      sections,
      questions,
    };
  });
}

function buildOpenEndedModule(orderOffset: number): ProductAssessmentModule {
  const sections: ProductAssessmentSection[] = [
    {
      key: `${PRODUCT_OPEN_ENDED_MODULE.key}-operating-readout`,
      title: "Operating readout and current fit",
      description: "Narrative questions that surface strengths, weaknesses, and immediate implementation pressure.",
      order: 1,
      questionIds: [],
    },
    {
      key: `${PRODUCT_OPEN_ENDED_MODULE.key}-follow-up`,
      title: "Follow-up, evidence, and next action",
      description: "Narrative questions that capture fit, evidence gaps, and the next sensible PAT action.",
      order: 2,
      questionIds: [],
    },
  ];

  const questions = PRODUCT_OPEN_ENDED_MODULE.questions.map((question, index) => {
    const section = index < 5 ? sections[0] : sections[1];
    const id = buildId([PRODUCT_UTILITY_REGISTRY_METADATA.version, PRODUCT_OPEN_ENDED_MODULE.key, question.key]);
    section.questionIds.push(id);

    return {
      id,
      key: question.key,
      prompt: question.prompt,
      order: orderOffset + index + 1,
      required: false,
      responseKind: "text" as const,
      moduleKey: PRODUCT_OPEN_ENDED_MODULE.key,
      moduleKind: "open-ended" as const,
      section: {
        key: section.key,
        title: section.title,
        description: section.description,
        order: section.order,
      },
      version: PRODUCT_UTILITY_REGISTRY_METADATA.version,
    };
  });

  return {
    key: PRODUCT_OPEN_ENDED_MODULE.key,
    title: PRODUCT_OPEN_ENDED_MODULE.title,
    description: PRODUCT_OPEN_ENDED_MODULE.description,
    kind: "open-ended",
    sections,
    questions,
  };
}

export function getProductUtilityCatalog(): ProductUtilityCatalogEntry[] {
  return PRODUCT_UTILITY_REGISTRY.map((utility) => ({
    key: utility.key,
    label: utility.label,
    description: utility.description,
  }));
}

export function buildProductAssessmentPlan(input: {
  perspective?: ProductAssessmentPerspective;
  selectedUtilityKeys: string[];
  utilityCap?: number;
  includeProductGeneral?: boolean;
  includeOpenEnded?: boolean;
}): ProductAssessmentPlan {
  const perspective = input.perspective ?? "vendor";
  const includeProductGeneral = input.includeProductGeneral ?? true;
  const includeOpenEnded = input.includeOpenEnded ?? true;
  const utilityCap = input.utilityCap ?? input.selectedUtilityKeys.length;
  const modules: ProductAssessmentModule[] = [];
  let order = 0;

  if (includeProductGeneral) {
    const generalModule = buildGeneralModule(order);
    modules.push(generalModule);
    order += generalModule.questions.length;
  }

  const utilityModules = buildUtilityModules(input.selectedUtilityKeys, utilityCap, order);
  modules.push(...utilityModules);
  order += utilityModules.reduce((sum, module) => sum + module.questions.length, 0);

  if (includeOpenEnded) {
    modules.push(buildOpenEndedModule(order));
  }

  return {
    version: PRODUCT_UTILITY_REGISTRY_METADATA.version,
    perspective,
    modules,
  };
}

export function buildScoredUtilityQuestions(selectedUtilityKeys: string[], utilityCap: number) {
  return buildProductAssessmentPlan({
    selectedUtilityKeys,
    utilityCap,
    includeProductGeneral: false,
    includeOpenEnded: false,
  }).modules.flatMap((module) => module.questions);
}

export function getProductQuestionBankSummary() {
  return {
    version: PRODUCT_UTILITY_REGISTRY_METADATA.version,
    utilityCount: PRODUCT_UTILITY_REGISTRY.length,
    subcategoryCount: PRODUCT_UTILITY_REGISTRY.reduce(
      (sum, utility) => sum + utility.subcategories.length,
      0
    ),
    scoredQuestionsPerSubcategory: PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY,
    scoredQuestionsPerUtility: PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
    productGeneralQuestionCount: PRODUCT_GENERAL_QUESTION_COUNT,
    openEndedQuestionCount: PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  };
}
