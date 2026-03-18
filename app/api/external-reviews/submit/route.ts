import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { resolveReviewTarget } from "@/lib/reviews/resolveReviewTarget";
import { recomputeObservedSignalRollup } from "@/lib/reviews/recomputeObservedSignalRollup";
import { computeScore } from "@/lib/scoring";
import { evaluateSignalIntegrity } from "@/lib/signalIntegrity";
import {
  buildExternalReviewDuplicateWhere,
  computeNormalizedExternalReviewDimensions,
  getTrustedExternalReviewStatusForAcceptedSubmission,
} from "@/lib/reviews/trustedExternalReview";
import {
  assertViewerCanAccessCompany,
  assertViewerCanAccessProduct,
  resolveVisibilityContext,
} from "@/lib/visibility";
import { recordAuditEvent, toAuditDetailValue } from "@/lib/ops/auditEvents";
import { consumeDbRateLimit, getRequestClientIp } from "@/lib/ops/rateLimit";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const SCORING_VERSION = 1;
const REVIEW_SCALE_MIN = 1;
const REVIEW_SCALE_MAX = 5;
const REVIEW_SUBMIT_WINDOW_MS = 60_000;
const REVIEW_SUBMIT_MAX_REQUESTS_PER_WINDOW = 12;

const SubmitExternalReviewSchema = z
  .object({
    moduleKey: z.string().trim().min(1).optional(),
    moduleId: z.string().trim().min(1).optional(),
    subjectCompanyId: z.string().trim().min(1),
    subjectProductId: z.string().trim().min(1).nullable().optional(),
    reviewerCompanyId: z.string().trim().min(1).optional(),
    answers: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.moduleKey && !value.moduleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "moduleKey or moduleId is required",
        path: ["moduleKey"],
      });
    }
  });

