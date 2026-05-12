import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  requiresCompanyBackedAssessment,
  resolveAssessmentSubjectContext,
} from "@/lib/subjectContext";
import {
  normalizeQuestionRuntime,
  validateAnswer,
  type NormalizedAnswer,
} from "@/lib/assessmentRuntime";
import {
  SURVEY_DRAFT_SCORE_VERSION,
  buildSurveyDraftIntegrityFlags,
  getSurveyDraftWhere,
} from "@/lib/surveyDrafts";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const DraftSchema = z
  .object({
    moduleKey: z.string().min(1),
    step: z.number().int().positive(),
    totalSteps: z.number().int().positive(),
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

  const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
  if (!requiresCompanyBackedAssessment(assessmentContext)) {
    return forbiddenResponse("Current assessment flow requires a company-backed subject");
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

  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { moduleKey, answers: rawAnswers, step, totalSteps } = parsed.data;

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

  const questions = questionRecords.map(normalizeQuestionRuntime);
  const allowedQuestionIds = new Set(questions.map((question) => question.id));
  const answerIds = Object.keys(rawAnswers);
  const unknownAnswerIds = answerIds.filter((questionId) => !allowedQuestionIds.has(questionId));

  if (unknownAnswerIds.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", detail: "answers include question ids not in module" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const answers: Record<string, NormalizedAnswer> = {};
  for (const questionId of answerIds) {
    const question = questions.find((entry) => entry.id === questionId);
    if (!question) continue;

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

  const existingDraft = await prisma.surveySubmission.findFirst({
    where: getSurveyDraftWhere({
      companyId: assessmentContext.companyId,
      subjectId: assessmentContext.subjectId,
      moduleId: surveyModule.id,
    }),
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const draftData = {
    companyId: assessmentContext.companyId,
    subjectId: assessmentContext.subjectId,
    moduleId: surveyModule.id,
    version: surveyModule.version ?? 1,
    answers,
    score: 0,
    weightedAvg: null,
    scoreVersion: SURVEY_DRAFT_SCORE_VERSION,
    scaleMin: 0,
    scaleMax: 100,
    totalWeight: 0,
    answeredCount: Object.keys(answers).length,
    signalIntegrityScore: 1,
    integrityFlags: buildSurveyDraftIntegrityFlags({
      currentStep: step,
      totalSteps,
      questionCount: questions.length,
    }),
  };

  const draft = existingDraft
    ? await prisma.surveySubmission.update({
        where: { id: existingDraft.id },
        data: draftData,
        select: { id: true, createdAt: true, answeredCount: true },
      })
    : await prisma.surveySubmission.create({
        data: {
          id: randomUUID(),
          ...draftData,
        },
        select: { id: true, createdAt: true, answeredCount: true },
      });

  return NextResponse.json(
    {
      ok: true,
      draft,
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
