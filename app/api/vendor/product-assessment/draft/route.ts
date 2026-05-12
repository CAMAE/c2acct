import { randomUUID } from "crypto";
import { ProductAssessmentPerspective } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  buildProductAssessmentDraftPayload,
  buildProductAssessmentPages,
  getProductAssessmentPlan,
} from "@/lib/productAssessmentRuntime";
import { buildSurveyDraftIntegrityFlags, getSurveyDraftWhere, SURVEY_DRAFT_SCORE_VERSION } from "@/lib/surveyDrafts";
import {
  normalizeVendorProductProfileInput,
  serializeProductAssessmentPlan,
} from "@/lib/vendorProductAssessmentPlan";
import {
  ensureProductSubject,
  ensureVendorProductModule,
} from "@/lib/vendorPat";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const DraftSchema = z.object({
  productId: z.string().min(1),
  currentPage: z.number().int().positive(),
  utilityKeys: z.array(z.string().min(1)),
  answers: z.record(z.string(), z.number().int().min(0).max(5)),
  openEndedResponses: z.record(z.string(), z.string()).optional().default({}),
  profile: z
    .object({
      productName: z.string().optional(),
      productDescription: z.string().optional(),
      logoReference: z.string().optional(),
      positioning: z.string().optional(),
      targetCustomer: z.string().optional(),
      targetUseContext: z.string().optional(),
      implementationStyle: z.string().optional(),
      operatingModelFit: z.string().optional(),
      primaryBuyer: z.string().optional(),
      integrationPosture: z.string().optional(),
    })
    .optional()
    .default({}),
});

function countAnswered(input: {
  answers: Record<string, number>;
  openEndedResponses: Record<string, string>;
  profile: Record<string, string>;
}) {
  const scored = Object.keys(input.answers).length;
  const openEnded = Object.values(input.openEndedResponses).filter((value) => value.trim().length > 0).length;
  const profile = Object.values(input.profile).filter((value) => value.trim().length > 0).length;
  return scored + openEnded + profile;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    return sessionUser ? forbiddenResponse("Vendor product assessment requires a company-backed account") : unauthorizedResponse();
  }

  const body = await request.json().catch(() => null);
  const parsed = DraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: { id: true, type: true },
  });
  if (!company || company.type !== "VENDOR") {
    return forbiddenResponse("Current account is not attached to a vendor company");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: parsed.data.productId,
      companyId: company.id,
      active: true,
    },
    select: { id: true, name: true },
  });
  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const plan = getProductAssessmentPlan({
    perspective: "vendor",
    selectedUtilityKeys: parsed.data.utilityKeys,
  });
  const pages = buildProductAssessmentPages(plan);
  const scoredQuestionIds = new Set(
    plan.modules.filter((module) => module.kind === "utility").flatMap((module) => module.questions.map((question) => question.id))
  );
  const openEndedQuestionIds = new Set(
    plan.modules.filter((module) => module.kind === "open-ended").flatMap((module) => module.questions.map((question) => question.id))
  );
  const sanitizedAnswers = Object.fromEntries(
    Object.entries(parsed.data.answers).filter((entry) => scoredQuestionIds.has(entry[0]))
  );
  const sanitizedOpenEnded = Object.fromEntries(
    Object.entries(parsed.data.openEndedResponses).filter((entry) => openEndedQuestionIds.has(entry[0]))
  );
  const normalizedProfile = normalizeVendorProductProfileInput(parsed.data.profile);

  const [moduleRecord, subject] = await Promise.all([
    ensureVendorProductModule(),
    ensureProductSubject(product),
  ]);
  const assessmentPlan = serializeProductAssessmentPlan({
    perspective: "vendor",
    selectedUtilityKeys: parsed.data.utilityKeys,
    includeProductGeneral: true,
    includeOpenEnded: true,
  });

  await prisma.productAssessmentPlan.upsert({
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
      id: `product-plan-${product.id}-vendor`,
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
  });

  const answers = buildProductAssessmentDraftPayload({
    perspective: "vendor",
    productId: product.id,
    registryVersion: plan.version,
    selectedUtilityKeys: parsed.data.utilityKeys,
    responses: sanitizedAnswers,
    openEndedResponses: sanitizedOpenEnded,
    profile: normalizedProfile,
  });
  const draftData = {
    version: moduleRecord.version ?? 1,
    answers,
    score: 0,
    weightedAvg: null,
    scoreVersion: SURVEY_DRAFT_SCORE_VERSION,
    scaleMin: 0,
    scaleMax: 100,
    totalWeight: 0,
    answeredCount: countAnswered({
      answers: sanitizedAnswers,
      openEndedResponses: sanitizedOpenEnded,
      profile: normalizedProfile,
    }),
    signalIntegrityScore: 1,
    integrityFlags: buildSurveyDraftIntegrityFlags({
      currentStep: Math.min(parsed.data.currentPage, Math.max(pages.length, 1)),
      totalSteps: Math.max(pages.length, 1),
      questionCount: plan.modules.reduce((sum, module) => sum + module.questions.length, 0),
    }),
  };

  const existingDraft = await prisma.surveySubmission.findFirst({
    where: getSurveyDraftWhere({
      companyId: company.id,
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
          companyId: company.id,
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
