import {
  PRODUCT_GENERAL_QUESTION_COUNT,
  PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY,
  PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
  type ProductQuestionBasisKey,
  type ProductProfileFieldKey,
} from "@/lib/productUtilityRegistry";
import {
  resolveProductUtilityRegistry,
  type ProductUtilityRegistryBundle,
} from "@/lib/verticals/questionBankRegistry";

/**
 * W3 — the bank these builders read is resolved by the PAIR
 * (verticalId, versionId) rather than by version alone
 * (VERTICAL-READINESS-AUDIT-2026-08 §5.5).
 *
 * With PAT_ENABLE_VERTICAL_PACKS off, `resolveProductUtilityRegistry()` returns
 * the in-code accounting bundle before resolving anything and before touching a
 * pack — the same object graph the module-level
 * `import { PRODUCT_UTILITY_REGISTRY }` produced before this seam existed. Every
 * question id, section key and `version` field is therefore byte-identical, and
 * the eval goldens do not move.
 *
 * The version half of the key is UNQUALIFIED and stays that way: it is embedded
 * in stored question ids, so vertical-qualifying it would rewrite every stored
 * row's ids to say something the rows already say in their verticalId column.
 */

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

function getSelectedUtilities(registry: ProductUtilityRegistryBundle, selectedUtilityKeys: string[]) {
  const seen = new Set<string>();

  return selectedUtilityKeys
    .filter((utilityKey) => {
      if (seen.has(utilityKey)) {
        return false;
      }
      seen.add(utilityKey);
      return true;
    })
    .map((utilityKey) => registry.utilities.find((utility) => utility.key === utilityKey))
    .filter((utility): utility is ProductUtilityRegistryBundle["utilities"][number] => Boolean(utility));
}

function buildGeneralModule(
  registry: ProductUtilityRegistryBundle,
  orderOffset: number
): ProductAssessmentModule {
  const generalModule = registry.generalModule;
  const sections: ProductAssessmentSection[] = [
    {
      key: `${generalModule.key}-identity`,
      title: "Product identity and positioning",
      description: "Foundational profile fields for product identity, positioning, and target fit.",
      order: 1,
      questionIds: [],
    },
    {
      key: `${generalModule.key}-operating-context`,
      title: "Operating context and implementation fit",
      description: "Implementation posture, operating-model fit, buyer context, and interoperability framing.",
      order: 2,
      questionIds: [],
    },
  ];

  const questions = generalModule.questions.map((question, index) => {
    const section = index < 5 ? sections[0] : sections[1];
    const id = buildId([registry.versionId, generalModule.key, question.key]);
    section.questionIds.push(id);

    return {
      id,
      key: question.key,
      prompt: question.prompt,
      order: orderOffset + index + 1,
      required: true,
      responseKind: "text" as const,
      moduleKey: generalModule.key,
      moduleKind: "general" as const,
      fieldKey: question.fieldKey,
      section: {
        key: section.key,
        title: section.title,
        description: section.description,
        order: section.order,
      },
      version: registry.versionId,
    };
  });

  return {
    key: generalModule.key,
    title: generalModule.title,
    description: generalModule.description,
    kind: "general",
    sections,
    questions,
  };
}

function buildUtilityModules(
  registry: ProductUtilityRegistryBundle,
  selectedUtilityKeys: string[],
  orderOffset: number
): ProductAssessmentModule[] {
  const utilities = getSelectedUtilities(registry, selectedUtilityKeys);
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
          registry.versionId,
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
          version: registry.versionId,
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

function buildOpenEndedModule(
  registry: ProductUtilityRegistryBundle,
  orderOffset: number
): ProductAssessmentModule {
  const openEndedModule = registry.openEndedModule;
  const sections: ProductAssessmentSection[] = [
    {
      key: `${openEndedModule.key}-operating-readout`,
      title: "Operating readout and current fit",
      description: "Narrative questions that surface strengths, weaknesses, and immediate implementation pressure.",
      order: 1,
      questionIds: [],
    },
    {
      key: `${openEndedModule.key}-follow-up`,
      title: "Follow-up, evidence, and next action",
      description: "Narrative questions that capture fit, evidence gaps, and the next sensible PAT action.",
      order: 2,
      questionIds: [],
    },
  ];

  const questions = openEndedModule.questions.map((question, index) => {
    const section = index < 5 ? sections[0] : sections[1];
    const id = buildId([registry.versionId, openEndedModule.key, question.key]);
    section.questionIds.push(id);

    return {
      id,
      key: question.key,
      prompt: question.prompt,
      order: orderOffset + index + 1,
      required: false,
      responseKind: "text" as const,
      moduleKey: openEndedModule.key,
      moduleKind: "open-ended" as const,
      section: {
        key: section.key,
        title: section.title,
        description: section.description,
        order: section.order,
      },
      version: registry.versionId,
    };
  });

  return {
    key: openEndedModule.key,
    title: openEndedModule.title,
    description: openEndedModule.description,
    kind: "open-ended",
    sections,
    questions,
  };
}

export function getProductUtilityCatalog(
  registry: ProductUtilityRegistryBundle = resolveProductUtilityRegistry()
): ProductUtilityCatalogEntry[] {
  return registry.utilities.map((utility) => ({
    key: utility.key,
    label: utility.label,
    description: utility.description,
  }));
}

export function buildProductAssessmentPlan(input: {
  perspective?: ProductAssessmentPerspective;
  selectedUtilityKeys: string[];
  includeProductGeneral?: boolean;
  includeOpenEnded?: boolean;
  /**
   * The (verticalId, versionId)-keyed bank to build from. Defaults to the
   * resolved one, which is the in-code accounting bundle with the flag off.
   */
  registry?: ProductUtilityRegistryBundle;
}): ProductAssessmentPlan {
  const registry = input.registry ?? resolveProductUtilityRegistry();
  const perspective = input.perspective ?? "vendor";
  const includeProductGeneral = input.includeProductGeneral ?? true;
  const includeOpenEnded = input.includeOpenEnded ?? true;
  const modules: ProductAssessmentModule[] = [];
  let order = 0;

  if (includeProductGeneral) {
    const generalModule = buildGeneralModule(registry, order);
    modules.push(generalModule);
    order += generalModule.questions.length;
  }

  const utilityModules = buildUtilityModules(registry, input.selectedUtilityKeys, order);
  modules.push(...utilityModules);
  order += utilityModules.reduce((sum, module) => sum + module.questions.length, 0);

  if (includeOpenEnded) {
    modules.push(buildOpenEndedModule(registry, order));
  }

  return {
    version: registry.versionId,
    perspective,
    modules,
  };
}

export function buildScoredUtilityQuestions(
  selectedUtilityKeys: string[],
  registry?: ProductUtilityRegistryBundle
) {
  return buildProductAssessmentPlan({
    selectedUtilityKeys,
    includeProductGeneral: false,
    includeOpenEnded: false,
    registry,
  }).modules.flatMap((module) => module.questions);
}

export function getProductQuestionBankSummary(
  registry: ProductUtilityRegistryBundle = resolveProductUtilityRegistry()
) {
  return {
    version: registry.versionId,
    utilityCount: registry.utilities.length,
    subcategoryCount: registry.utilities.reduce(
      (sum, utility) => sum + utility.subcategories.length,
      0
    ),
    scoredQuestionsPerSubcategory: PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY,
    scoredQuestionsPerUtility: PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
    productGeneralQuestionCount: PRODUCT_GENERAL_QUESTION_COUNT,
    openEndedQuestionCount: PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  };
}
