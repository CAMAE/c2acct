import type { AlertDecision, ChangeFinding, DnsSnapshot, WatchEvaluation } from "./types";

/**
 * Diff the previous snapshot against the current one. On the first run (no
 * previous snapshot) nothing is reported — that run only establishes the
 * baseline. DNS record lists are compared as sets (order-independent).
 */
export function diffState(previous: DnsSnapshot | null, current: DnsSnapshot): WatchEvaluation {
  if (!previous) {
    return { firstRun: true, changes: [], changed: false };
  }

  const changes: ChangeFinding[] = [];

  if (!sameSet(previous.ns, current.ns)) {
    changes.push({ code: "ns_changed", detail: `NS ${fmt(previous.ns)} → ${fmt(current.ns)}` });
  }
  if (!sameSet(previous.a, current.a)) {
    changes.push({ code: "a_changed", detail: `A ${fmt(previous.a)} → ${fmt(current.a)}` });
  }
  if (!sameSet(previous.wwwA, current.wwwA)) {
    changes.push({ code: "www_a_changed", detail: `www A ${fmt(previous.wwwA)} → ${fmt(current.wwwA)}` });
  }
  if ((previous.cloudflareZoneStatus ?? null) !== (current.cloudflareZoneStatus ?? null)) {
    changes.push({
      code: "cloudflare_zone_changed",
      detail: `zone ${previous.cloudflareZoneStatus ?? "n/a"} → ${current.cloudflareZoneStatus ?? "n/a"}`,
    });
  }

  return { firstRun: false, changes, changed: changes.length > 0 };
}

/** Alert-only: any change since the last run pages the operator. No actions. */
export function decideAlert(evaluation: WatchEvaluation): AlertDecision {
  if (!evaluation.changed) {
    return { shouldAlert: false, message: "" };
  }
  return { shouldAlert: true, message: formatAlertMessage(evaluation.changes) };
}

export function formatAlertMessage(changes: ChangeFinding[]): string {
  const header = `🌐 patalign.com state change — ${changes.length} change(s)`;
  const lines = changes.map((change) => `• ${change.code}: ${change.detail}`);
  return [header, ...lines].join("\n");
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function fmt(values: string[]): string {
  return values.length === 0 ? "(none)" : `[${values.join(", ")}]`;
}
