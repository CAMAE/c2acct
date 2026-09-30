import {
  FIRM_FOLLOWUP_OTHER_MAX_LENGTH,
  isFollowUpMcAnswer,
  isFollowUpMcAnswerComplete,
  validateFollowUpMcAnswer,
  type FollowUpMcAnswer,
  type FollowUpQuestion,
} from "@/lib/assessment/firmFollowUpOptions";
import type { FollowUpMcRuntime } from "@/lib/assessment/followUpMcRuntime";
import { VENDOR_FOLLOWUP_MC_VERSION, VENDOR_FOLLOWUP_OTHER_MAX_LENGTH, getVendorFollowUpQuestion } from "@/lib/assessment/vendorFollowUpOptions";
import { isVendorFollowUpMcEnabled } from "@/lib/vendorFollowUpMc";

/**
 * vendor-followup-mc box — the vendor product assessment's ten open-ended
 * questions as option rows, flag-on only. Mirrors lib/assessment/followUpMcRuntime.ts:
 *   - the decoration is computed per request (server) or per render (client) from
 *     the registry; the adaptive prompt IS the stem (the registry's base stem is
 *     never shown);
 *   - flag-off (or `enabled: false`) returns the SAME array instance, so the page
 *     plan, the API payload and the stored JSON are byte-identical by construction;
 *   - the stored openEndedResponses stays a string record: a pick is encoded as
 *     the JSON of the firm side's FollowUpMcAnswer ({ optionKeys, otherText }), so a
 *     flag-off reader sees a string and parses nothing new.
 * Validation and pick transitions reuse the firm helpers with the vendor registry
 * question passed in; nothing is forked.
 */
export type VendorFollowUpMcRuntime = FollowUpMcRuntime;

export type VendorOpenEndedQuestionLike = { id: string; key: string; prompt: string };

export type VendorFollowUpMcEnabledInput = NodeJS.ProcessEnv | boolean;

function enabledFrom(input: VendorFollowUpMcEnabledInput): boolean {
  return typeof input === "boolean" ? input : isVendorFollowUpMcEnabled(input);
}

export type VendorFollowUpMcDecorated<T> = T & { followUpMc?: VendorFollowUpMcRuntime };

export function decorateVendorFollowUpMcQuestions<T extends VendorOpenEndedQuestionLike>(
  questions: T[],
  enabled: VendorFollowUpMcEnabledInput = process.env
): VendorFollowUpMcDecorated<T>[] {
  if (!enabledFrom(enabled)) {
    return questions as VendorFollowUpMcDecorated<T>[];
  }
  return questions.map((question) => {
    const followUp = getVendorFollowUpQuestion(question.key);
    if (!followUp) {
      return question;
    }
    const followUpMc: VendorFollowUpMcRuntime = {
      version: VENDOR_FOLLOWUP_MC_VERSION,
      questionKey: followUp.questionKey,
      selectionMode: followUp.selectionMode,
      stem: question.prompt,
      options: followUp.options,
    };
    return { ...question, followUpMc };
  });
}

/** A registry question with the adaptive prompt as its stem, for the shared pick/validate helpers. */
export function vendorFollowUpQuestionFor(question: VendorOpenEndedQuestionLike): FollowUpQuestion | null {
  const registry = getVendorFollowUpQuestion(question.key);
  return registry ? { ...registry, stem: question.prompt } : null;
}

const ENCODED_PREFIX = '{"optionKeys"';

export function encodeVendorFollowUpAnswer(answer: FollowUpMcAnswer): string {
  return JSON.stringify({ optionKeys: answer.optionKeys, otherText: answer.otherText ?? null });
}

/** The stored string → the pick, or null when it is legacy free text (or not a pick at all). */
export function decodeVendorFollowUpAnswer(value: string | null | undefined): FollowUpMcAnswer | null {
  if (typeof value !== "string" || !value.startsWith(ENCODED_PREFIX)) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isFollowUpMcAnswer(parsed)) return null;
    const otherText = (parsed as { otherText?: unknown }).otherText;
    return { optionKeys: parsed.optionKeys, otherText: typeof otherText === "string" ? otherText : null };
  } catch {
    return null;
  }
}

export function isVendorFollowUpAnswerComplete(question: VendorOpenEndedQuestionLike, value: string | null | undefined): boolean {
  const registry = vendorFollowUpQuestionFor(question);
  const decoded = decodeVendorFollowUpAnswer(value);
  if (!registry || !decoded) {
    return typeof value === "string" && value.trim().length > 0;
  }
  return isFollowUpMcAnswerComplete(registry, decoded);
}

export type VendorOpenEndedValidation =
  | { ok: true; responses: Record<string, string> }
  | { ok: false; error: string; questionId: string };

/**
 * Server-side check of the open-ended string record. Flag-off: returns the
 * record untouched (the routes' own checks apply). Flag-on: every value that is
 * an encoded pick for a registry question is validated through the firm helper
 * (exclusive none, Other non-empty and at most 280, SINGLE one pick, MULTI allows
 * Other plus picks) and re-encoded normalised; `required` makes an empty or
 * incomplete pick an error (submit), otherwise it passes (draft).
 */
export function validateVendorOpenEndedResponses(
  responses: Record<string, string>,
  questions: readonly VendorOpenEndedQuestionLike[],
  options: { enabled: VendorFollowUpMcEnabledInput; required: boolean }
): VendorOpenEndedValidation {
  if (!enabledFrom(options.enabled)) {
    return { ok: true, responses };
  }
  const out: Record<string, string> = { ...responses };
  for (const question of questions) {
    const value = responses[question.id];
    const registry = vendorFollowUpQuestionFor(question);
    if (!registry) continue;
    const decoded = decodeVendorFollowUpAnswer(value);
    if (!decoded) {
      if (options.required && (typeof value !== "string" || value.trim().length === 0)) {
        return { ok: false, error: "Complete every follow-up question before submitting.", questionId: question.id };
      }
      continue;
    }
    const result = validateFollowUpMcAnswer(registry, decoded, options.required);
    if (!result.ok) {
      return { ok: false, error: result.error, questionId: question.id };
    }
    out[question.id] = encodeVendorFollowUpAnswer(result.value);
  }
  return { ok: true, responses: out };
}

export const VENDOR_FOLLOWUP_OTHER_MAX = Math.min(VENDOR_FOLLOWUP_OTHER_MAX_LENGTH, FIRM_FOLLOWUP_OTHER_MAX_LENGTH);

/**
 * Change 6a: an encoded pick read as text for the briefing readers (BriefingBoard,
 * the Guide OpenEndedPanel, the Enterprise pages): the selected labels in registry
 * order joined with "; ", the Other pick replaced by its write-in. Null when the
 * value is not a pick for a registry question (the reader keeps the string).
 */
export function describeVendorFollowUpAnswer(questionKey: string, value: string | null | undefined): string | null {
  const registry = getVendorFollowUpQuestion(questionKey);
  const decoded = decodeVendorFollowUpAnswer(value);
  if (!registry || !decoded) return null;
  const picked = new Set(decoded.optionKeys);
  const parts = registry.options
    .filter((option) => picked.has(option.key))
    .map((option) => (option.kind === "other" ? (decoded.otherText ?? "").trim() : option.label))
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join("; ") : null;
}
