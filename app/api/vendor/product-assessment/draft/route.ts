import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/authz";
import { getSessionUser } from "@/lib/auth/session";
import { ensureProductSubject, ensureVendorProductModule } from "@/lib/vendorPat";
import {
  SURVEY_DRAFT_SCORE_VERSION,
  buildSurveyDraftIntegrityFlags,
  getSurveyDraftWhere,
} from "@/lib/surveyDrafts";

/**
 * Vendor product assessment draft persistence (P1 fix, 2026-07-07). The vendor
 * assessment component previously persisted NOTHING until final submit —
 * "Continue to next page" only mutated client state, so a reload lost every
 * answer and the page position. This route writes an idempotent draft
 * SurveySubmission (scoreVersion 0) capturing the full in-progress state
 * (utility selection, scored answers, open-ended, profile) plus the current
 * page, so the assessment resumes exactly where the vendor left off. Partial is
 * fine — no completion validation here (that stays on /submit).
 */

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const DraftSchema = z.object({
  productId: z.string().min(1),
  utilityKeys: z.array(z.string()).default([]),
  profile: z.record(z.string(), z.string()).default({}),
  openEndedResponses: z.record(z.string(), z.string()).default({}),
  answers: z.record(z.string(), z.number()).default({}),
  currentPage: z.number().int().min(1).default(1),
  totalPages: z.number().int().min(1).default(1),
});

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

  const parsed = DraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", detail: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const { productId, utilityKeys, profile, openEndedResponses, answers, currentPage, totalPages } = parsed.data;

  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: { id: true, type: true },
  });
  if (!company || company.type !== "VENDOR") {
    return forbiddenResponse("Current account is not attached to a vendor company");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: company.id, active: true },
    select: { id: true, name: true, companyId: true },
  });
  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const moduleRecord = await ensureVendorProductModule();
  const subject = await ensureProductSubject(product);

  const answersPayload = {
    utilitySelection: utilityKeys,
    responses: answers,
    openEndedResponses,
    profile,
  };
  const answeredCount =
    Object.keys(answers).length +
    Object.values(openEndedResponses).filter((value) => value.trim().length > 0).length +
    Object.values(profile).filter((value) => value.trim().length > 0).length;

  const draftData = {
    companyId: company.id,
    subjectId: subject.id,
    moduleId: moduleRecord.id,
    version: moduleRecord.version ?? 1,
    answers: answersPayload,
    score: 0,
    weightedAvg: null,
    scoreVersion: SURVEY_DRAFT_SCORE_VERSION,
    scaleMin: 0,
    scaleMax: 100,
    totalWeight: 0,
    answeredCount,
    signalIntegrityScore: 1,
    integrityFlags: buildSurveyDraftIntegrityFlags({
      currentStep: currentPage,
      totalSteps: totalPages,
      questionCount: Object.keys(answers).length,
    }),
  };

  const existingDraft = await prisma.surveySubmission.findFirst({
    where: getSurveyDraftWhere({
      companyId: company.id,
      subjectId: subject.id,
      moduleId: moduleRecord.id,
    }),
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existingDraft) {
    await prisma.surveySubmission.update({ where: { id: existingDraft.id }, data: draftData });
  } else {
    await prisma.surveySubmission.create({ data: { id: randomUUID(), ...draftData } });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
