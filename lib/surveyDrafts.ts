import type { Prisma } from "@prisma/client";

export const SURVEY_DRAFT_SCORE_VERSION = 0;
export const SURVEY_FINAL_SCORE_VERSION = 1;

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
