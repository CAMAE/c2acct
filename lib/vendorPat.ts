import { ModuleScope, SubjectKind, type CompanyType } from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { insightContent } from "@/lib/insightContent";
import {
  computeProductAssessmentMetrics,
} from "@/lib/productAssessmentRuntime";
import {
  matchesPrismaMissingSchemaTarget,
  warnPrismaCompatibilityOnce,
} from "@/lib/prisma-compat";
import { PRODUCT_UTILITY_SCORED_QUESTION_COUNT } from "@/lib/productUtilityRegistry";
import { buildProductAssessmentPlan, getProductUtilityCatalog } from "@/lib/vendorProductQuestionBank";

export const VENDOR_PRODUCT_MODULE_KEY = "vendor_product_alignment_v1";
export const VENDOR_PRODUCT_MODULE_TITLE = "Vendor Product Assessment";
export const VENDOR_PRODUCT_QUESTIONS_PER_UTILITY = PRODUCT_UTILITY_SCORED_QUESTION_COUNT;
export const VENDOR_PRODUCT_TIER2_HOVER = "Unlock with Elite membership";

export type UtilityDefinition = {
  key: string;
  label: string;
  description: string;
};

export type VendorInsightDetail = {
  key: string;
  title: string;
  description: string;
  what: string;
  why: string;
  how: string;
  basisSectionKeys?: string[];
  tier?: 1 | 2;
};

export const VENDOR_UTILITY_CATALOG: UtilityDefinition[] = getProductUtilityCatalog();

export type VendorAssessmentQuestion = {
  id: string;
  key: string;
  prompt: string;
  order: number;
  required: boolean;
  responseKind: "score";
  moduleKey: string;
  moduleKind: "utility";
  utilityKey: string;
  utilityLabel: string;
  subcategory: {
    key: string;
    label: string;
    description: string;
  };
  section: {
    key: string;
    title: string;
    description: string;
    basisKey: NonNullable<
      ReturnType<typeof buildProductAssessmentPlan>["modules"][number]["questions"][number]["section"]["basisKey"]
    >;
  };
  version: string;
};

export type VendorProductStatus = {
  latestSubmissionId: string | null;
  latestScore: number | null;
  latestSubmittedAt: Date | null;
  answeredCount: number;
  utilityKeys: string[];
  questionCount: number;
  progressLabel: string;
  assessmentSummary: string;
  statusLabel: string;
};

export const PRODUCT_TIER1_INSIGHTS: VendorInsightDetail[] = insightContent.vendorProduct
  .filter((item) => item.tier === 1)
  .map((item) => ({
    key: item.key,
    title: item.title,
    description: item.summary,
    what: item.what,
    why: item.why,
    how: item.how,
    basisSectionKeys:
      item.key === "current-product-fit"
        ? ["workflow-fit", "operational-dependence", "adoption-ease", "value-clarity"]
        : item.key === "implementation-friction"
          ? ["implementation-friction", "integration-readiness", "configuration-depth", "training-onboarding"]
          : ["reporting-visibility", "support-trust", "value-clarity"],
  }));

export const PRODUCT_TIER2_INSIGHTS: VendorInsightDetail[] = insightContent.vendorProduct
  .filter((item) => item.tier === 2)
  .map((item) => ({
    key: item.key,
    title: item.title,
    description: item.summary,
    what: item.what,
    why: item.why,
    how: item.how,
  }));

export const ALIGNMENT_INSIGHT_DEFINITIONS: VendorInsightDetail[] = insightContent.vendorAlignment.map((item) => ({
  key: item.key,
  title: item.title,
  tier: item.tier,
  description: item.summary,
  what: item.what,
  why: item.why,
  how: item.how,
}));

export function getVendorUtilityLabels(selectedUtilityKeys: string[]) {
  return selectedUtilityKeys
    .map((utilityKey) => VENDOR_UTILITY_CATALOG.find((utility) => utility.key === utilityKey))
    .filter((utility): utility is UtilityDefinition => Boolean(utility))
    .map((utility) => utility.label);
}

export function getVendorInsightQuestionPrompts(
  selectedUtilityKeys: string[],
  basisSectionKeys: string[]
) {
  if (selectedUtilityKeys.length === 0 || basisSectionKeys.length === 0) {
    return [];
  }

  return buildVendorProductQuestions(selectedUtilityKeys)
    .filter((question) => question.section.basisKey && basisSectionKeys.includes(question.section.basisKey))
    .map((question) => ({
      id: question.id,
      utilityLabel: question.utilityLabel,
      prompt: question.prompt,
      sectionTitle: question.section.title,
    }));
}

