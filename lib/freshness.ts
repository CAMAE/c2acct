/**
 * 16a — canonical evidence-freshness reader. ONE source of the age→state mapping
 * so every surface (Trajectory, Peer Position, BattleCard rows, product pages,
 * the consultant board) reads freshness identically. No A3-class per-surface
 * re-implementations — a contract test pins that surfaces import from here.
 *
 * Honest-decay law: evidence age NEVER silently changes a score. Freshness is a
 * LABEL beside the number, never a multiplier on it. The windows below are the
 * single source of truth and are published verbatim on /methodology.
 */
export type FreshnessState = "fresh" | "aging" | "stale";

/**
 * Published freshness windows, in days:
 *   Fresh  — newest evidence < 90 days old
 *   Aging  — 90–365 days old
 *   Stale  — > 365 days old
 */
export const FRESHNESS_WINDOWS = {
  agingAfterDays: 90,
  staleAfterDays: 365,
} as const;

export const FRESHNESS_STATE_LABEL: Record<FreshnessState, string> = {
  fresh: "Fresh",
  aging: "Aging",
  stale: "Stale",
};

/** One-line window description per state, reused in tooltips + /methodology. */
export const FRESHNESS_STATE_WINDOW_LABEL: Record<FreshnessState, string> = {
  fresh: "under 90 days",
  aging: "90–365 days",
  stale: "over 365 days",
};

/** Chip tone tokens (CSS vars) — green / amber / orange, matching the band ramp. */
export const FRESHNESS_STATE_TONE: Record<FreshnessState, string> = {
  fresh: "var(--radar-green)",
  aging: "var(--radar-amber)",
  stale: "var(--brand-orange)",
};

export type FreshnessReading = {
  state: FreshnessState;
  ageDays: number;
  /** ISO timestamp of the newest evidence. */
  asOfIso: string;
  /** Relative age, e.g. "today", "1 day ago", "128 days ago". */
  ageLabel: string;
  /** Absolute date, e.g. "Jul 16, 2026". */
  asOfLabel: string;
};

export function freshnessStateForAgeDays(ageDays: number): FreshnessState {
  if (ageDays >= FRESHNESS_WINDOWS.staleAfterDays) return "stale";
  if (ageDays >= FRESHNESS_WINDOWS.agingAfterDays) return "aging";
  return "fresh";
}

function coerceDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * The canonical reader. Pass the newest evidence timestamp for a thing (a module
 * submission, a product assessment, a firm review) and get its freshness state.
 * `now` is injectable so callers/tests stay deterministic. Returns null when
 * there is no evidence date at all (never assume "stale" from missing data —
 * absence is not decay).
 */
export function readFreshness(
  newest: Date | string | number | null | undefined,
  now: Date = new Date()
): FreshnessReading | null {
  if (newest == null) return null;
  const date = coerceDate(newest);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  const ageDays = Math.max(0, Math.floor((now.getTime() - time) / 86_400_000));
  const ageLabel = ageDays === 0 ? "today" : ageDays === 1 ? "1 day ago" : `${ageDays} days ago`;
  const asOfLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return {
    state: freshnessStateForAgeDays(ageDays),
    ageDays,
    asOfIso: date.toISOString(),
    ageLabel,
    asOfLabel,
  };
}

/** Newest of a set of evidence dates (nulls ignored); null when the set is empty. */
export function newestDate(dates: Array<Date | string | number | null | undefined>): Date | null {
  let newest: number | null = null;
  for (const d of dates) {
    if (d == null) continue;
    const t = coerceDate(d).getTime();
    if (Number.isNaN(t)) continue;
    if (newest === null || t > newest) newest = t;
  }
  return newest === null ? null : new Date(newest);
}
