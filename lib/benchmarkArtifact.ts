import { quarterCutoff } from "@/lib/consultantFreshness";

/**
 * 16g — the quarterly PAT Benchmark artifact (P1-1, "the Grid pattern"). The
 * recurring external event that converts private staleness into visible standing:
 * a published quarter cutoff ("assessments completed by {cutoff} count for
 * {quarter}") that gives every member a deadline and a reason to re-assess.
 *
 * Visibility ruling (2026-07-17): the artifact is visible to ALL member tiers.
 * Tier walls apply INSIDE it as everywhere — Pro sees bands/counts/percentiles,
 * Elite sees the deeper ranked position. No public/unauthenticated version at v1.
 * The cutoff mechanics are published verbatim on /methodology.
 *
 * Freshness is a label; the cutoff is a calendar deadline. Neither changes a
 * score — they change what counts in the next benchmark cut.
 */

export type BenchmarkArtifactMeta = {
  /** e.g. "2026-Q3". */
  quarterKey: string;
  /** e.g. "Q3 2026". */
  quarterLabel: string;
  cutoffIso: string;
  /** e.g. "Sep 30, 2026". */
  cutoffLabel: string;
  /** One-line published rule. */
  cutoffSentence: string;
  /** Whole days from `now` to the cutoff (0 if already past). */
  daysToCutoff: number;
};

const MONTH_DAY_YEAR = { month: "short", day: "numeric", year: "numeric" } as const;

/** Calendar quarter key for a date, e.g. 2026-07 → "2026-Q3". */
export function quarterKeyFor(now: Date): string {
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${now.getUTCFullYear()}-Q${q}`;
}

/** Human label for a quarter key, e.g. "2026-Q3" → "Q3 2026". */
export function quarterLabelFor(now: Date): string {
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `Q${q} ${now.getUTCFullYear()}`;
}

export function getBenchmarkArtifactMeta(now: Date = new Date()): BenchmarkArtifactMeta {
  const cutoff = quarterCutoff(now);
  const cutoffLabel = cutoff.toLocaleDateString("en-US", MONTH_DAY_YEAR);
  const quarterLabel = quarterLabelFor(now);
  const daysToCutoff = Math.max(0, Math.ceil((cutoff.getTime() - now.getTime()) / 86_400_000));
  return {
    quarterKey: quarterKeyFor(now),
    quarterLabel,
    cutoffIso: cutoff.toISOString(),
    cutoffLabel,
    cutoffSentence: `Assessments completed by ${cutoffLabel} count for the ${quarterLabel} benchmark.`,
    daysToCutoff,
  };
}