export type VendorCompanyContext = {
  company: {
    id: string;
    name: string;
    type: CompanyType;
  } | null;
  vendorProfile: {
    id: string;
    displayName: string;
    website: string | null;
    notes: string | null;
    key: string;
  } | null;
  products: Array<{
    id: string;
    name: string;
    slug: string | null;
    summary: string | null;
    website: string | null;
    active: boolean;
    signals: Array<{
      signalKey: string;
      valueText: string | null;
      valueNumber: number | null;
      notes: string | null;
    }>;
  }>;
  compatibilityMode: boolean;
};

export function buildVendorProductQuestions(selectedUtilityKeys: string[]) {
  return buildProductAssessmentPlan({
    perspective: "vendor",
    selectedUtilityKeys,
    includeProductGeneral: false,
    includeOpenEnded: false,
  }).modules.flatMap((module) => module.questions) as VendorAssessmentQuestion[];
}

export function productSignalKeyForUtility(utilityKey: string) {
  return `pat.utility.${utilityKey}`;
}

export function extractUtilityKeysFromSignals(
  signals: Array<{ signalKey: string; valueNumber: number | null }> | undefined
) {
  return (signals ?? [])
    .filter(
      (signal) =>
        signal.signalKey.startsWith("pat.utility.") &&
        (signal.valueNumber === null || signal.valueNumber > 0)
    )
    .map((signal) => signal.signalKey.replace("pat.utility.", ""));
}

export function deriveProductStatus(input: {
  latestSubmission?: {
    id: string;
    score: number;
    createdAt: Date;
    answeredCount: number;
  } | null;
  utilityKeys: string[];
}) : VendorProductStatus {
  const latestSubmission = input.latestSubmission ?? null;
  const questionCount = buildProductAssessmentPlan({
    perspective: "vendor",
    selectedUtilityKeys: input.utilityKeys,
    includeProductGeneral: true,
    includeOpenEnded: true,
  }).modules.reduce((sum, module) => sum + module.questions.length, 0);
  const answeredCount =
    questionCount === 0 ? 0 : Math.min(latestSubmission?.answeredCount ?? 0, questionCount);

  const progressLabel =
    questionCount === 0
      ? "Waiting for utility declaration"
      : latestSubmission
        ? `${answeredCount} of ${questionCount} generated questions captured in the latest assessment`
        : `0 of ${questionCount} generated questions completed`;
  const assessmentSummary =
    questionCount === 0
      ? "Declare product utilities first so PAT can generate the assessment plan."
      : latestSubmission
        ? "The current vendor assessment is recorded and can be reopened, updated, or reviewed in product insight."
        : "Open the assessment to capture the product profile, utility-aligned scored pages, and the final narrative readout.";

  return {
    latestSubmissionId: latestSubmission?.id ?? null,
    latestScore: latestSubmission?.score ?? null,
    latestSubmittedAt: latestSubmission?.createdAt ?? null,
    answeredCount,
    utilityKeys: input.utilityKeys,
    questionCount,
    progressLabel,
    assessmentSummary,
    statusLabel:
      questionCount === 0
        ? "Needs utility declaration"
        : latestSubmission
          ? "Assessment recorded"
          : "Ready for assessment",
  };
}

export async function ensureVendorProductModule() {
  try {
    return await prisma.surveyModule.upsert({
      where: { key: VENDOR_PRODUCT_MODULE_KEY },
      update: {
        title: VENDOR_PRODUCT_MODULE_TITLE,
        description:
          "Per-product vendor assessment for declared utility coverage, implementation readiness, and current PAT Pro membership intelligence.",
        scope: ModuleScope.PRODUCT,
        active: true,
        version: 1,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        key: VENDOR_PRODUCT_MODULE_KEY,
        title: VENDOR_PRODUCT_MODULE_TITLE,
        description:
          "Per-product vendor assessment for declared utility coverage, implementation readiness, and current PAT Pro membership intelligence.",
        scope: ModuleScope.PRODUCT,
        active: true,
        version: 1,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        version: true,
        scope: true,
      },
    });
  } catch (error) {
    if (matchesPrismaMissingSchemaTarget(error, ["surveymodule"])) {
      warnPrismaCompatibilityOnce(
        "vendor-product-module-missing",
        "SurveyModule is missing in the local database. Vendor product assessment cannot persist until local Prisma migrations are applied."
      );
    }
    throw error;
  }
}

