/**
 * THE one scoring module (scoring-core, R63; R-X.13 in the unified spec).
 *
 * Every number a reader sees as a score, index, percentile, rank, band or
 * evidence floor is computed HERE and nowhere else. tests/one-core.contract.test.ts
 * fails the build on any other definition of these names in lib, app or scripts.
 * The two lexicon modules this file re-exports (lib/bandLexicon for the score
 * bands, lib/confidenceBands for the confidence table) are the only other
 * homes, and they define words, not arithmetic.
 *
 *  - computeScore: unweighted mean of the answers, scaled to 0 to 100, rounded
 *    once (the display value). The scale comes from the stored row, else SCALE.
 *  - alignmentIndex: equal-weight mean of the five module scores; null under
 *    three final modules (ruling 15, default): the surface says "Partial" and
 *    shows the module scores only.
 *  - percentileRank: count-based, the share of the cohort at or below you.
 *    Every reader uses this one definition; Elite reads the STORED percentile
 *    from the run, never a live interpolation (ruling 17).
 *  - rankFromTop: ordinal rank from the stored percentile and n (1 = best).
 *  - bandFor: the one score-band lookup (lib/bandLexicon SCORE_BANDS).
 *  - SCALE, MIN_CONTRIBUTORS, MAX_CONTRIBUTOR_SHARE, the divergence pair, the
 *    score-version constants, displayTierFor (ruling 13) and RANK_MIN_N
 *    (ruling 27): one value each.
 *  - latestFinalPerFirm: one firm, one vote (enforce-core, R62).
 */

import { SCORE_BANDS, scoreBandFor } from "@/lib/bandLexicon";
import { confidenceBandForSampleSize } from "@/lib/confidenceBands";

export { SCORE_BANDS, scoreBandFor as bandFor, confidenceBandForSampleSize };

// ─── Scale (R-X.2, ruling 9): one constant, 0 to 5, stored as given ──────────

/** The one answer scale. 0 is "Not in place", a categorical floor; 1 to 5 carry labels. */
export const SCALE = { min: 0, max: 5 } as const;

/**
 * Rows stored before scale metadata existed were answered 1 to 5. The one
 * resolver keeps them readable without a second scale constant anywhere else.
 */
export const LEGACY_SCALE_MIN = 1;

/** The scale a stored submission was answered on: its own metadata, else the legacy 1 to 5. */
export function resolveStoredScale(
  scaleMin: number | null | undefined,
  scaleMax: number | null | undefined
): { scaleMin: number; scaleMax: number } {
  if (Number.isFinite(scaleMin) && Number.isFinite(scaleMax) && Number(scaleMax) > Number(scaleMin)) {
    return { scaleMin: Number(scaleMin), scaleMax: Number(scaleMax) };
  }
  return { scaleMin: LEGACY_SCALE_MIN, scaleMax: SCALE.max };
}

// ─── Evidence (R-X.5): final means the one version constant ───────────────────

/** A draft row: autosaved, never scored, never read by a benchmark. */
export const DRAFT_SCORE_VERSION = 0;
/** A final row: the one value every submit route stores and every reader filters on. */
export const FINAL_SCORE_VERSION = 1;

// ─── Score (R-X.13): arithmetic on answers, one rounding ─────────────────────

export type ScoreInput = {
  answers: Record<string, number> | null | undefined;
  scaleMin: number;
  scaleMax: number;
};

export type ScoreResult = {
  scaleMin: number;
  scaleMax: number;
  /** The displayed 0 to 100 value, rounded once. */
  score: number;
  rawScorePct: number;
  weightedAvg: number | null;
  rawWeightedAvg: number | null;
  totalWeight: number;
  answeredCount: number;
};

/**
 * Unweighted mean of the numeric answers, placed on the stored scale and
 * expressed as 0 to 100. The only rounding is the one that produces the
 * displayed integer; the mean itself is kept unrounded for audit.
 */
