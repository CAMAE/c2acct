import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { evaluateSignalIntegrity } from "@/lib/signalIntegrity";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  requiresCompanyBackedAssessment,
  resolveAssessmentSubjectContext,
} from "@/lib/subjectContext";
import {
  extractNumericAnswers,
  normalizeQuestionRuntime,
  validateAnswer,
  type NormalizedAnswer,
} from "@/lib/assessmentRuntime";

const SCORING_VERSION = 1;
const SCORE_SCALE_MIN = 1;
const SCORE_SCALE_MAX = 5;
const SUBMIT_WINDOW_MS = 60_000;
const SUBMIT_MAX_REQUESTS_PER_WINDOW = 20;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type SubmitRateLimitState = {
  count: number;
  resetAt: number;
};

declare global {
  var __submitRateLimitStore: Map<string, SubmitRateLimitState> | undefined;
}

const submitRateLimitStore = globalThis.__submitRateLimitStore ?? new Map<string, SubmitRateLimitState>();
globalThis.__submitRateLimitStore = submitRateLimitStore;

const SubmitSchema = z
  .object({
    moduleKey: z.string().min(1),
    answers: z.record(z.string(), z.unknown()),
  })
  .strict();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function consumeSubmitQuota(key: string, now = Date.now()): boolean {
  // Opportunistic cleanup to prevent unbounded growth in long-lived dev processes.
  for (const [entryKey, state] of submitRateLimitStore.entries()) {
    if (state.resetAt <= now) {
      submitRateLimitStore.delete(entryKey);
    }
  }

  const current = submitRateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    submitRateLimitStore.set(key, {
      count: 1,
      resetAt: now + SUBMIT_WINDOW_MS,
    });
    return true;
  }

  if (current.count >= SUBMIT_MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  current.count += 1;
  submitRateLimitStore.set(key, current);
  return true;
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
  if (!requiresCompanyBackedAssessment(assessmentContext)) {
    return forbiddenResponse("Current assessment flow requires a company-backed subject");
  }

  const effectiveCompanyId = assessmentContext.companyId;
  const submitRateLimitKey = `${sessionUser.id}:${assessmentContext.subjectId ?? effectiveCompanyId}`;
  if (!consumeSubmitQuota(submitRateLimitKey)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: NO_STORE_HEADERS }
    );
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

  // Company authority is session-derived. Client-provided companyId is ignored if it matches;
  // mismatches are rejected to surface cross-tenant tampering attempts.
  const requestCompanyId = Object.prototype.hasOwnProperty.call(raw, "companyId")
    ? raw.companyId
    : undefined;

  if (requestCompanyId !== undefined) {
    if (typeof requestCompanyId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", detail: "companyId must be a string when provided" },
        { status: 400, headers: NO_STORE_HEADERS }
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
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { moduleKey, answers: rawAnswers } = parsed.data;

  const surveyModule = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
    select: { id: true, version: true, active: true },
  });

  if (!surveyModule || !surveyModule.active) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const questionRecords = await prisma.surveyQuestion.findMany({
    where: { moduleId: surveyModule.id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      key: true,
      prompt: true,
      inputType: true,
      weight: true,
      order: true,
      required: true,
      meta: true,
    },
  });

  if (questionRecords.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Module has no questions" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const questions = questionRecords.map(normalizeQuestionRuntime);
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
      { status: 400, headers: NO_STORE_HEADERS }
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
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const answers: Record<string, NormalizedAnswer> = {};
  for (const questionId of submittedQuestionIds) {
    const question = questions.find((entry) => entry.id === questionId);
    if (!question) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          detail: `Question ${questionId} is not part of this module`,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const validated = validateAnswer(question, rawAnswers[questionId]);
    if (!validated.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          detail: `Invalid answer for question ${question.key}: ${validated.error}`,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (validated.value !== null) {
      answers[questionId] = validated.value;
    }
  }

  const numericAnswers = extractNumericAnswers(questions, answers);
  const scoring = computeScore({ answers: numericAnswers, scaleMin: SCORE_SCALE_MIN, scaleMax: SCORE_SCALE_MAX });
  const integrity = evaluateSignalIntegrity(answers, {
    expectedQuestionCount: questions.length,
    scaleMin: SCORE_SCALE_MIN,
    scaleMax: SCORE_SCALE_MAX,
  });

  const invalidScoreSnapshot =
    !Number.isFinite(scoring.score) ||
    !Number.isFinite(scoring.totalWeight) ||
    !Number.isInteger(scoring.answeredCount) ||
    scoring.answeredCount <= 0 ||
    (scoring.weightedAvg !== null && !Number.isFinite(scoring.weightedAvg));

  if (invalidScoreSnapshot) {
    return NextResponse.json(
      { ok: false, error: "Invalid score output" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { submission, milestoneReached } = await prisma.$transaction(async (tx) => {
    const createdSubmission = await tx.surveySubmission.create({
      data: {
        id: randomUUID(),
        companyId: effectiveCompanyId,
        subjectId: assessmentContext.subjectId,
        moduleId: surveyModule.id,
        version: surveyModule.version ?? 1,
        answers,
        // `score` remains the persisted raw normalized percent for threshold semantics.
        score: scoring.rawScorePct,
        weightedAvg: scoring.rawWeightedAvg,
        scoreVersion: SCORING_VERSION,
        scaleMin: scoring.scaleMin,
        scaleMax: scoring.scaleMax,
        totalWeight: scoring.totalWeight,
        answeredCount: scoring.answeredCount,
        signalIntegrityScore: integrity.score,
        integrityFlags: integrity.flags,
      },
    });

    let reached = false;
    const badgeRules = await tx.badgeRule.findMany({
      where: { moduleId: surveyModule.id },
      select: { badgeId: true, minScore: true, required: true },
    });

    for (const badgeRule of badgeRules) {
      if (!badgeRule.required) {
        continue;
      }

      const minScore = badgeRule.minScore ?? 0;
      // Badge thresholds are evaluated on canonical raw score percent.
      // Signal integrity is persisted separately for transparency/UI adjustment,
      // not for award gating semantics.
      if (createdSubmission.score < minScore) {
        continue;
      }

      await tx.companyBadge.upsert({
        where: {
          companyId_badgeId_moduleId: {
            companyId: effectiveCompanyId,
            badgeId: badgeRule.badgeId,
            moduleId: surveyModule.id,
          },
        },
        update: {},
        create: {
          id: randomUUID(),
          companyId: effectiveCompanyId,
          subjectId: assessmentContext.subjectId,
          badgeId: badgeRule.badgeId,
          moduleId: surveyModule.id,
        },
      });
      reached = true;
    }

    return { submission: createdSubmission, milestoneReached: reached };
  });

  return NextResponse.json(
    { ok: true, submission, milestoneReached },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
