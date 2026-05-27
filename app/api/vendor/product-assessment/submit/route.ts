import { randomUUID } from "crypto";
import { ProductAssessmentPerspective } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/authz";
import { getSessionUser } from "@/lib/auth/session";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
} from "@/lib/productAssessmentRuntime";
import {
  buildVendorProductAssessmentPagePlan,
  getVendorProductAssessmentQuestionLoad,
  normalizeVendorProductProfileInput,
  serializeVendorAdaptiveOpenEndedQuestionSnapshot,
  serializeVendorProductAssessmentPlan,
} from "@/lib/vendorProductAssessmentPlan";
import {
  VENDOR_PRODUCT_MODULE_KEY,
  VENDOR_PRODUCT_QUESTIONS_PER_UTILITY,
  VENDOR_PRODUCT_UTILITY_SELECTION_LIMIT,
  buildVendorProductQuestions,
  computeVendorAssessmentMetrics,
  ensureProductSubject,
  ensureVendorProductModule,
  upsertVendorProductSignals,
} from "@/lib/vendorPat";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const SubmitVendorAssessmentSchema = z.object({
  productId: z.string().min(1),
  utilityKeys: z.array(z.string().min(1)).min(1).max(VENDOR_PRODUCT_UTILITY_SELECTION_LIMIT),
  profile: z.object({
    productName: z.string().trim().min(1),
    productDescription: z.string().trim().min(1),
    logoReference: z.string().trim().min(1),
    positioning: z.string().trim().min(1),
    targetCustomer: z.string().trim().min(1),
    targetUseContext: z.string().trim().min(1),
    implementationStyle: z.string().trim().min(1),
    operatingModelFit: z.string().trim().min(1),
    primaryBuyer: z.string().trim().min(1),
    integrationPosture: z.string().trim().min(1),
  }),
  openEndedResponses: z.record(z.string(), z.string()),
  answers: z.record(z.string(), z.number().min(PRODUCT_ASSESSMENT_SCALE_MIN).max(PRODUCT_ASSESSMENT_SCALE_MAX)),
});

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  if (!sessionUser.companyId) {
    return forbiddenResponse("Vendor product assessment requires a company-backed account");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const parsed = SubmitVendorAssessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", detail: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { productId, utilityKeys, profile, openEndedResponses, answers } = parsed.data;

  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: { id: true, type: true, name: true },
  });

  if (!company || company.type !== "VENDOR") {
    return forbiddenResponse("Current account is not attached to a vendor company");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId: company.id,
      active: true,
    },
    select: {
      id: true,
      name: true,
      companyId: true,
    },
  });

  if (!product) {
    return NextResponse.json(
      { ok: false, error: "Product not found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const questionBank = buildVendorProductQuestions(utilityKeys);
  const requiredQuestionIds = new Set(questionBank.map((question) => question.id));
  const submittedQuestionIds = Object.keys(answers);

  if (questionBank.length !== utilityKeys.length * VENDOR_PRODUCT_QUESTIONS_PER_UTILITY) {
    return NextResponse.json(
      { ok: false, error: "Invalid utility selection" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (submittedQuestionIds.length !== questionBank.length) {
    return NextResponse.json(
      { ok: false, error: "Complete every active question before submitting." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const invalidQuestionIds = submittedQuestionIds.filter((questionId) => !requiredQuestionIds.has(questionId));
  if (invalidQuestionIds.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Answers include invalid question ids." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const moduleRecord = await ensureVendorProductModule();
  const subject = await ensureProductSubject(product);
  const { score, integrity } = computeVendorAssessmentMetrics(answers);
  const normalizedProfile = normalizeVendorProductProfileInput(profile);
  const assessmentPlan = serializeVendorProductAssessmentPlan(utilityKeys);
  const questionLoad = getVendorProductAssessmentQuestionLoad(
    buildVendorProductAssessmentPagePlan({ assessmentPlan: assessmentPlan.plan })
  );
  if (!questionLoad.safeForBrowserSession) {
    return NextResponse.json(
      {
        ok: false,
        error: "Feature selection is too large for one browser session.",
        detail: `Selected features generate ${questionLoad.totalQuestionCount} questions; the current guard is ${questionLoad.maxBrowserSessionQuestionCount}.`,
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const adaptiveOpenEndedQuestions = serializeVendorAdaptiveOpenEndedQuestionSnapshot({
    selectedUtilityKeys: utilityKeys,
    profile: normalizedProfile,
    answers,
  });
  const openEndedQuestionIds = adaptiveOpenEndedQuestions.map((question) => question.id);
  const submittedOpenEndedIds = Object.keys(openEndedResponses);
  if (submittedOpenEndedIds.length !== openEndedQuestionIds.length) {
    return NextResponse.json(
      { ok: false, error: "Complete every open-ended question before submitting." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const invalidOpenEndedIds = submittedOpenEndedIds.filter((questionId) => !openEndedQuestionIds.includes(questionId));
  if (invalidOpenEndedIds.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Open-ended responses include invalid question ids." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const missingOpenEndedResponse = openEndedQuestionIds.find(
    (questionId) => openEndedResponses[questionId]?.trim().length === 0
  );
  if (missingOpenEndedResponse) {
    return NextResponse.json(
      { ok: false, error: "Complete every open-ended question before submitting." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const submission = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: {
        name: normalizedProfile.productName,
        summary: normalizedProfile.productDescription,
        updatedAt: new Date(),
      },
    });

    await tx.productProfile.upsert({
      where: { productId: product.id },
      update: {
        logoUrl: isUrl(normalizedProfile.logoReference) ? normalizedProfile.logoReference : null,
        logoAssetRef: isUrl(normalizedProfile.logoReference) ? null : normalizedProfile.logoReference,
        positioning: normalizedProfile.positioning,
        targetCustomer: normalizedProfile.targetCustomer,
        targetUseContext: normalizedProfile.targetUseContext,
        implementationStyle: normalizedProfile.implementationStyle,
        operatingModelFit: normalizedProfile.operatingModelFit,
        primaryBuyer: normalizedProfile.primaryBuyer,
        integrationPosture: normalizedProfile.integrationPosture,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        productId: product.id,
        logoUrl: isUrl(normalizedProfile.logoReference) ? normalizedProfile.logoReference : null,
        logoAssetRef: isUrl(normalizedProfile.logoReference) ? null : normalizedProfile.logoReference,
        positioning: normalizedProfile.positioning,
        targetCustomer: normalizedProfile.targetCustomer,
        targetUseContext: normalizedProfile.targetUseContext,
        implementationStyle: normalizedProfile.implementationStyle,
        operatingModelFit: normalizedProfile.operatingModelFit,
        primaryBuyer: normalizedProfile.primaryBuyer,
        integrationPosture: normalizedProfile.integrationPosture,
      },
    });

    const persistedPlan = await tx.productAssessmentPlan.upsert({
      where: {
        productId_perspective: {
          productId: product.id,
          perspective: ProductAssessmentPerspective.VENDOR,
        },
      },
      update: {
        registryVersion: assessmentPlan.registryVersion,
        selectedUtilityKeys: assessmentPlan.selectedUtilityKeys,
        generatedQuestionIds: assessmentPlan.generatedQuestionIds,
        profileQuestionIds: assessmentPlan.profileQuestionIds,
        scoredQuestionIds: assessmentPlan.scoredQuestionIds,
        openEndedQuestionIds: assessmentPlan.openEndedQuestionIds,
        moduleOrder: assessmentPlan.moduleOrder,
        sectionOrder: assessmentPlan.sectionOrder,
        modulePlan: assessmentPlan.modulePlan,
        sectionPlan: assessmentPlan.sectionPlan,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        productId: product.id,
        perspective: ProductAssessmentPerspective.VENDOR,
        registryVersion: assessmentPlan.registryVersion,
        selectedUtilityKeys: assessmentPlan.selectedUtilityKeys,
        generatedQuestionIds: assessmentPlan.generatedQuestionIds,
        profileQuestionIds: assessmentPlan.profileQuestionIds,
        scoredQuestionIds: assessmentPlan.scoredQuestionIds,
        openEndedQuestionIds: assessmentPlan.openEndedQuestionIds,
        moduleOrder: assessmentPlan.moduleOrder,
        sectionOrder: assessmentPlan.sectionOrder,
        modulePlan: assessmentPlan.modulePlan,
        sectionPlan: assessmentPlan.sectionPlan,
      },
      select: { id: true },
    });

    const createdSubmission = await tx.surveySubmission.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        subjectId: subject.id,
        moduleId: moduleRecord.id,
        version: moduleRecord.version ?? 1,
        answers: {
          utilitySelection: utilityKeys,
          profile: normalizedProfile,
          openEndedResponses,
          openEndedPlan: adaptiveOpenEndedQuestions,
          assessmentPlanId: persistedPlan.id,
          registryVersion: assessmentPlan.registryVersion,
          responses: answers,
        },
        score: score.rawScorePct,
        weightedAvg: score.rawWeightedAvg,
        scoreVersion: 1,
        scaleMin: score.scaleMin,
        scaleMax: score.scaleMax,
        totalWeight: score.totalWeight,
        answeredCount: score.answeredCount,
        signalIntegrityScore: integrity.score,
        integrityFlags: integrity.flags,
      },
    });

    await upsertVendorProductSignals(tx, product.id, utilityKeys, score.rawScorePct);
    return createdSubmission;
  });

  return NextResponse.json(
    {
      ok: true,
      submissionId: submission.id,
      moduleKey: VENDOR_PRODUCT_MODULE_KEY,
      productId: product.id,
      subjectId: subject.id,
      score: score.rawScorePct,
    },
    { headers: NO_STORE_HEADERS }
  );
}