export function computeScore(input: ScoreInput): ScoreResult {
  const { answers, scaleMin, scaleMax } = input;
  const safeAnswers: Record<string, number> =
    answers && typeof answers === "object" ? (answers as Record<string, number>) : {};
  const values = Object.values(safeAnswers)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const answeredCount = values.length;
  if (answeredCount === 0) {
    return { score: 0, rawScorePct: 0, weightedAvg: null, rawWeightedAvg: null, totalWeight: 0, answeredCount: 0, scaleMin, scaleMax };
  }
  const totalWeight = answeredCount;
  const weightedAvg = values.reduce((left, right) => left + right, 0) / totalWeight;
  const denominator = scaleMax - scaleMin;
  const rawScorePct = denominator === 0 ? 0 : Math.round(((weightedAvg - scaleMin) / denominator) * 100);
  return { score: rawScorePct, rawScorePct, weightedAvg, rawWeightedAvg: weightedAvg, totalWeight, answeredCount, scaleMin, scaleMax };
}

// ─── Alignment index (ruling 15, default): equal weight, three-module floor ──

/** An index needs this many final modules; fewer reads "Partial". */
export const ALIGNMENT_INDEX_MIN_MODULES = 3;

/**
 * Equal-weight mean of the scored modules, rounded once. Null when fewer than
 * ALIGNMENT_INDEX_MIN_MODULES modules have a score. Nulls in the input are
 * modules without a final and do not count.
 */
export function alignmentIndex(moduleScores: Iterable<number | null | undefined>): number | null {
  const scored = [...moduleScores].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (scored.length < ALIGNMENT_INDEX_MIN_MODULES) return null;
  return Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length);
}

export type AlignmentIndexState =
  | { kind: "index"; index: number; scoredCount: number }
  | { kind: "partial"; index: null; scoredCount: number }
  | { kind: "none"; index: null; scoredCount: 0 };

/** The index, or why there is none: "partial" when some modules are scored but under the floor. */
export function alignmentIndexState(moduleScores: Iterable<number | null | undefined>): AlignmentIndexState {
  const scores = [...moduleScores];
  const scoredCount = scores.filter((value) => typeof value === "number" && Number.isFinite(value)).length;
  const index = alignmentIndex(scores);
  if (index !== null) return { kind: "index", index, scoredCount };
  if (scoredCount > 0) return { kind: "partial", index: null, scoredCount };
  return { kind: "none", index: null, scoredCount: 0 };
}

/** The one reader-facing phrase for an index that is not a number. */
export function alignmentIndexLabel(state: AlignmentIndexState, totalModules: number): string {
  if (state.kind === "index") return String(state.index);
  if (state.kind === "partial") return `Partial (${state.scoredCount} of ${totalModules} modules scored)`;
  return "not scored yet";
}

// ─── Percentile and rank (R-X.6, rulings 13, 17, 27) ─────────────────────────

/** Percentile RANK of x within values: the share of the cohort at or below x, 0 to 100, rounded once. */
export function percentileRank(values: readonly number[], x: number): number {
  if (values.length === 0) return 0;
  const atOrBelow = values.filter((v) => v <= x).length;
  return Math.round((atOrBelow / values.length) * 100);
}

/** Ordinal rank from the top (1 = best) implied by a stored percentile and the cohort size. */
export function rankFromTop(percentile: number, n: number): number {
  if (n <= 0) return 0;
  return Math.min(n, Math.max(1, n - Math.round((percentile / 100) * n) + 1));
}

/** Exact rank is shown only at this many contributors or more (ruling 27, recommendation adopted by the box). */
export const RANK_MIN_N = 10;

/**
 * legal-load (R64, delta 7a): a displayed percentile never reads 100. The stored
 * percentile is count-based (the share of the cohort at or below you), so the top
 * firm computes 100 and reads as if nobody stands with it; every surface prints at
 * most the 99th. Display only: stored percentiles, ranks and tiers are untouched.
 */
