import { randomUUID } from "node:crypto";
import { ProductAssessmentPerspective } from "@prisma/client";
import { redirect } from "next/navigation";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import VendorProductAssessmentClient from "@/app/components/vendor/VendorProductAssessmentClient";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
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
  const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="vendor"
        surfaceLabel="Vendor product assessment"
        title="Vendor product assessment requires Pro membership"
        body="This product-level assessment runtime is part of the current Pro vendor tier. PAT keeps the page visible so the upgrade path stays explicit, but it does not open the assessment body until Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor/product-assessment"
        workspaceLabel="Back to vendor product assessments"
        availableNow="The baseline vendor state still keeps the portal, help, and membership routes available without opening the assessment runtime."
        stagedNote="This assessment body feeds the current product-intelligence layer, so PAT treats it as a Pro surface rather than a baseline portal page."
      />
    );
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
      id: randomUUID(),
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
    <VendorProductAssessmentClient
      productId={product.id}
      productName={resolvedProductName}
      productWebsite={productRecord?.website ?? product.website}
      latestScore={latestSubmission?.score ?? null}
      utilityCatalog={VENDOR_UTILITY_CATALOG}
      initialUtilityKeys={initialUtilityKeys}
      initialAnswers={initialAnswers}
      initialOpenEndedAnswers={initialOpenEndedAnswers}
      initialProfile={initialProfile}
    />
  );
}
