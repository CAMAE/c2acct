import { QuestionInputType } from "@prisma/client";
import type { AssessmentQuestionRuntime } from "@/lib/assessmentRuntime";
import {
  FIRM_FOLLOWUP_MC_VERSION,
  getFirmFollowUpQuestion,
  type FollowUpOption,
  type FollowUpSelectionMode,
} from "@/lib/assessment/firmFollowUpOptions";
import { isFollowUpMcEnabled } from "@/lib/followUpMc";

/**
 * What the flag-on runtime attaches to a firm module's five TEXT follow-up
 * questions. The stored SurveyQuestion rows are NOT touched (inputType stays
 * TEXT, the prompt keeps its module-title prefix); the decoration is computed per
 * request from the registry, so flag-off is byte-identical by construction:
 * decorateFollowUpMcQuestions() returns the SAME array instance when the flag is
 * off, and the `followUpMc` property never exists on a flag-off question.
 */
export type FollowUpMcRuntime = {
  version: number;
  questionKey: string;
  selectionMode: FollowUpSelectionMode;
  stem: string;
  options: readonly FollowUpOption[];
};

export function isFirmAlignmentModuleKey(moduleKey: string): boolean {
  return moduleKey.startsWith("firm_alignment_");
}

function isDecorateOptions(value: NodeJS.ProcessEnv | FollowUpMcDecorateOptions): value is FollowUpMcDecorateOptions {
  // process.env never carries these two keys; an options object may carry either.
  return typeof value === "object" && value !== null && ("verticalId" in value || ("env" in value && typeof (value as FollowUpMcDecorateOptions).env === "object"));
}

export type FollowUpMcDecorateOptions = {
  env?: NodeJS.ProcessEnv;
  /**
   * legal-load (R64, delta 2): the tenant's vertical picks the option-set registry.
   * Omitted (or accounting) reads the accounting sets, byte-identical to before the
   * seam; the value comes from the request boundary, never from inside this module.
   */
  verticalId?: string;
};

export function decorateFollowUpMcQuestions<T extends AssessmentQuestionRuntime>(
  questions: T[],
  moduleKey: string,
  options: NodeJS.ProcessEnv | FollowUpMcDecorateOptions = process.env
): T[] {
  const { env = process.env, verticalId } = isDecorateOptions(options) ? options : { env: options };
  if (!isFollowUpMcEnabled(env) || !isFirmAlignmentModuleKey(moduleKey)) {
    return questions;
  }
  return questions.map((question) => {
    if (question.inputType !== QuestionInputType.TEXT) {
      return question;
    }
    const followUp = getFirmFollowUpQuestion(question.key, verticalId);
    if (!followUp || followUp.moduleKey !== moduleKey) {
      return question;
    }
    const followUpMc: FollowUpMcRuntime = {
      version: FIRM_FOLLOWUP_MC_VERSION,
      questionKey: followUp.questionKey,
      selectionMode: followUp.selectionMode,
      stem: followUp.stem,
      options: followUp.options,
    };
    return { ...question, followUpMc };
  });
}
