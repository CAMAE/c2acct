import { evaluateNudge, shouldEscalateToConsultant, type NudgeReason } from "@/lib/notifications/triggers";

/**
 * Ping run planner (Phase B3b-1, 2026-06-18). Pure, side-effect-free: given a
 * snapshot of each managed target plus `nowMs`, it computes the whole-day date
 * facts, calls the B3a decision engine, and returns the notifications to create
 * (reminders + consultant escalations). The scheduler runner (B3b-2) gathers the
 * snapshots from the DB and executes this plan via the B1 store.
 *
 * Mirrors lib/agents/pilot-ops computeHealth: nowMs is injected (never read
 * inside) so the date math is deterministic and unit-testable — the exact place
 * date drift could hide, isolated here.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two epoch-ms instants, floored (timezone-free integer math). */
export function wholeDaysBetween(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / DAY_MS);
}

export const AUTO_KIND: Record<"firm" | "vendor", string> = {
  firm: "AUTO_FIRM_REMINDER",
  vendor: "AUTO_VENDOR_REMINDER",
};
export const ESCALATION_KIND = "ESCALATION_TO_CONSULTANT";

export type PingTarget = {
  companyId: string;
  audience: "firm" | "vendor";
  completionPercent: number;
  /** Epoch-ms of the target's most recent activity/submission. */
  lastActivityMs: number;
  quarterTargetPercent: number | null;
  /** Epoch-ms of the quarter due date, or null when no quarter is set. */
  quarterDueMs: number | null;
  priorSends: number;
  /** Prior reminders to this target that remain unread (drives escalation). */
  ignoredCount: number;
  recipientUserIds: string[];
  /** The managing consultant's user id, for escalation; null if none. */
  consultantUserId: string | null;
};

export type PlannedNotification = {
  recipientUserId: string;
  audience: string;
  kind: string;
  reason: NudgeReason | "escalation";
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  sourceType: "Company";
  sourceId: string;
};

export type PingPlan = {
  notifications: PlannedNotification[];
  evaluated: number;
  fired: number;
  escalated: number;
};

function autoMessage(
  reason: Exclude<NudgeReason, "none">,
  audience: "firm" | "vendor"
): { title: string; body: string; ctaLabel: string; ctaHref: string } {
  const assessment = audience === "vendor" ? "product self-assessment" : "alignment assessment";
  const ctaHref = audience === "vendor" ? "/vendor/product-assessment" : "/firm/alignment-assessment";
  const ctaLabel = audience === "vendor" ? "Open your product assessment" : "Open your alignment assessment";
  const body =
    reason === "deadline"
      ? `Your quarter close is coming up — please finish your ${assessment} so your data is complete.`
      : `It's been a little while — when you have a moment, please continue your ${assessment} so your briefing stays current.`;
  return { title: "A reminder from Patalign", body, ctaLabel, ctaHref };
}

function escalationMessage(audience: "firm" | "vendor"): { title: string; body: string } {
  return {
    title: "A managed account needs a personal nudge",
    body: `A ${audience} you manage hasn't responded to recent reminders. Consider reaching out directly.`,
  };
}

/** Build the notification plan for a sweep. Pure: no DB, no clock, no sends. */
export function planPings(targets: PingTarget[], nowMs: number): PingPlan {
  const notifications: PlannedNotification[] = [];
  let fired = 0;
  let escalated = 0;

  for (const target of targets) {
    const daysSinceActivity = wholeDaysBetween(target.lastActivityMs, nowMs);
    const daysToDeadline =
      target.quarterDueMs != null ? wholeDaysBetween(nowMs, target.quarterDueMs) : null;

    const decision = evaluateNudge({
      completionPercent: target.completionPercent,
      daysSinceActivity,
      quarterTargetPercent: target.quarterTargetPercent,
      daysToDeadline,
      priorSends: target.priorSends,
    });

    if (decision.fire && decision.reason !== "none") {
      const msg = autoMessage(decision.reason, target.audience);
      for (const recipientUserId of target.recipientUserIds) {
        notifications.push({
          recipientUserId,
          audience: target.audience,
          kind: AUTO_KIND[target.audience],
          reason: decision.reason,
          title: msg.title,
          body: msg.body,
          ctaLabel: msg.ctaLabel,
          ctaHref: msg.ctaHref,
          sourceType: "Company",
          sourceId: target.companyId,
        });
      }
      fired += 1;
    }

    if (target.consultantUserId && shouldEscalateToConsultant(target.ignoredCount)) {
      const msg = escalationMessage(target.audience);
      notifications.push({
        recipientUserId: target.consultantUserId,
        audience: "consultant",
        kind: ESCALATION_KIND,
        reason: "escalation",
        title: msg.title,
        body: msg.body,
        ctaLabel: null,
        ctaHref: null,
        sourceType: "Company",
        sourceId: target.companyId,
      });
      escalated += 1;
    }
  }

  return { notifications, evaluated: targets.length, fired, escalated };
}
