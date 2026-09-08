/**
 * MC redesign box (queue item 6) — the firm follow-up questions as multiple choice.
 * Ships DARK behind PAT_ENABLE_FOLLOWUP_MC. Off (the default) every firm module
 * keeps today's open-ended text follow-ups, byte-identical: the module API
 * payload, the page, the draft/submit validators and the stored submission JSON
 * are all untouched. On, the five follow-ups per module render as option rows
 * from the versioned registry in lib/assessment/firmFollowUpOptions.ts and each
 * selection is dual-written to AssessmentItemResponse.
 */
export const PAT_FOLLOWUP_MC_FLAG_ENV = "PAT_ENABLE_FOLLOWUP_MC";

export function isFollowUpMcEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[PAT_FOLLOWUP_MC_FLAG_ENV] === "1";
}
