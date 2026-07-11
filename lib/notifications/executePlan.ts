import { createNotification, recordNudge } from "@/lib/notifications/store";
import type { PingPlan } from "@/lib/notifications/planPings";

/**
 * Ping plan executor (Phase B3b-2a, 2026-06-18). Takes the pure planner's output
 * and writes each planned notification THROUGH the B1 store — so the preference
 * gate (in-app toggle, per-kind opt-out) and the (recipient, source, kind) dedupe
 * unique index both apply. Never a raw insert. Every send is recorded as an
 * automated (manual: false) NudgeEvent for the audit trail.
 *
 * The scheduler runner (B3b-2b) calls gatherPingTargets → planPings → here.
 */

export type ExecutePlanResult = {
  /** Notifications actually created (passed the preference + dedupe gate). */
  created: number;
  /** Planned but suppressed (disabled/opted-out/duplicate). */
  suppressed: number;
  /** Total planned notifications. */
  total: number;
};

export async function executePingPlan(
  plan: PingPlan,
  opts?: { actorUserId?: string | null }
): Promise<ExecutePlanResult> {
  const actorUserId = opts?.actorUserId ?? null;
  let created = 0;
  let suppressed = 0;

  for (const planned of plan.notifications) {
    const result = await createNotification({
      recipientUserId: planned.recipientUserId,
      audience: planned.audience,
      kind: planned.kind,
      title: planned.title,
      body: planned.body,
      ctaLabel: planned.ctaLabel,
      ctaHref: planned.ctaHref,
      sourceType: planned.sourceType,
      sourceId: planned.sourceId,
      actorUserId,
      // Block 9a: automated Pat pings are AI-drafted ("Hi, it's Pat …").
      aiGenerated: true,
    });

    if (result.created) {
      created += 1;
    } else {
      suppressed += 1;
    }

    await recordNudge({
      actorUserId,
      recipientUserId: planned.recipientUserId,
      kind: planned.kind,
      sourceType: planned.sourceType,
      sourceId: planned.sourceId,
      manual: false,
    });
  }

  return { created, suppressed, total: plan.notifications.length };
}
