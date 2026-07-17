import prisma from "@/lib/prisma";
import { readFreshness, type FreshnessReading, type FreshnessState } from "@/lib/freshness";
import {
  resolveCadence,
  nextCensusDueMs,
  type RawCadenceConfig,
  type EffectiveCadence,
} from "@/lib/cadence";
import type { ConsultantAccessState } from "@/lib/consultantAccess";

/**
 * 16e — the consultant freshness board reader (P2-1). For every firm a consultant
 * advises (deduped across their ecosystems), resolve evidence freshness via the
 * ONE canonical reader ([[freshness]] readFreshness) and the next re-assessment
 * due date via the ONE cadence reader ([[cadence]] resolveCadence + nextCensusDueMs).
 * No per-surface re-implementation — anti-A3 pinned by a contract test.
 *
 * Governance rails hold: freshness is a LABEL (never alters a score); the board
 * states the benchmark consequence and lets the consultant decide; the nudge is a
 * human-in-the-loop click on the consultant's behalf (Pat-drafted template).
 */

export type ConsultantFirmFreshnessStatus = "never" | "overdue" | "due-soon" | "on-track";

export type ConsultantFirmFreshnessRow = {
  companyId: string;
  companyName: string;
  /** Distinct ecosystem/vendor contexts this firm is reached through. */
  ecosystems: string[];
  /** Null when the firm has never been assessed (absence is not staleness). */
  freshness: FreshnessReading | null;
  lastCensusIso: string | null;
  nextCensusDueIso: string | null;
  nextCensusDueLabel: string | null;
  cadenceSource: EffectiveCadence["source"];
  status: ConsultantFirmFreshnessStatus;
};

export type ConsultantFreshnessSummary = {
  total: number;
  needsAttention: number; // never + overdue + due-soon
  overdue: number;
  dueSoon: number;
  onTrack: number;
  never: number;
  fresh: number;
  aging: number;
  stale: number;
};

export type ConsultantFreshnessBoard = {
  cutoffIso: string;
  cutoffLabel: string;
  firms: ConsultantFirmFreshnessRow[];
  summary: ConsultantFreshnessSummary;
};

/** Minimal client surface, so the contract test can inject a fake. */
export type FreshnessBoardClient = {
  firmMaturitySnapshot: {
    groupBy: (args: {
      by: ["companyId"];
      where: { companyId: { in: string[] } };
      _max: { computedAt: true };
    }) => Promise<Array<{ companyId: string; _max: { computedAt: Date | null } }>>;
  };
  cadenceConfig: {
    findMany: (args: {
      where: { companyId: { in: string[] } };
      select: {
        companyId: true;
        censusIntervalMonths: true;
        censusAnchorMonth: true;
        pulseIntervalMonths: true;
        pulseRotation: true;
        setBy: true;
      };
    }) => Promise<Array<{ companyId: string } & RawCadenceConfig>>;
  };
};

const MONTH_LABEL_OPTS = { month: "short", day: "numeric", year: "numeric" } as const;

/** Last instant of the calendar quarter that `now` falls in — the cohort cutoff. */
export function quarterCutoff(now: Date): Date {
  const q = Math.floor(now.getUTCMonth() / 3); // 0..3
  const endMonth = q * 3 + 2; // 0-based last month of the quarter
  // Day 0 of the following month = last day of endMonth.
  return new Date(Date.UTC(now.getUTCFullYear(), endMonth + 1, 0, 23, 59, 59, 999));
}

function statusFor(
  lastCensusMs: number | null,
  nextDueMs: number | null,
  nowMs: number,
  cutoffMs: number
): ConsultantFirmFreshnessStatus {
  if (lastCensusMs == null || nextDueMs == null) return "never";
  if (nextDueMs < nowMs) return "overdue";
  if (nextDueMs <= cutoffMs) return "due-soon";
  return "on-track";
}

/**
 * Flatten the consultant's ecosystems into a deduped firm list, then resolve each
 * firm's freshness + next-census-due through the canonical readers. Batched to two
 * queries (newest snapshot per firm, cadence configs) regardless of firm count.
 */
