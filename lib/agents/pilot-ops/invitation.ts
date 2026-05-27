import type { InvitationAction, InvitationDraft } from "./types";

/** Build a personalized pilot welcome-email draft for a firm. */
export function buildInvitationDraft(firm: string, to: string): InvitationDraft {
  const subject = `Welcome to the PAT pilot, ${firm}`;
  const body = [
    `Hi ${firm} team,`,
    "",
    "You've been invited to the Patalign (PAT) controlled pilot. PAT aligns your firm",
    "with the software vendors and products that fit how you actually work.",
    "",
    "Next step: an operator will provision your workspace and send sign-in details.",
    "Reply here with any questions.",
    "",
    "— The PAT team",
  ].join("\n");
  return { firm, to, subject, body };
}

/**
 * Map an operator approval decision onto the invitation draft. Mirrors the hook
 * outcome the agent acts on: approve → execute as-is; deny → do not execute;
 * edit → execute with the edited fields merged into the draft.
 */
export function resolveInvitationAction(
  draft: InvitationDraft,
  decision: { outcome: "approved" | "denied" | "edited" | "timeout"; editedArgs?: Record<string, unknown> }
): InvitationAction {
  if (decision.outcome === "approved") {
    return { executed: true, reason: "approved", draft };
  }
  if (decision.outcome === "edited") {
    const merged: InvitationDraft = { ...draft };
    const edits = decision.editedArgs ?? {};
    if (typeof edits.subject === "string") {
      merged.subject = edits.subject;
    }
    if (typeof edits.body === "string") {
      merged.body = edits.body;
    }
    if (typeof edits.to === "string") {
      merged.to = edits.to;
    }
    return { executed: true, reason: "edited", draft: merged };
  }
  if (decision.outcome === "timeout") {
    return { executed: false, reason: "approval timed out" };
  }
  return { executed: false, reason: "operator denied" };
}