export async function getVendorCompanyContext(companyId: string | null | undefined): Promise<VendorCompanyContext> {
  if (!companyId) {
    return {
      company: null,
      vendorProfile: null,
      products: [],
      compatibilityMode: false,
    };
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        VendorProfile: {
          select: {
            id: true,
            key: true,
            displayName: true,
            website: true,
            notes: true,
          },
        },
        Product: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            summary: true,
            website: true,
            active: true,
            ProductSignal: {
              where: {
                OR: [
                  { signalKey: { startsWith: "pat.utility." } },
                  { signalKey: { startsWith: "pat.vendor." } },
                ],
              },
              select: {
                signalKey: true,
                valueText: true,
                valueNumber: true,
                notes: true,
              },
            },
          },
        },
      },
    });

    return {
      company: company
        ? {
            id: company.id,
            name: company.name,
            type: company.type,
          }
        : null,
      vendorProfile: company?.VendorProfile ?? null,
      products: (company?.Product ?? []).map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        summary: product.summary,
        website: product.website,
        active: product.active,
        signals: product.ProductSignal,
      })),
      compatibilityMode: false,
    };
  } catch (error) {
    if (
      matchesPrismaMissingSchemaTarget(error, ["vendorprofile"]) ||
      matchesPrismaMissingSchemaTarget(error, ["product"]) ||
      matchesPrismaMissingSchemaTarget(error, ["productsignal"])
    ) {
      warnPrismaCompatibilityOnce(
        "vendor-schema-missing",
        "Vendor product schema is missing in the local database. Vendor PAT surfaces are rendering in compatibility mode until local Prisma migrations are applied."
      );
      return {
        company: null,
        vendorProfile: null,
        products: [],
        compatibilityMode: true,
      };
    }
    throw error;
  }
}

export async function ensureVendorProfileForCompany(company: { id: string; name: string }) {
  return prisma.vendorProfile.upsert({
    where: { companyId: company.id },
    update: {
      displayName: company.name,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      key: `vendor:${company.id}`,
      displayName: company.name,
      companyId: company.id,
      updatedAt: new Date(),
    },
  });
}

export async function ensureProductSubject(product: { id: string; name: string }) {
  return prisma.subject.upsert({
    where: { productId: product.id },
    update: {
      displayName: product.name,
      kind: SubjectKind.PRODUCT,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      key: `product:${product.id}`,
      displayName: product.name,
      kind: SubjectKind.PRODUCT,
      productId: product.id,
      updatedAt: new Date(),
    },
    select: { id: true, displayName: true, productId: true },
  });
}

type ProductSignalWriteClient = Pick<typeof prisma, "productSignal">;

export async function upsertVendorProductSignals(
  tx: ProductSignalWriteClient,
  productId: string,
  utilityKeys: string[],
  latestScore: number
) {
  const selectedUtilityKeys = [...new Set(utilityKeys)].filter(Boolean);
  const selectedSignalKeys = selectedUtilityKeys.map(productSignalKeyForUtility);

  await tx.productSignal.deleteMany({
    where: {
      productId,
      signalKey: { startsWith: "pat.utility." },
      NOT: selectedSignalKeys.length > 0 ? { signalKey: { in: selectedSignalKeys } } : undefined,
    },
  });

  for (const utilityKey of selectedUtilityKeys) {
    const utility = VENDOR_UTILITY_CATALOG.find((entry) => entry.key === utilityKey);
    await tx.productSignal.upsert({
      where: {
        productId_signalKey: {
          productId,
          signalKey: productSignalKeyForUtility(utilityKey),
        },
      },
      update: {
        valueText: utility?.label ?? utilityKey,
        valueNumber: 1,
        notes: utility?.description ?? null,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        productId,
        signalKey: productSignalKeyForUtility(utilityKey),
        valueText: utility?.label ?? utilityKey,
        valueNumber: 1,
        notes: utility?.description ?? null,
        updatedAt: new Date(),
      },
    });
  }

  await tx.productSignal.upsert({
    where: {
      productId_signalKey: {
        productId,
        signalKey: "pat.vendor.latest_score",
      },
    },
    update: {
      valueNumber: latestScore,
      valueText: String(latestScore),
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      productId,
      signalKey: "pat.vendor.latest_score",
      valueNumber: latestScore,
      valueText: String(latestScore),
      updatedAt: new Date(),
    },
  });
}

export function computeVendorAssessmentMetrics(answers: Record<string, number>) {
  return computeProductAssessmentMetrics(answers);
}