export async function getConsultantFreshnessBoard(
  access: Pick<ConsultantAccessState, "ecosystems">,
  now: Date = new Date(),
  // Prisma's groupBy generic over-constrains structural assignment; the runtime
  // args are valid. The narrow type is what the contract-test fake implements.
  client: FreshnessBoardClient = prisma as unknown as FreshnessBoardClient
): Promise<ConsultantFreshnessBoard> {
  const nowMs = now.getTime();
  const cutoff = quarterCutoff(now);
  const cutoffMs = cutoff.getTime();

  // Dedup firms across ecosystems; collect the contexts each is reached through.
  const firmOrder: string[] = [];
  const nameById = new Map<string, string>();
  const contextsById = new Map<string, Set<string>>();
  for (const scope of access.ecosystems) {
    const context = scope.vendorCompanyName ?? scope.ecosystemName;
    for (const firm of scope.firmCompanies) {
      if (!nameById.has(firm.id)) {
        firmOrder.push(firm.id);
        nameById.set(firm.id, firm.name);
        contextsById.set(firm.id, new Set());
      }
      if (context) contextsById.get(firm.id)!.add(context);
    }
  }

  const emptySummary: ConsultantFreshnessSummary = {
    total: 0, needsAttention: 0, overdue: 0, dueSoon: 0, onTrack: 0, never: 0, fresh: 0, aging: 0, stale: 0,
  };
  if (firmOrder.length === 0) {
    return { cutoffIso: cutoff.toISOString(), cutoffLabel: cutoff.toLocaleDateString("en-US", MONTH_LABEL_OPTS), firms: [], summary: emptySummary };
  }

  const [snaps, configs] = await Promise.all([
    client.firmMaturitySnapshot.groupBy({
      by: ["companyId"],
      where: { companyId: { in: firmOrder } },
      _max: { computedAt: true },
    }),
    client.cadenceConfig.findMany({
      where: { companyId: { in: firmOrder } },
      select: {
        companyId: true,
        censusIntervalMonths: true,
        censusAnchorMonth: true,
        pulseIntervalMonths: true,
        pulseRotation: true,
        setBy: true,
      },
    }),
  ]);

  const lastCensusById = new Map<string, Date | null>();
  for (const s of snaps) lastCensusById.set(s.companyId, s._max.computedAt ?? null);
  const configById = new Map<string, RawCadenceConfig>();
  for (const c of configs) {
    const { companyId, ...raw } = c;
    configById.set(companyId, raw);
  }

  const rows: ConsultantFirmFreshnessRow[] = firmOrder.map((companyId) => {
    const lastCensus = lastCensusById.get(companyId) ?? null;
    const lastCensusMs = lastCensus ? lastCensus.getTime() : null;
    const lastCensusMonth = lastCensus ? lastCensus.getUTCMonth() + 1 : null;
    const cadence = resolveCadence(configById.get(companyId) ?? null, lastCensusMonth);
    const nextDueMs = nextCensusDueMs(lastCensusMs, cadence);
    const nextDue = nextDueMs != null ? new Date(nextDueMs) : null;
    return {
      companyId,
      companyName: nameById.get(companyId) ?? companyId,
      ecosystems: [...(contextsById.get(companyId) ?? [])],
      freshness: readFreshness(lastCensus, now),
      lastCensusIso: lastCensus ? lastCensus.toISOString() : null,
      nextCensusDueIso: nextDue ? nextDue.toISOString() : null,
      nextCensusDueLabel: nextDue ? nextDue.toLocaleDateString("en-US", MONTH_LABEL_OPTS) : null,
      cadenceSource: cadence.source,
      status: statusFor(lastCensusMs, nextDueMs, nowMs, cutoffMs),
    };
  });

  // Most urgent first, then soonest due; never-assessed sink to the top (they owe a first census).
  const rank: Record<ConsultantFirmFreshnessStatus, number> = { never: 0, overdue: 1, "due-soon": 2, "on-track": 3 };
  rows.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    const ad = a.nextCensusDueIso ? Date.parse(a.nextCensusDueIso) : Infinity;
    const bd = b.nextCensusDueIso ? Date.parse(b.nextCensusDueIso) : Infinity;
    return ad - bd;
  });

  const summary: ConsultantFreshnessSummary = { ...emptySummary, total: rows.length };
  for (const r of rows) {
    if (r.status === "never") summary.never += 1;
    else if (r.status === "overdue") summary.overdue += 1;
    else if (r.status === "due-soon") summary.dueSoon += 1;
    else summary.onTrack += 1;
    const state: FreshnessState | null = r.freshness?.state ?? null;
    if (state === "fresh") summary.fresh += 1;
    else if (state === "aging") summary.aging += 1;
    else if (state === "stale") summary.stale += 1;
  }
  summary.needsAttention = summary.never + summary.overdue + summary.dueSoon;

  return {
    cutoffIso: cutoff.toISOString(),
    cutoffLabel: cutoff.toLocaleDateString("en-US", MONTH_LABEL_OPTS),
    firms: rows,
    summary,
  };
}
