import { randomUUID } from "crypto";
import { ProductAssessmentPerspective } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
  buildProductAssessmentDraftPayload,
  buildProductAssessmentPages,
  getProductAssessmentPlan,
} from "@/lib/productAssessmentRuntime";
import { buildSurveyDraftIntegrityFlags, getSurveyDraftWhere, SURVEY_DRAFT_SCORE_VERSION } from "@/lib/surveyDrafts";
import { serializeProductAssessmentPlan } from "@/lib/vendorProductAssessmentPlan";
import { ensureProductSubject, getVendorCompanyContext } from "@/lib/vendorPat";
import { ensureFirmProductModule, getFirmProductCatalog } from "@/lib/firmPat";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const DraftSchema = z.object({
  productId: z.string().min(1),
  currentPage: z.number().int().positive(),
  answers: z.record(z.string(), z.number().int().min(0).max(5)),
});

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    return sessionUser ? forbiddenResponse("Firm product assessment requires a firm company context") : unauthorizedResponse();
  }

  const context = await getVendorCompanyContext(sessionUser.companyId);
  if (context.company?.type !== "FIRM") {
    return forbiddenResponse("Current account is not attached to a firm company");
  }

  const body = await request.json().catch(() => null);
  const parsed = DraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const products = await getFirmProductCatalog(context.company.id);
  const product = products.find((entry) => entry.id === parsed.data.productId);
  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const plan = getProductAssessmentPlan({
    perspective: "firm",
    selectedUtilityKeys: product.utilityKeys,
  });
  const pages = buildProductAssessmentPages(plan);
  const validQuestionIds = new Set(plan.modules.flatMap((module) => module.questions.map((question) => question.id)));
  const sanitizedAnswers = Object.fromEntries(
    Object.entries(parsed.data.answers).filter((entry) => validQuestionIds.has(entry[0]))
  );

  const productRecord = await prisma.product.findUnique({
    where: { id: product.id },
    select: { id: true, name: true },
  });
  if (!productRecord) {
    return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const [moduleRecord, subject] = await Promise.all([
    ensureFirmProductModule(),
    ensureProductSubject(productRecord),
  ]);
  const assessmentPlan = serializeProductAssessmentPlan({
    perspective: "firm",
    selectedUtilityKeys: product.utilityKeys,
    includeProductGeneral: false,
    includeOpenEnded: false,
  });

  await prisma.productAssessmentPlan.upsert({
    where: {
      productId_perspective: {
        productId: product.id,
        perspective: ProductAssessmentPerspective.FIRM,
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
      id: `product-plan-${product.id}-firm`,
      productId: product.id,
      perspective: ProductAssessmentPerspective.FIRM,
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
  });

  const draftData = {
    version: moduleRecord.version ?? 1,
    answers: buildProductAssessmentDraftPayload({
      perspective: "firm",
      productId: product.id,
      registryVersion: plan.version,
      selectedUtilityKeys: product.utilityKeys,
      responses: sanitizedAnswers,
    }),
    score: 0,
    weightedAvg: null,
    scoreVersion: SURVEY_DRAFT_SCORE_VERSION,
    scaleMin: PRODUCT_ASSESSMENT_SCALE_MIN,
    scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
    totalWeight: 0,
    answeredCount: Object.keys(sanitizedAnswers).length,
    signalIntegrityScore: 1,
    integrityFlags: buildSurveyDraftIntegrityFlags({
      currentStep: Math.min(parsed.data.currentPage, Math.max(pages.length, 1)),
      totalSteps: Math.max(pages.length, 1),
      questionCount: plan.modules.reduce((sum, module) => sum + module.questions.length, 0),
    }),
  };

  const existingDraft = await prisma.surveySubmission.findFirst({
    where: getSurveyDraftWhere({
      companyId: context.company.id,
      subjectId: subject.id,
      moduleId: moduleRecord.id,
    }),
    select: { id: true },
  });

  const draft = existingDraft
    ? await prisma.surveySubmission.update({
        where: { id: existingDraft.id },
        data: draftData,
        select: { id: true, createdAt: true },
      })
    : await prisma.surveySubmission.create({
        data: {
          id: randomUUID(),
          companyId: context.company.id,
          subjectId: subject.id,
          moduleId: moduleRecord.id,
          ...draftData,
        },
        select: { id: true, createdAt: true },
      });

  return NextResponse.json(
    { ok: true, draftId: draft.id, currentPage: parsed.data.currentPage, savedAt: draft.createdAt.toISOString() },
    { headers: NO_STORE_HEADERS }
  );
}
