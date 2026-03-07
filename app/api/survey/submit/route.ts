import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";

const SCORING_VERSION = 1;
const SCORE_SCALE_MIN = 1;
const SCORE_SCALE_MAX = 5;

const SubmitSchema = z
  .object({
    moduleKey: z.string().min(1),
    answers: z.record(z.string(), z.unknown()),
  })
  .strict();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const effectiveCompanyId = sessionUser.companyId;
  if (!effectiveCompanyId) {
    return forbiddenResponse("No company assigned");
  }

  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(raw)) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  // Company authority is session-derived. Client-provided companyId is ignored if it matches;
  // mismatches are rejected to surface cross-tenant tampering attempts.
  const requestCompanyId = Object.prototype.hasOwnProperty.call(raw, "companyId")
    ? raw.companyId
    : undefined;

  if (requestCompanyId !== undefined) {
    if (typeof requestCompanyId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", detail: "companyId must be a string when provided" },
        { status: 400 }
      );
    }

    if (requestCompanyId !== effectiveCompanyId) {
      return forbiddenResponse("Company mismatch");
    }
  }

  const { companyId: _ignoredCompanyId, ...submitCandidate } = raw;
  void _ignoredCompanyId;

  const parsed = SubmitSchema.safeParse(submitCandidate);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { moduleKey, answers: rawAnswers } = parsed.data;

  const module = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
    select: { id: true, version: true, active: true },
  });

  if (!module || !module.active) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404 });
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: { moduleId: module.id },
    select: { id: true, required: true },
  });

  if (questions.length === 0) {
    return NextResponse.json({ ok: false, error: "Module has no questions" }, { status: 400 });
  }

  const allowedQuestionIds = new Set(questions.map((q) => q.id));
  const submittedQuestionIds = Object.keys(rawAnswers);

  const unknownAnswerIds = submittedQuestionIds.filter((questionId) => !allowedQuestionIds.has(questionId));
  if (unknownAnswerIds.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid payload",
        detail: "answers include question ids not in module",
        invalidQuestionIds: unknownAnswerIds,
      },
      { status: 400 }
    );
  }

  const requiredQuestionIds = questions.filter((q) => q.required).map((q) => q.id);
  const missingRequired = requiredQuestionIds.filter((questionId) => !Object.hasOwn(rawAnswers, questionId));
  if (missingRequired.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid payload",
        detail: "Missing required answers",
        missingQuestionIds: missingRequired,
      },
      { status: 400 }
    );
  }

  const answers: Record<string, number> = {};
  for (const questionId of submittedQuestionIds) {
    const rawValue = rawAnswers[questionId];
    if (
      typeof rawValue !== "number" ||
      !Number.isFinite(rawValue) ||
      !Number.isInteger(rawValue) ||
      rawValue < SCORE_SCALE_MIN ||
      rawValue > SCORE_SCALE_MAX
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          detail: `Invalid answer value for question ${questionId}; expected integer ${SCORE_SCALE_MIN}-${SCORE_SCALE_MAX}`,
        },
        { status: 400 }
      );
    }

    answers[questionId] = rawValue;
  }

  // Canonical v1 mapping: answers are strictly validated to 1..5, then normalized once in computeScore.
  const scoring = computeScore({ answers, scaleMin: SCORE_SCALE_MIN, scaleMax: SCORE_SCALE_MAX });

  const invalidScoreSnapshot =
    !Number.isFinite(scoring.score) ||
    !Number.isFinite(scoring.totalWeight) ||
    !Number.isInteger(scoring.answeredCount) ||
    scoring.answeredCount <= 0 ||
    (scoring.weightedAvg !== null && !Number.isFinite(scoring.weightedAvg));

  if (invalidScoreSnapshot) {
    return NextResponse.json({ ok: false, error: "Invalid score output" }, { status: 400 });
  }

  const { submission, milestoneReached } = await prisma.$transaction(async (tx) => {
    const createdSubmission = await tx.surveySubmission.create({
      data: {
        id: randomUUID(),
        companyId: effectiveCompanyId,
        moduleId: module.id,
        version: module.version ?? 1,
        answers,
        score: scoring.score,
        weightedAvg: scoring.weightedAvg,
        scoreVersion: SCORING_VERSION,
        scaleMin: scoring.scaleMin,
        scaleMax: scoring.scaleMax,
        totalWeight: scoring.totalWeight,
        answeredCount: scoring.answeredCount,
      },
    });

    let reached = false;
    const badgeRules = await tx.badgeRule.findMany({
      where: { moduleId: module.id },
      select: { badgeId: true, minScore: true, required: true },
    });

    for (const badgeRule of badgeRules) {
      if (!badgeRule.required) {
        continue;
      }

      const minScore = badgeRule.minScore ?? 0;
      if (createdSubmission.score < minScore) {
        continue;
      }

      await tx.companyBadge.upsert({
        where: {
          companyId_badgeId_moduleId: {
            companyId: effectiveCompanyId,
            badgeId: badgeRule.badgeId,
            moduleId: module.id,
          },
        },
        update: {},
        create: {
          id: randomUUID(),
          companyId: effectiveCompanyId,
          badgeId: badgeRule.badgeId,
          moduleId: module.id,
        },
      });
      reached = true;
    }

    return { submission: createdSubmission, milestoneReached: reached };
  });

  return NextResponse.json({ ok: true, submission, milestoneReached }, { status: 200 });
}
