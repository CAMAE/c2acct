import { MIN_CONTRIBUTORS } from "@/lib/assessmentCore";
import { benchmarkCohortKey } from "@/lib/benchmarkCohortIsolation";
import type { VerticalPackSizeBand } from "./types";

/**
 * Size bands as a cohort DIMENSION (legal-load, R64, delta 4; unified build
 * prompt diff 3). Schema only in this box.
 *
 * A pack may declare `sizeBands` in its own size language (the legal pack counts
 * attorneys). Three things live here and nothing else:
 *
 *   1. the mapping from a size to a band — a count, or the signup wizard's size
 *      option ("2–4", "21+"), which is the only size a Company carries today
 *      (there is no size column; the answer sits in the provisioning audit row);
 *   2. the cohort key with a band segment, constructed, never parsed;
 *   3. the roll-up rule: a band publishes on its own only once it has
 *      MIN_CONTRIBUTORS firms; until then the reader publishes by vertical alone.
 *
 * The benchmark readers accept the band (lib/benchmarks.ts) but no compute pass
 * writes a band cohort yet and no Prisma column is added: the next box decides
 * where the firm's size is stored and when a band cut is computed.
 */

export type SizeBandKey = string;

/** The band whose [min, max] holds the count; null when the pack declares no bands or the count is below every band. */
export function sizeBandForCount(bands: readonly VerticalPackSizeBand[] | undefined, count: number): VerticalPackSizeBand | null {
  if (!bands || bands.length === 0 || !Number.isFinite(count)) return null;
  for (const band of bands) {
    if (count >= band.min && (band.max === null || count <= band.max)) return band;
  }
  return null;
}

/**
 * The signup wizard's size options are ranges in words ("Just me", "2–4", "11–20",
 * "21+"). The LOWER bound places the firm: a "21+" firm is at least midsize and the
 * band cannot be narrowed further from that answer alone.
 */
export function sizeCountFromSignupOption(option: string | null | undefined): number | null {
  if (!option) return null;
  const clean = option.trim().toLowerCase();
  if (clean === "just me") return 1;
  const match = /^(\d+)\s*(?:[–-]\s*\d+|\+)?$/.exec(clean.replace(/\s+/g, ""));
  if (!match) return null;
  const lower = Number(match[1]);
  return Number.isFinite(lower) ? lower : null;
}

export function sizeBandForSignupOption(
  bands: readonly VerticalPackSizeBand[] | undefined,
  option: string | null | undefined
): VerticalPackSizeBand | null {
  const count = sizeCountFromSignupOption(option);
  return count === null ? null : sizeBandForCount(bands, count);
}

/**
 * A cohort key with a band dimension. Without a band this is exactly
 * {@link benchmarkCohortKey}, so every existing key is unchanged; with one, the
 * band is appended as its own segment. Constructed only, never parsed apart.
 */
export function benchmarkCohortKeyWithBand(baseKey: string, verticalId: string, sizeBand: SizeBandKey | null | undefined): string {
  const key = benchmarkCohortKey(baseKey, verticalId);
  const band = sizeBand?.trim();
  return band ? `${key}:band:${band}` : key;
}

export type SizeBandRollUp = {
  /** The band the reader may publish under, or null to publish by vertical alone. */
  publishBand: SizeBandKey | null;
  /** Why: "band" when the band clears the floor, "vertical" otherwise. */
  level: "band" | "vertical";
  firmsInBand: number;
  floor: number;
};

/**
 * The roll-up rule: a band is a publishable cohort once it has MIN_CONTRIBUTORS
 * firms; below that the band folds into its vertical and the vertical's cut is
 * what the reader shows. The floor is the one constant the suppression rule uses.
 */
export function rollUpSizeBand(input: { sizeBand: SizeBandKey | null | undefined; firmsInBand: number }): SizeBandRollUp {
  const band = input.sizeBand?.trim() || null;
  const firmsInBand = Math.max(0, Math.floor(input.firmsInBand));
  if (band && firmsInBand >= MIN_CONTRIBUTORS) {
    return { publishBand: band, level: "band", firmsInBand, floor: MIN_CONTRIBUTORS };
  }
  return { publishBand: null, level: "vertical", firmsInBand, floor: MIN_CONTRIBUTORS };
}
