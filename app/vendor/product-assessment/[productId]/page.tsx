import { ProductAssessmentPerspective } from "@prisma/client";
import { redirect } from "next/navigation";
import VendorProductAssessmentClient from "@/app/components/vendor/VendorProductAssessmentClient";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  getInitialVendorProductProfile,
  serializeVendorProductAssessmentPlan,
} from "@/lib/vendorProductAssessmentPlan";
import {
  VENDOR_PRODUCT_MODULE_KEY,
  VENDOR_UTILITY_CATALOG,
  extractUtilityKeysFromSignals,
  getVendorCompanyContext,
} from "@/lib/vendorPat";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
};

export default async function VendorProductAssessmentDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { productId } = await params;
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }

  const vendorContext = await getVendorCompanyContext(sessionUser.companyId);
  if (vendorContext.company?.type !== "VENDOR") {
    redirect("/vendor");
  }

  const product = vendorContext.products.find((entry) => entry.id === productId);
  if (!product) {
    redirect("/vendor/product-assessment");
  }

  const productRecord = await prisma.product.findUnique({
    where: { id: product.id },
    select: {
      id: true,
      name: true,
      summary: true,
      website: true,
      ProductProfile: {
        select: {
          logoUrl: true,
          logoAssetRef: true,
          positioning: true,
          targetCustomer: true,
          targetUseContext: true,
          implementationStyle: true,
          operatingModelFit: true,
          primaryBuyer: true,
          integrationPosture: true,
        },
      },
      ProductAssessmentPlan: {
        where: { perspective: ProductAssessmentPerspective.VENDOR },
        select: {
          selectedUtilityKeys: true,
          registryVersion: true,
          moduleOrder: true,
        },
        take: 1,
      },
    },
  });

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: VENDOR_PRODUCT_MODULE_KEY },
    select: { id: true },
  }).catch(() => null);

  const latestSubmission = moduleRecord
    ? await prisma.surveySubmission.findFirst({
        where: {
          companyId: vendorContext.company.id,
          moduleId: moduleRecord.id,
          Subject: {
            productId: product.id,
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          score: true,
          answers: true,
        },
      }).catch(() => null)
    : null;

  const persistedAnswerPayload =
    latestSubmission &&
    typeof latestSubmission.answers === "object" &&
    latestSubmission.answers !== null
      ? (latestSubmission.answers as {
          utilitySelection?: string[];
          responses?: Record<string, number>;
          openEndedResponses?: Record<string, string>;
        })
      : null;

  const initialUtilityKeys =
    persistedAnswerPayload?.utilitySelection && persistedAnswerPayload.utilitySelection.length > 0
      ? persistedAnswerPayload.utilitySelection
      : productRecord?.ProductAssessmentPlan[0]?.selectedUtilityKeys.length
        ? productRecord.ProductAssessmentPlan[0].selectedUtilityKeys
      : extractUtilityKeysFromSignals(product.signals);

  const initialAnswers = persistedAnswerPayload?.responses ?? {};
  const initialOpenEndedAnswers = persistedAnswerPayload?.openEndedResponses ?? {};
  const resolvedProductName = productRecord?.name ?? product.name;
  const helpSearchParams = new URLSearchParams({
    topic: "product-assessment",
    productId: product.id,
    productName: resolvedProductName,
  });
  const productAssessmentHelpHref = `/vendor/help?${helpSearchParams.toString()}`;
  const initialProfile = getInitialVendorProductProfile({
    product: {
      name: resolvedProductName,
      summary: productRecord?.summary ?? product.summary,
    },
    profile: productRecord?.ProductProfile ?? null,
  });

  const persistedPlanSnapshot = serializeVendorProductAssessmentPlan(initialUtilityKeys);
  await prisma.productAssessmentPlan.upsert({
    where: {
      productId_perspective: {
        productId: product.id,
        perspective: ProductAssessmentPerspective.VENDOR,
      },
    },
    update: {
      registryVersion: persistedPlanSnapshot.registryVersion,
      selectedUtilityKeys: persistedPlanSnapshot.selectedUtilityKeys,
      generatedQuestionIds: persistedPlanSnapshot.generatedQuestionIds,
      profileQuestionIds: persistedPlanSnapshot.profileQuestionIds,
      scoredQuestionIds: persistedPlanSnapshot.scoredQuestionIds,
      openEndedQuestionIds: persistedPlanSnapshot.openEndedQuestionIds,
      moduleOrder: persistedPlanSnapshot.moduleOrder,
      sectionOrder: persistedPlanSnapshot.sectionOrder,
      modulePlan: persistedPlanSnapshot.modulePlan,
      sectionPlan: persistedPlanSnapshot.sectionPlan,
      updatedAt: new Date(),
    },
    create: {
      id: `product-plan-${product.id}-vendor`,
      productId: product.id,
      perspective: ProductAssessmentPerspective.VENDOR,
      registryVersion: persistedPlanSnapshot.registryVersion,
      selectedUtilityKeys: persistedPlanSnapshot.selectedUtilityKeys,
      generatedQuestionIds: persistedPlanSnapshot.generatedQuestionIds,
      profileQuestionIds: persistedPlanSnapshot.profileQuestionIds,
      scoredQuestionIds: persistedPlanSnapshot.scoredQuestionIds,
      openEndedQuestionIds: persistedPlanSnapshot.openEndedQuestionIds,
      moduleOrder: persistedPlanSnapshot.moduleOrder,
      sectionOrder: persistedPlanSnapshot.sectionOrder,
      modulePlan: persistedPlanSnapshot.modulePlan,
      sectionPlan: persistedPlanSnapshot.sectionPlan,
    },
  });

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Product assessment</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {resolvedProductName}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Declare the utilities this product solves, then answer the per-product PAT assessment. The submission persists as product-specific vendor self-signal, not a generic company submission.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Website: <span className="font-semibold text-[var(--shell-ink)]">{product.website ?? "--"}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Latest score: <span className="font-semibold text-[var(--shell-ink)]">{latestSubmission?.score ?? "--"}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Utility catalog: <span className="font-semibold text-[var(--shell-ink)]">{VENDOR_UTILITY_CATALOG.length} options</span>
          </div>
        </div>
      </section>

      <VendorProductAssessmentClient
        productId={product.id}
        productName={resolvedProductName}
        utilityCatalog={VENDOR_UTILITY_CATALOG}
        initialUtilityKeys={initialUtilityKeys}
        initialAnswers={initialAnswers}
        initialOpenEndedAnswers={initialOpenEndedAnswers}
        initialProfile={initialProfile}
        productsHref="/vendor/product-assessment"
        productInsightHref={`/vendor/product-insight/${product.id}`}
        helpHref={productAssessmentHelpHref}
      />
    </div>
  );
}
