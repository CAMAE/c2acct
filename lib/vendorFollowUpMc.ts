/**
 * vendor-followup-mc box (2026-09-30) — the vendor product follow-up questions
 * as multiple choice. Ships DARK behind PAT_ENABLE_VENDOR_FOLLOWUP_MC, independent
 * of the firm flag. Off (the default) the vendor product assessment keeps today's
 * free-text follow-ups, byte-identical: the product assessment API payload, the
 * page, the draft/submit validators and the stored submission JSON are untouched.
 * On, the ten open-ended questions render as option rows from the versioned
 * registry in lib/assessment/vendorFollowUpOptions.ts and each selection is
 * dual-written to AssessmentItemResponse.
 */
export const PAT_VENDOR_FOLLOWUP_MC_FLAG_ENV = "PAT_ENABLE_VENDOR_FOLLOWUP_MC";

export function isVendorFollowUpMcEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[PAT_VENDOR_FOLLOWUP_MC_FLAG_ENV] === "1";
}