export const DISPLAY_PERCENTILE_MAX = 99;
export function displayPercentile(percentile: number): number {
  return Math.max(0, Math.min(DISPLAY_PERCENTILE_MAX, Math.round(percentile)));
}

export type DisplayTier = "none" | "median" | "quartiles" | "percentile";

/** The cohort sizes at which each display opens (ruling 13). */
export const DISPLAY_TIER_MIN_N = { median: 5, quartiles: 10, percentile: 30 } as const;

/**
 * What a cohort of n may show: under 5 nothing; 5 to 9 the median and the band;
 * 10 to 29 the quartiles and the band; 30 and up the percentile. Rank follows
 * RANK_MIN_N, not this tier.
 */
export function displayTierFor(n: number): DisplayTier {
  if (n >= DISPLAY_TIER_MIN_N.percentile) return "percentile";
  if (n >= DISPLAY_TIER_MIN_N.quartiles) return "quartiles";
  if (n >= DISPLAY_TIER_MIN_N.median) return "median";
  return "none";
}

/** Whether an exact rank may be shown for a cohort of n. */
export function rankShownFor(n: number): boolean {
  return n >= RANK_MIN_N;
}

// ─── Evidence floor (R-X.7): five contributors, no contributor above 25 percent ─

/** Minimum distinct contributors before a benchmark cut may be published. */
export const MIN_CONTRIBUTORS = 5;
/** No single contributor may exceed this share of a cut's weight. */
export const MAX_CONTRIBUTOR_SHARE = 0.25;

// ─── One firm, one vote (R62) ────────────────────────────────────────────────

export type LatestFinalPerFirmPick<T> = {
  /** The voting firm (companyId). Rows without one are dropped. */
  firmId: (row: T) => string | null | undefined;
  /** Optional second key (product, module). Omit for one vote per firm overall. */
  groupKey?: (row: T) => string | null | undefined;
  createdAt: (row: T) => Date;
};

/**
 * Keep the newest row per (firm, group). Output is newest-first within the
 * input's stable order, one row per key, so a caller that already sorted
 * newest-first sees the same first row it would have seen before.
 */
