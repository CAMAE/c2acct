import type { HealthSummary, PilotMemberSnapshot } from "./types";

export const DEFAULT_STALLED_THRESHOLD_DAYS = 7;

/**
 * Compute pilot health from member provisioning states. There is no login
 * timestamp in the schema, so health is derived from PilotCohortMember.
 * provisioningState plus age:
 *   - active        = ACTIVE
 *   - provisioning  = PROVISIONING
 *   - invited       = INVITED (any age)
 *   - stalled       = INVITED older than the threshold (invited, not progressing)
 *   - blocked       = BLOCKED
 *   - archived      = ARCHIVED (excluded from the live cohort counts)
 */
export function computeHealth(
  members: PilotMemberSnapshot[],
  nowMs: number,
  stalledThresholdDays: number = DEFAULT_STALLED_THRESHOLD_DAYS
): HealthSummary {
  const thresholdMs = stalledThresholdDays * 24 * 60 * 60 * 1000;
  const summary: HealthSummary = {
    total: members.length,
    active: 0,
    provisioning: 0,
    invited: 0,
    stalled: 0,
    blocked: 0,
    archived: 0,
    stalledMembers: [],
    blockedMembers: [],
  };

  for (const member of members) {
    switch (member.provisioningState) {
      case "ACTIVE":
        summary.active += 1;
        break;
      case "PROVISIONING":
        summary.provisioning += 1;
        break;
      case "INVITED": {
        summary.invited += 1;
        if (nowMs - member.createdAtMs > thresholdMs) {
          summary.stalled += 1;
          summary.stalledMembers.push(member.displayName);
        }
        break;
      }
      case "BLOCKED":
        summary.blocked += 1;
        summary.blockedMembers.push(member.displayName);
        break;
      case "ARCHIVED":
        summary.archived += 1;
        break;
    }
  }

  return summary;
}

/** Stalled or blocked members make the summary an alert-tier digest. */
export function healthHasAlert(summary: HealthSummary): boolean {
  return summary.stalled > 0 || summary.blocked > 0;
}

export function formatHealthSummary(summary: HealthSummary): string {
  const lines = [
    `${healthHasAlert(summary) ? "⚠️" : "✅"} PAT pilot health — ${summary.total} member(s)`,
    `active: ${summary.active} · provisioning: ${summary.provisioning} · invited: ${summary.invited}`,
    `stalled: ${summary.stalled} · blocked: ${summary.blocked} · archived: ${summary.archived}`,
  ];
  if (summary.stalledMembers.length > 0) {
    lines.push(`stalled (invited >7d): ${summary.stalledMembers.join(", ")}`);
  }
  if (summary.blockedMembers.length > 0) {
    lines.push(`blocked: ${summary.blockedMembers.join(", ")}`);
  }
  return lines.join("\n");
}
