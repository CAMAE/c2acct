import { randomUUID } from "node:crypto";
import type { AssessmentItemResponseRow } from "@/lib/assessment/itemResponses";
import { VENDOR_FOLLOWUP_MC_VERSION, VENDOR_FOLLOWUP_MODULE_KEY, getVendorFollowUpQuestion } from "@/lib/assessment/vendorFollowUpOptions";
import { decodeVendorFollowUpAnswer, type VendorFollowUpMcEnabledInput } from "@/lib/assessment/vendorFollowUpMcRuntime";
import { isVendorFollowUpMcEnabled } from "@/lib/vendorFollowUpMc";

/**
 * vendor-followup-mc box (change 5) — the row-wise view of one vendor product
 * submission's ten open-ended answers for AssessmentItemResponse, the same shape
 * the firm builder (lib/assessment/itemResponses.ts) writes:
 *
 *   flag-on, encoded pick          -> one SINGLE/MULTI row per selected option
 *                                     (optionSetVersion 1, questionKey = the
 *                                     open-ended key, questionVersion = the module
 *                                     version); the "Other" row carries otherText
 *   free text (any flag)           -> one TEXT row, otherText = the string
 *   blank / absent                 -> no row (reported as skipped)
 *
 * Pure: the submit route and the seed call this with the same inputs and get the
 * same rows. Flag-off it writes TEXT rows for the ten strings, as the firm
 * flag-off path does.
 */
export type VendorOpenEndedRowQuestion = { id: string; key: string };

export function buildVendorAssessmentItemResponseRows(input: {
  submissionId: string;
  companyId: string;
  moduleVersion: number;
  questions: readonly VendorOpenEndedRowQuestion[];
  openEndedResponses: Record<string, string>;
  enabled?: VendorFollowUpMcEnabledInput;
  newId?: () => string;
}): { rows: AssessmentItemResponseRow[]; skippedQuestionKeys: string[] } {
  const newId = input.newId ?? randomUUID;
  const enabled = typeof input.enabled === "boolean" ? input.enabled : isVendorFollowUpMcEnabled(input.enabled ?? process.env);
  const rows: AssessmentItemResponseRow[] = [];
  const skippedQuestionKeys: string[] = [];
  const base = {
    submissionId: input.submissionId,
    companyId: input.companyId,
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    questionVersion: input.moduleVersion,
    orderingSeed: null,
    numericValue: null,
  };

  for (const question of input.questions) {
    const value = input.openEndedResponses[question.id];
    const registry = enabled ? getVendorFollowUpQuestion(question.key) : null;
    const pick = registry ? decodeVendorFollowUpAnswer(value) : null;
    if (registry && pick) {
      const otherKey = registry.options.find((option) => option.kind === "other")?.key ?? null;
      for (const optionKey of pick.optionKeys) {
        rows.push({
          id: newId(),
          ...base,
          questionKey: question.key,
          optionSetVersion: VENDOR_FOLLOWUP_MC_VERSION,
          selectionMode: registry.selectionMode,
          optionKey,
          otherText: optionKey === otherKey ? (pick.otherText ?? null) : null,
        });
      }
      if (pick.optionKeys.length === 0) skippedQuestionKeys.push(question.key);
      continue;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      rows.push({
        id: newId(),
        ...base,
        questionKey: question.key,
        optionSetVersion: null,
        selectionMode: "TEXT",
        optionKey: null,
        otherText: value,
      });
      continue;
    }
    skippedQuestionKeys.push(question.key);
  }

  return { rows, skippedQuestionKeys };
}
