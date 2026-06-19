import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { gatherPingTargets } from "@/lib/notifications/gather";
import { planPings } from "@/lib/notifications/planPings";
import { executePingPlan } from "@/lib/notifications/executePlan";

/**
 * Ping-sweep runner (Phase B3b-2b, 2026-06-18). The single entry point the
 * scheduled agent calls: gate on PAT_ENABLE_PINGS, gather DB facts, run the pure
 * planner, execute through the B1 store. Deterministic backbone — no LLM. When
 * the flag is off it is a hard no-op (no DB reads, no writes).
 */

export type PingSweepSummary = {
  enabled: boolean;
  evaluated: number;
  fired: number;
  escalated: number;
  created: number;
  suppressed: number;
  total: number;
};

const NOOP_SUMMARY: PingSweepSummary = {
  enabled: false,
  evaluated: 0,
  fired: 0,
  escalated: 0,
  created: 0,
  suppressed: 0,
  total: 0,
};

export async function runPingSweep(nowMs: number = Date.now()): Promise<PingSweepSummary> {
  if (!isPingsEnabled()) {
    return NOOP_SUMMARY;
  }

  const targets = await gatherPingTargets(nowMs);
  const plan = planPings(targets, nowMs);
  const exec = await executePingPlan(plan, { actorUserId: null });

  return {
    enabled: true,
    evaluated: plan.evaluated,
    fired: plan.fired,
    escalated: plan.escalated,
    created: exec.created,
    suppressed: exec.suppressed,
    total: exec.total,
  };
}