function toNormalizedOptionalId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse("No authenticated reviewer company context");
  }

  const preferredCompanyId = await resolvePreferredViewerCompanyId();
  const visibilityContext = await resolveVisibilityContext({
    sessionUser,
    preferredCompanyId,
  });
  const reviewerCompanyId = visibilityContext?.currentCompany?.id ?? "";
  const reviewerCompanyType = visibilityContext?.currentCompany?.type ?? null;

  if (!reviewerCompanyId) {
    return unauthorizedResponse("No authenticated reviewer company context");
  }

  const clientIp = getRequestClientIp(req);
  const quota = await consumeDbRateLimit({
    bucketKey: `external-review-submit:${sessionUser.id}:${reviewerCompanyId}:${clientIp}`,
    limit: REVIEW_SUBMIT_MAX_REQUESTS_PER_WINDOW,
    windowMs: REVIEW_SUBMIT_WINDOW_MS,
  });
  if (!quota.allowed) {
    await recordAuditEvent({
      eventKey: "external_review.submit.rate_limited",
      eventCategory: "RATE_LIMIT",
      outcome: "BLOCKED",
      severity: "WARN",
      actorUserId: sessionUser.id,
      actorCompanyId: reviewerCompanyId,
      requestPath: "/api/external-reviews/submit",
      requestMethod: "POST",
      details: toAuditDetailValue({
        clientIp,
        requestCount: quota.requestCount,
        retryAfterSeconds: quota.retryAfterSeconds,
      }),
    });
    return NextResponse.json(
      { ok: false, error: "Too many requests", retryAfterSeconds: quota.retryAfterSeconds },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(quota.retryAfterSeconds),
        },
      }
    );
  }

  if (reviewerCompanyType !== "FIRM") {
    return forbiddenResponse("Only firm companies can submit external reviews");
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!isRecord(raw)) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const parsed = SubmitExternalReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const {
    moduleKey,
    moduleId,
    subjectCompanyId,
    subjectProductId,
    reviewerCompanyId: bodyReviewerCompanyId,
    answers,
  } = parsed.data;

  if (bodyReviewerCompanyId && bodyReviewerCompanyId !== reviewerCompanyId) {
    return forbiddenResponse("Reviewer company mismatch");
  }

  const normalizedSubjectProductId = toNormalizedOptionalId(subjectProductId);

  const moduleByKeyPromise = moduleKey
    ? prisma.surveyModule.findUnique({
        where: { key: moduleKey },
        select: { id: true, key: true, axis: true, active: true, scope: true },
      })
    : Promise.resolve(null);

  const moduleByIdPromise = moduleId
    ? prisma.surveyModule.findUnique({
        where: { id: moduleId },
        select: { id: true, key: true, axis: true, active: true, scope: true },
      })
    : Promise.resolve(null);

  const [moduleByKey, moduleById] = await Promise.all([moduleByKeyPromise, moduleByIdPromise]);

  if (moduleKey && !moduleByKey) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (moduleId && !moduleById) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (moduleByKey && moduleById && moduleByKey.id !== moduleById.id) {
    return NextResponse.json(
      { ok: false, error: "moduleKey and moduleId refer to different modules" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const moduleRecord = moduleByKey ?? moduleById;
  if (!moduleRecord || !moduleRecord.active) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (moduleRecord.axis !== "EXTERNAL_REVIEW") {
    return NextResponse.json(
      { ok: false, error: "Module is not EXTERNAL_REVIEW" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (moduleRecord.scope === "PRODUCT" && !normalizedSubjectProductId) {
    return NextResponse.json(
      { ok: false, error: "subjectProductId is required for PRODUCT review modules" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const companyAccess = await assertViewerCanAccessCompany({
    sessionUser,
    preferredCompanyId,
    targetCompanyId: subjectCompanyId,
  });

  if (!companyAccess.ok) {
    if (companyAccess.status === 401) {
      return unauthorizedResponse(companyAccess.error);
    }

    if (companyAccess.status === 403) {
      return forbiddenResponse(companyAccess.error);
    }

    return NextResponse.json({ ok: false, error: companyAccess.error }, { status: companyAccess.status, headers: NO_STORE_HEADERS });
  }

  if (companyAccess.entity.type !== "VENDOR") {
    return forbiddenResponse("External reviews can only target vendor companies");
  }

  if (normalizedSubjectProductId) {
    const productAccess = await assertViewerCanAccessProduct({
      sessionUser,
      preferredCompanyId,
      targetProductId: normalizedSubjectProductId,
      includeSponsoredProducts: true,
    });

    if (!productAccess.ok) {
      if (productAccess.status === 401) {
        return unauthorizedResponse(productAccess.error);
      }

      if (productAccess.status === 403) {
        return forbiddenResponse(productAccess.error);
      }

      return NextResponse.json({ ok: false, error: productAccess.error }, { status: productAccess.status, headers: NO_STORE_HEADERS });
    }
  }

  const reviewTarget = await resolveReviewTarget({
    subjectCompanyId,
    subjectProductId: normalizedSubjectProductId,
  });

  if (!reviewTarget.ok) {
    return NextResponse.json(
      { ok: false, error: reviewTarget.error },
      { status: reviewTarget.status, headers: NO_STORE_HEADERS }
    );
  }

  if (reviewerCompanyId === reviewTarget.target.subjectCompany.id) {
    return forbiddenResponse("Self-review is not allowed");
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: { moduleId: moduleRecord.id },
    select: { id: true, key: true, required: true },
  });

  if (questions.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Module has no questions" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const allowedQuestionIds = new Set(questions.map((question) => question.id));
  const submittedQuestionIds = Object.keys(answers);
  const unknownQuestionIds = submittedQuestionIds.filter((questionId) => !allowedQuestionIds.has(questionId));

  if (unknownQuestionIds.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid payload",
        detail: "answers include question ids not in module",
        invalidQuestionIds: unknownQuestionIds,
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const missingRequiredQuestionIds = questions
    .filter((question) => question.required)
    .map((question) => question.id)
    .filter((questionId) => !Object.hasOwn(answers, questionId));

  if (missingRequiredQuestionIds.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid payload",
        detail: "Missing required answers",
        missingQuestionIds: missingRequiredQuestionIds,
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const normalizedAnswers: Record<string, number> = {};

  for (const questionId of submittedQuestionIds) {
    const rawValue = answers[questionId];

    if (
      typeof rawValue !== "number" ||
      !Number.isFinite(rawValue) ||
      !Number.isInteger(rawValue) ||
      rawValue < REVIEW_SCALE_MIN ||
      rawValue > REVIEW_SCALE_MAX
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          detail: `Invalid answer value for question ${questionId}; expected integer ${REVIEW_SCALE_MIN}-${REVIEW_SCALE_MAX}`,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    normalizedAnswers[questionId] = rawValue;
  }

  const scoring = computeScore({
    answers: normalizedAnswers,
    scaleMin: REVIEW_SCALE_MIN,
    scaleMax: REVIEW_SCALE_MAX,
  });
  const normalizedDimensions = computeNormalizedExternalReviewDimensions({
    answers: normalizedAnswers,
    questions,
    scaleMin: REVIEW_SCALE_MIN,
    scaleMax: REVIEW_SCALE_MAX,
  });

  const integrity = evaluateSignalIntegrity(normalizedAnswers, {
    expectedQuestionCount: questions.length,
    scaleMin: REVIEW_SCALE_MIN,
    scaleMax: REVIEW_SCALE_MAX,
  });

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      await tx.externalReviewSubmission.updateMany({
        where: {
          ...buildExternalReviewDuplicateWhere({
            reviewerCompanyId,
            reviewerUserId: sessionUser.id,
            subjectCompanyId: reviewTarget.target.subjectCompany.id,
            subjectProductId: reviewTarget.target.subjectProduct?.id ?? null,
            moduleId: moduleRecord.id,
          }),
          reviewStatus: {
            in: ["SUBMITTED", "FINALIZED"],
          },
        },
        data: {
          reviewStatus: "REJECTED",
        },
      });

      return tx.externalReviewSubmission.create({
        data: {
          id: randomUUID(),
          moduleId: moduleRecord.id,
          reviewerCompanyId,
          reviewerUserId: sessionUser.id,
          subjectCompanyId: reviewTarget.target.subjectCompany.id,
          subjectProductId: reviewTarget.target.subjectProduct?.id ?? null,
          answers: normalizedAnswers as Prisma.InputJsonValue,
          normalizedDimensions:
            normalizedDimensions === null
              ? undefined
              : (normalizedDimensions as Prisma.InputJsonValue),
          score: scoring.score,
          weightedAvg: scoring.weightedAvg,
          scoreVersion: SCORING_VERSION,
          signalIntegrityScore: integrity.score,
          integrityFlags: integrity.flags,
          reviewStatus: getTrustedExternalReviewStatusForAcceptedSubmission(),
        },
        select: {
          id: true,
          moduleId: true,
          reviewerCompanyId: true,
          reviewerUserId: true,
          subjectCompanyId: true,
          subjectProductId: true,
          normalizedDimensions: true,
          score: true,
          weightedAvg: true,
          scoreVersion: true,
          signalIntegrityScore: true,
          integrityFlags: true,
          reviewStatus: true,
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ExternalReviewSubmission_single_finalized_identity_idx")) {
      return NextResponse.json(
        { ok: false, error: "Concurrent finalized review already accepted; retry with a fresh page state." },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }
    throw error;
  }

  await recomputeObservedSignalRollup({
    moduleId: created.moduleId,
    subjectCompanyId: created.subjectCompanyId,
    subjectProductId: created.subjectProductId,
  });

  await recordAuditEvent({
    eventKey: "external_review.submit.accepted",
    eventCategory: "EXTERNAL_REVIEW",
    outcome: "ACCEPTED",
    actorUserId: sessionUser.id,
    actorCompanyId: reviewerCompanyId,
    subjectCompanyId: created.subjectCompanyId,
    subjectProductId: created.subjectProductId,
    requestPath: "/api/external-reviews/submit",
    requestMethod: "POST",
    details: toAuditDetailValue({
      moduleId: created.moduleId,
      submissionId: created.id,
      reviewStatus: created.reviewStatus,
      signalIntegrityScore: created.signalIntegrityScore,
    }),
  });

  return NextResponse.json({ ok: true, submission: created }, { status: 201, headers: NO_STORE_HEADERS });
}
