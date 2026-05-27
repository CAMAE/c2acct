/** Snapshot of patalign.com DNS + Cloudflare zone state at one point in time. */
export interface DnsSnapshot {
  ns: string[];
  a: string[];
  wwwA: string[];
  /** Cloudflare zone status (e.g. "active", "pending"); null when not read. */
  cloudflareZoneStatus: string | null;
  capturedAt: string;
}

export type ChangeCode = "ns_changed" | "a_changed" | "www_a_changed" | "cloudflare_zone_changed";

export interface ChangeFinding {
  code: ChangeCode;
  detail: string;
}

export interface WatchEvaluation {
  firstRun: boolean;
  changes: ChangeFinding[];
  changed: boolean;
}

export interface AlertDecision {
  shouldAlert: boolean;
  message: string;
}
