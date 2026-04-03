import type { ProductProfileFieldKey } from "@/lib/productUtilityRegistry";
import {
  buildProductAssessmentPlan,
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

export function buildVendorProductAssessmentPlan(selectedUtilityKeys: string[]) {
  return buildProductAssessmentPlan({
    perspective: "vendor",
    selectedUtilityKeys,
    includeProductGeneral: true,
    includeOpenEnded: true,
  });
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
