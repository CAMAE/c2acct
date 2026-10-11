import type { Prisma } from "@prisma/client";

import { DRAFT_SCORE_VERSION, FINAL_SCORE_VERSION } from "@/lib/assessmentCore";

// scoring-core (R63): the one pair of score-version constants lives in
// lib/assessmentCore; these names stay for the existing importers.
export const SURVEY_DRAFT_SCORE_VERSION = DRAFT_SCORE_VERSION;
export const SURVEY_FINAL_SCORE_VERSION = FINAL_SCORE_VERSION;

export function getSurveyDraftWhere(baseWhere: Prisma.SurveySubmissionWhereInput): Prisma.SurveySubmissionWhereInput {
  return {
    ...baseWhere,
    scoreVersion: SURVEY_DRAFT_SCORE_VERSION,
  };
}

export function getSurveyFinalWhere(baseWhere: Prisma.SurveySubmissionWhereInput): Prisma.SurveySubmissionWhereInput {
  return {
    ...baseWhere,
    scoreVersion: {
      gt: SURVEY_DRAFT_SCORE_VERSION,
    },
  };
}

export function buildSurveyDraftIntegrityFlags(input: {
  currentStep: number;
  totalSteps: number;
  questionCount: number;
}) {
  return {
    kind: "draft",
    currentStep: input.currentStep,
    totalSteps: input.totalSteps,
    questionCount: input.questionCount,
    autosave: true,
  };
}
