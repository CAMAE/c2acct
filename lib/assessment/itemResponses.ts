import { randomUUID } from "node:crypto";
import { QuestionInputType } from "@prisma/client";
import type { AssessmentQuestionRuntime, NormalizedAnswer } from "@/lib/assessmentRuntime";
import {
  FIRM_FOLLOWUP_MC_VERSION,
  getFirmFollowUpQuestion,
  isFollowUpMcAnswer,
} from "@/lib/assessment/firmFollowUpOptions";

/**
 * Row-wise view of one firm module submission for AssessmentItemResponse
 * (Prerequisite Zero). Pure: the submit route and the backfill script both call
 * this with the same inputs and get the same rows, so a backfilled submission and
 * a live one are indistinguishable in the table.
 *
 *   SLIDER answer (number)          -> one SCORED row, numericValue
 *   TEXT answer (string)            -> one TEXT row, otherText = the legacy free text
 *   follow-up MC answer (object)    -> one SINGLE/MULTI row per selected option;
 *                                      the "Other" row carries otherText
 *   anything else / absent          -> no row (counted as skipped by the caller)
 */
export type AssessmentItemResponseRow = {
  id: string;
  submissionId: string;
  companyId: string;
  moduleKey: string;
  questionKey: string;
  questionVersion: number;
  optionSetVersion: number | null;
  selectionMode: "SINGLE" | "MULTI" | "SCORED" | "TEXT";
  optionKey: string | null;
  otherText: string | null;
  numericValue: number | null;
  orderingSeed: string | null;
};

export type ItemResponseQuestion = Pick<AssessmentQuestionRuntime, "id" | "key" | "inputType">;

export function buildAssessmentItemResponseRows(input: {
  submissionId: string;
  companyId: string;
  moduleKey: string;
  moduleVersion: number;
  questions: readonly ItemResponseQuestion[];
  answers: Record<string, NormalizedAnswer | unknown>;
  newId?: () => string;
}): { rows: AssessmentItemResponseRow[]; skippedQuestionKeys: string[] } {
  const newId = input.newId ?? randomUUID;
  const rows: AssessmentItemResponseRow[] = [];
  const skippedQuestionKeys: string[] = [];
  const base = {
    submissionId: input.submissionId,
    companyId: input.companyId,
    moduleKey: input.moduleKey,
    questionVersion: input.moduleVersion,
    orderingSeed: null,
  };

  for (const question of input.questions) {
    const answer = input.answers[question.id];
    if (answer === undefined || answer === null) {
      skippedQuestionKeys.push(question.key);
      continue;
    }

    if (question.inputType === QuestionInputType.SLIDER && typeof answer === "number" && Number.isFinite(answer)) {
      rows.push({
        id: newId(),
        ...base,
        questionKey: question.key,
        optionSetVersion: null,
        selectionMode: "SCORED",
        optionKey: null,
        otherText: null,
        numericValue: answer,
      });
      continue;
    }

    const followUp = getFirmFollowUpQuestion(question.key);
    if (followUp && isFollowUpMcAnswer(answer)) {
      const otherKey = followUp.options.find((option) => option.kind === "other")?.key ?? null;
      for (const optionKey of answer.optionKeys) {
        rows.push({
          id: newId(),
          ...base,
          questionKey: question.key,
          optionSetVersion: FIRM_FOLLOWUP_MC_VERSION,
          selectionMode: followUp.selectionMode,
          optionKey,
          otherText: optionKey === otherKey ? (answer.otherText ?? null) : null,
          numericValue: null,
        });
      }
      if (answer.optionKeys.length === 0) skippedQuestionKeys.push(question.key);
      continue;
    }

    if (question.inputType === QuestionInputType.TEXT && typeof answer === "string" && answer.trim().length > 0) {
      rows.push({
        id: newId(),
        ...base,
        questionKey: question.key,
        optionSetVersion: null,
        selectionMode: "TEXT",
        optionKey: null,
        otherText: answer,
        numericValue: null,
      });
      continue;
    }

    skippedQuestionKeys.push(question.key);
  }

  return { rows, skippedQuestionKeys };
}
