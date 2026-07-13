import type { ProductFitDimensionScore } from "@/lib/productFitDimensions";

/**
 * Pure mean of the resulting stack scores (0–100), rounded, or null when every
 * slot is unscored. Lives here (client-safe, no server deps) so both the server
 * board builder and the client sandbox recompute the SAME way from the full
 * resulting stack — never additive per-swap deltas.
 */
export function recomputeProjectedAlignment(scores: Array<number | null>): number | null {
  const known = scores.filter((score): score is number => score !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, score) => sum + score, 0) / known.length);
}

/**
 * Sandbox candidate lanes (utility-aware swap). When a firm lifts a stack piece,
 * candidates split into two lanes:
 *   - "Fits this slot": shares ≥1 utilityKey with the lifted piece — these do the
 *     same jobs. Ranked by SLOT-FIT DELTA over the dimensions both products carry
 *     signal on (the dimensions the shared utilities drive), so the top of the
 *     lane is the biggest lift on the shared capability, not the whole firm.
 *   - "Whole firm": every candidate (never hidden), in the board's default order.
 * No utility overlap → only the whole-firm lane renders. These are pure so the
 * contract test can pin the ruling.
 */

type UtilityBearing = { utilityKeys: string[] };
type DimensionBearing = { dimensionScores: ProductFitDimensionScore[] };

/** Do two products share at least one utilityKey (i.e. fill the same slot)? */
export function sharesUtility(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  return b.some((key) => set.has(key));
}

/**
 * Slot-fit delta: how much more a candidate fits the firm on the SHARED-utility
 * dimensions than the lifted piece does — mean(candidate) − mean(piece) over the
 * dimensions where BOTH carry signal. null when there is no shared-signal
 * dimension (can't compare on the slot honestly).
 */
export function slotFitDelta(
  lifted: DimensionBearing,
  candidate: DimensionBearing
): number | null {
  const pieceByKey = new Map(lifted.dimensionScores.map((d) => [d.key, d.score]));
  const shared: Array<{ piece: number; cand: number }> = [];
  for (const d of candidate.dimensionScores) {
    const pieceScore = pieceByKey.get(d.key);
    if (typeof pieceScore === "number" && typeof d.score === "number") {
      shared.push({ piece: pieceScore, cand: d.score });
    }
  }
  if (shared.length === 0) return null;
  const meanPiece = shared.reduce((s, x) => s + x.piece, 0) / shared.length;
  const meanCand = shared.reduce((s, x) => s + x.cand, 0) / shared.length;
  return Math.round(meanCand - meanPiece);
}

export type LanedCandidate<C> = C & { slotFitDelta: number | null };

/**
 * Split candidates into the two lanes for a lifted piece. The whole-firm lane is
 * every candidate in the caller's given order (never hidden); the fits-slot lane
 * is the utility-overlapping subset ranked by slot-fit delta (desc, nulls last).
 */
export function splitCandidatesForSlot<C extends UtilityBearing & DimensionBearing>(
  lifted: UtilityBearing & DimensionBearing,
  candidates: readonly C[]
): { fitsSlot: Array<LanedCandidate<C>>; wholeFirm: readonly C[] } {
  const fitsSlot = candidates
    .filter((c) => sharesUtility(lifted.utilityKeys, c.utilityKeys))
    .map((c) => ({ ...c, slotFitDelta: slotFitDelta(lifted, c) }))
    .sort((a, b) => (b.slotFitDelta ?? -Infinity) - (a.slotFitDelta ?? -Infinity));
  return { fitsSlot, wholeFirm: candidates };
}
