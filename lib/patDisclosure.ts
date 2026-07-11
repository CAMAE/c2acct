/**
 * Pat AI-disclosure labels (Block 9a, governance copy pack 2026-07, addendum
 * move 1). Every Pat-drafted outbound communication (pings, nudges, emails,
 * in-app messages) must carry an AI disclosure. Honest claims only — Pat never
 * poses as a person. (EU AI Act Art. 50 direction; AICPA buyer expectation.)
 */

/** Full visible line — footer of a full message (inbox item, email body). */
export const PAT_DISCLOSURE_FOOTER =
  "Drafted by Pat, Patalign's AI assistant, and reviewed by a person before sending. Questions? Reply — a human reads these.";

/** Short form — compact in-app toast / bell items. */
export const PAT_DISCLOSURE_SHORT = "Pat (AI) · human-reviewed";

/** Machine-readable email transport header (applied when email delivery is wired). */
export const PAT_AI_GENERATED_HEADER_NAME = "X-PAT-AI-Generated";
export const PAT_AI_GENERATED_HEADER_VALUE = "true; reviewed=human";

/** Header pair for an outbound email carrying Pat-drafted content. */
export function patAiGeneratedEmailHeaders(): Record<string, string> {
  return { [PAT_AI_GENERATED_HEADER_NAME]: PAT_AI_GENERATED_HEADER_VALUE };
}
