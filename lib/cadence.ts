import prisma from "@/lib/prisma";
import { FIRM_PILLARS } from "@/lib/firmPillars";

/**
 * 16d — the ONE re-assessment-cadence reader (anti-A3). The consultant board and
 * the 16b staleness generators both resolve cadence through here, so a company's
 * census/pulse windows are computed identically everywhere. Absence of a
 * CadenceConfig row means system defaults — configuration is purely additive.
 */
export const CADENCE_DEFAULTS = {
  censusIntervalMonths: 12,
  pulseIntervalMonths: 3,
} as const;

/** Default pulse rotation = the canonical pillar order (16a lexicon). */
export const DEFAULT_PULSE_ROTATION: readonly string[] = FIRM_PILLARS;

export type RawCadenceConfig = {
  censusIntervalMonths: number | null;
  censusAnchorMonth: number | null;
  pulseIntervalMonths: number | null;
  pulseRotation: unknown;
  setBy: string | null;
};

export type EffectiveCadence = {
  censusIntervalMonths: number;
  /** 1-12; the month a full census anchors to (default = month of last census). */
  censusAnchorMonth: number | null;
  pulseIntervalMonths: number;
  pulseRotation: string[];
  setByUserId: string | null;
  source: "default" | "configured";
};

function coerceRotation(value: unknown): string[] {
  if (Array.isArray(value) && value.length > 0 && value.every((x) => typeof x === "string")) {
    return value as string[];
  }
  return [...DEFAULT_PULSE_ROTATION];
}

/**
 * PURE resolver — a config row (or null) + the month of the last full census →
 * effective cadence. Every unset field falls back to a system default.
 */
export function resolveCadence(
  config: RawCadenceConfig | null,
  lastCensusMonth: number | null
): EffectiveCadence {
  return {
    censusIntervalMonths: config?.censusIntervalMonths ?? CADENCE_DEFAULTS.censusIntervalMonths,
    censusAnchorMonth: config?.censusAnchorMonth ?? lastCensusMonth,
    pulseIntervalMonths: config?.pulseIntervalMonths ?? CADENCE_DEFAULTS.pulseIntervalMonths,
    pulseRotation: coerceRotation(config?.pulseRotation),
    setByUserId: config?.setBy ?? null,
    source: config ? "configured" : "default",
  };
}

/**
 * The async reader every surface calls. Resolves the company's cadence config
 * (if any) and the month of its last full census (its newest maturity snapshot).
 */
export async function effectiveCadence(companyId: string): Promise<EffectiveCadence> {
  const [config, lastCensus] = await Promise.all([
    prisma.cadenceConfig.findUnique({
      where: { companyId },
      select: {
        censusIntervalMonths: true,
        censusAnchorMonth: true,
        pulseIntervalMonths: true,
        pulseRotation: true,
        setBy: true,
      },
    }),
    prisma.firmMaturitySnapshot.findFirst({
      where: { companyId },
      orderBy: { computedAt: "desc" },
      select: { computedAt: true },
    }),
  ]);
  const lastCensusMonth = lastCensus ? lastCensus.computedAt.getUTCMonth() + 1 : null;
  return resolveCadence(config, lastCensusMonth);
}

/** Pure: next full-census due date from the last census, or null if never. */
export function nextCensusDueMs(lastCensusMs: number | null, cadence: EffectiveCadence): number | null {
  if (lastCensusMs == null) return null;
  const d = new Date(lastCensusMs);
  d.setUTCMonth(d.getUTCMonth() + cadence.censusIntervalMonths);
  return d.getTime();
}

/** Pure: next rotating-pulse due date from the last pulse, or null if never. */
export function nextPulseDueMs(lastPulseMs: number | null, cadence: EffectiveCadence): number | null {
  if (lastPulseMs == null) return null;
  const d = new Date(lastPulseMs);
  d.setUTCMonth(d.getUTCMonth() + cadence.pulseIntervalMonths);
  return d.getTime();
}