export function latestFinalPerFirm<T>(rows: readonly T[], pick: LatestFinalPerFirmPick<T>): T[] {
  const sorted = [...rows].sort((a, b) => pick.createdAt(b).getTime() - pick.createdAt(a).getTime());
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of sorted) {
    const firmId = pick.firmId(row);
    if (!firmId) continue;
    const group = pick.groupKey ? pick.groupKey(row) : "";
    if (pick.groupKey && !group) continue;
    const key = `${firmId}::${group ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Distinct firms among the rows (the honest assessmentCount after one-vote). */
export function distinctFirmCount<T>(rows: readonly T[], firmId: (row: T) => string | null | undefined): number {
  return new Set(rows.map(firmId).filter((id): id is string => typeof id === "string" && id.length > 0)).size;
}

// ─── The stored benchmark cut (ruling 1: a surface says which cut it shows) ───

/**
 * The run's cutoff as a date label, "Sep 30, 2026". Null when the run predates
 * the stored cutoff (BenchmarkRun.cutoff is nullable).
 */
export function benchmarkCutoffLabel(cutoff: Date | null | undefined): string | null {
  if (!cutoff) return null;
  return cutoff.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * The ONE phrase for the cut a surface is SHOWING: the stored run's cutoff,
 * never a live quarter computation. Every benchmark surface renders this, so the
 * quarterly benchmark page and the Peer Position card cannot drift apart
 * (tests/enforce-core.contract.test.ts). The NEXT cutoff (a forward-looking
 * deadline) is a different sentence and comes from lib/benchmarkArtifact.
 */
export function storedCutoffPhrase(cutoffLabel: string | null, cutoffAt?: string | Date | null, now: Date = new Date()): string {
  if (!cutoffLabel) return "Not recorded on this run";
  // box-c (R65, item 4): a cut that has not closed yet is interim, and says so.
  if (cutoffAt) {
    const at = cutoffAt instanceof Date ? cutoffAt : new Date(cutoffAt);
    if (!Number.isNaN(at.getTime()) && at.getTime() > now.getTime()) return `Interim · closes ${cutoffLabel}`;
  }
  return `Assessments completed by ${cutoffLabel}`;
}

// ─── Divergence (ruling 21 default): one constant pair, matching /methodology ───

/** A vendor-vs-firm gap of at most this many points reads as aligned. */
export const DIVERGENCE_ALIGNED_WITHIN = 5;
/** A gap of this many points or more is flagged as a calibration gap. */
export const DIVERGENCE_FLAGGED_AT = 10;

export type DivergenceState = "aligned" | "watch" | "flagged";

/** The one reading of a signed gap in points (vendor minus firm); null when no shared signal. */
export function divergenceState(points: number | null | undefined): DivergenceState | null {
  if (points === null || points === undefined || !Number.isFinite(points)) return null;
  const magnitude = Math.abs(points);
  if (magnitude >= DIVERGENCE_FLAGGED_AT) return "flagged";
  if (magnitude <= DIVERGENCE_ALIGNED_WITHIN) return "aligned";
  return "watch";
}

// ─── Anchor pool (anchor-pool, R66; charter rulings 45, 49, 50) ──────────────

/** The six charter value drivers, in grid order. */
export const ANCHOR_DRIVERS = ["D1", "D2", "D3", "D4", "D5", "D6"] as const;
export type AnchorDriver = (typeof ANCHOR_DRIVERS)[number];
/** The reserve slot: not a driver cell; one code per tier at most, served only to fill an empty driver. */
export const ANCHOR_RESERVE = "R" as const;
export type AnchorSlot = AnchorDriver | typeof ANCHOR_RESERVE;
export const ANCHOR_TIERS = ["E", "M", "H"] as const;
export type AnchorTier = (typeof ANCHOR_TIERS)[number];

/** One cell of a bank's anchor pool. `driver` is null on the untagged six-code header form; `tier` is null until the item's own tier is known. */
export type AnchorPoolCell = { code: string; driver: AnchorSlot | null; tier: AnchorTier | null };

/** Six served per sitting, one per driver (ruling 50), at this tier mix (ruling 49). */
export const SERVED_ANCHOR_COUNT = 6;
export const SERVED_ANCHOR_TIER_MIX: Readonly<Record<AnchorTier, number>> = { E: 2, M: 3, H: 1 };

export type ServedAnchors = {
  /** The cells this sitting serves: driver order, then reserve, then any second code for a driver. */
  served: AnchorPoolCell[];
  /** False when the header was the untagged six-code form: the served set is the pool, exactly as before the pool existed. */
  tagged: boolean;
  /** Drivers no served code covers (every driver when untagged). */
  uncoveredDrivers: AnchorDriver[];
  tierCount: Record<AnchorTier, number>;
  /** Per tier, how many short of SERVED_ANCHOR_TIER_MIX the served set is; zero when the mix is met. */
  shortfall: Record<AnchorTier, number>;
};

/** The seed a sitting draws its anchors from: the firm and the sitting's ordinal for that bank, so a resume repeats and a retake may differ. */
export function sittingSeedFor(firmId: string, sittingNumber: number): string {
  return `${firmId}#${sittingNumber}`;
}

// FNV-1a, as lib/moduleOrderRotation and lib/modules/qbankServing hash; no Date, no Math.random.
function anchorHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function anchorTierCount(cells: readonly AnchorPoolCell[]): Record<AnchorTier, number> {
  const count: Record<AnchorTier, number> = { E: 0, M: 0, H: 0 };
  for (const cell of cells) if (cell.tier) count[cell.tier] += 1;
  return count;
}

