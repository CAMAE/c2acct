import { reachedMaxSends } from "@/lib/notifications/cadence";

/**
 * Automated ping trigger engine (Phase B3a, 2026-06-18) — pure, deterministic
 * decision logic. Given a target's progress/recency/deadline facts (gathered by
 * the B3b scheduler runner from the DB), decide whether a reminder fires and why,
 * and separately whether an ignored streak should escalate to the consultant.
 *
 * No LLM here by design: the boring "should we ping?" decision is rules-driven,
 * cheap, and testable. Pat only ever composes the message text, never decides
 * whether to send (see the agent-vision doc, deterministic-backbone rule).
 */

/** Days of no activity before an inactivity reminder fires. */
export const INACTIVITY_DAYS = 7;
/** Fire a deadline reminder when the quarter due date is within this window. */
export const DEADLINE_WINDOW_DAYS = 14;
/** Stop after this many reminders for one engagement (2–3 is the researched cap). */
export const DEFAULT_MAX_SENDS = 3;
/** Ignored nudges before escalating to the managing consultant. */
export const ESCALATION_THRESHOLD = 3;

export type NudgeReason = "deadline" | "inactivity" | "none";

export type TriggerInput = {
  /** 0–100 completion of the target's assessment work. */
  completionPercent: number;
  /** Days since the target last submitted/was active. */
  daysSinceActivity: number;
  /** Quarter completion target (0–100), or null when no quarter is set. */
  quarterTargetPercent: number | null;
  /** Days until the quarter due date, or null when no quarter is set. */
  daysToDeadline: number | null;
  /** Reminders already sent for this engagement. */
  priorSends: number;
  /** Cap on reminders for this engagement. */
  maxSends?: number;
};

export type TriggerDecision = { fire: boolean; reason: NudgeReason };

const NO_FIRE: TriggerDecision = { fire: false, reason: "none" };

/**
 * Decide whether to fire an automated reminder for one target. Priority:
 * deadline (near + behind target) → inactivity → nothing. Never fires for a
 * completed target or once the max-sends cap is hit.
 */
export function evaluateNudge(input: TriggerInput): TriggerDecision {
  const maxSends = input.maxSends ?? DEFAULT_MAX_SENDS;

  if (input.completionPercent >= 100) return NO_FIRE;
  if (reachedMaxSends(input.priorSends, maxSends)) return NO_FIRE;

  // Deadline pressure takes priority: near the quarter due date AND behind the
  // completion target needed for good data.
  if (
    input.daysToDeadline != null &&
    input.quarterTargetPercent != null &&
    input.daysToDeadline <= DEADLINE_WINDOW_DAYS &&
    input.daysToDeadline >= 0 &&
    input.completionPercent < input.quarterTargetPercent
  ) {
    return { fire: true, reason: "deadline" };
  }

  if (input.daysSinceActivity >= INACTIVITY_DAYS) {
    return { fire: true, reason: "inactivity" };
  }

  return NO_FIRE;
}

/**
 * Should an ignored streak escalate to the managing consultant? `ignoredCount`
 * is the number of prior reminders to this target that remain unread/unacted.
 */
export function shouldEscalateToConsultant(
  ignoredCount: number,
  threshold: number = ESCALATION_THRESHOLD
): boolean {
  return ignoredCount >= threshold;
}
