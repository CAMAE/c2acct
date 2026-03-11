import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolveReviewTarget } from "@/lib/reviews/resolveReviewTarget";
import { recomputeObservedSignalRollup } from "@/lib/reviews/recomputeObservedSignalRollup";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  const reviewerCompanyId = typeof sessionUser?.companyId === "string" ? sessionUser.companyId.trim() : "";

  if (!sessionUser || !reviewerCompanyId) {
    return unauthorizedResponse("No authenticated reviewer company context");
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
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
        select: { id: true, key: true, axis: true, active: true },
      })
    : Promise.resolve(null);

  const moduleByIdPromise = moduleId
    ? prisma.surveyModule.findUnique({
        where: { id: moduleId },
        select: { id: true, key: true, axis: true, active: true },
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

  const created = await prisma.externalReviewSubmission.create({
    data: {
      id: randomUUID(),
      moduleId: moduleRecord.id,
      reviewerCompanyId,
      subjectCompanyId: reviewTarget.target.subjectCompany.id,
      subjectProductId: reviewTarget.target.subjectProduct?.id ?? null,
      answers: answers as Prisma.InputJsonValue,
      reviewStatus: "SUBMITTED",
    },
    select: {
      id: true,
      moduleId: true,
      reviewerCompanyId: true,
      subjectCompanyId: true,
      subjectProductId: true,
      reviewStatus: true,
    },
  });

  await recomputeObservedSignalRollup({
    moduleId: created.moduleId,
    subjectCompanyId: created.subjectCompanyId,
    subjectProductId: created.subjectProductId,
  });

  return NextResponse.json({ ok: true, submission: created }, { status: 201, headers: NO_STORE_HEADERS });
}