function anchorMixDistance(count: Record<AnchorTier, number>): number {
  return ANCHOR_TIERS.reduce((sum, tier) => sum + Math.abs(count[tier] - SERVED_ANCHOR_TIER_MIX[tier]), 0);
}

function finishServedAnchors(served: AnchorPoolCell[], tagged: boolean): ServedAnchors {
  const tierCount = anchorTierCount(served);
  const shortfall: Record<AnchorTier, number> = { E: 0, M: 0, H: 0 };
  for (const tier of ANCHOR_TIERS) shortfall[tier] = Math.max(0, SERVED_ANCHOR_TIER_MIX[tier] - tierCount[tier]);
  const covered = new Set(served.map((cell) => cell.driver));
  const uncoveredDrivers = ANCHOR_DRIVERS.filter((driver) => !covered.has(driver));
  return { served, tagged, uncoveredDrivers, tierCount, shortfall };
}

/**
 * The anchors a sitting serves, drawn from the bank's pool by the charter rule
 * (R66, item 3): one code per driver, 2 Easy, 3 Moderate, 1 Hard, deterministic
 * from the sitting seed. A driver with one code in the pool serves it at any
 * tier. When the pool cannot meet the mix, the closest mix serves and the
 * shortfall is recorded. When a driver has no code, the reserve fills the slot,
 * then any unused pool code, up to six. The untagged six-code form serves its
 * six as it always did, in pool order, byte-identical.
 */
export function servedAnchorsFor(bank: { pool: readonly AnchorPoolCell[] }, sittingSeed: string): ServedAnchors {
  const pool = bank.pool;
  const tagged = pool.length > 0 && pool.every((cell) => cell.driver !== null);
  if (!tagged) return finishServedAnchors([...pool], false);

  // One candidate list per covered driver, in driver order. Every combination
  // (at most three per driver, so at most 729) is completed to six and scored
  // against the mix as a whole, so a reserve or a second code can rescue a tier.
  const lists = ANCHOR_DRIVERS.map((driver) => pool.filter((cell) => cell.driver === driver)).filter((list) => list.length > 0);
  let combos: AnchorPoolCell[][] = [[]];
  for (const list of lists) combos = combos.flatMap((prefix) => list.map((cell) => [...prefix, cell]));

  // Fill an empty driver slot: the reserve first, then any unused pool code;
  // the tier the set is shortest on wins, ties by the seed.
  const complete = (chosen: readonly AnchorPoolCell[]): AnchorPoolCell[] => {
    const served = [...chosen];
    const used = new Set(served.map((cell) => cell.code));
    for (const candidates of [pool.filter((cell) => cell.driver === ANCHOR_RESERVE), pool.filter((cell) => cell.driver !== ANCHOR_RESERVE)]) {
      while (served.length < SERVED_ANCHOR_COUNT) {
        const rest = candidates.filter((cell) => !used.has(cell.code));
        if (rest.length === 0) break;
        const count = anchorTierCount(served);
        const need = (cell: AnchorPoolCell) => (cell.tier ? SERVED_ANCHOR_TIER_MIX[cell.tier] - count[cell.tier] : Number.NEGATIVE_INFINITY);
        const top = Math.max(...rest.map(need));
        const tied = rest.filter((cell) => need(cell) === top);
        const pick = tied[anchorHash(`${sittingSeed}:${served.length}`) % tied.length]!;
        served.push(pick);
        used.add(pick.code);
      }
    }
    return served;
  };

  let best: AnchorPoolCell[][] = [];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const combo of combos) {
    const full = complete(combo);
    const distance = anchorMixDistance(anchorTierCount(full));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = [full];
    } else if (distance === bestDistance) {
      best.push(full);
    }
  }
  const served = best[anchorHash(sittingSeed) % best.length] ?? [];
  return finishServedAnchors(served, true);
}
