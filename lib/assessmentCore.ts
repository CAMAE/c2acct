/**
 * enforce-core (R62): the shared assessment helpers the methodology page relies on.
 * Created with only what this box needs; scoring-core fills it later.
 *
 *  - latestFinalPerFirm: one firm, one vote. Every product average (and every
 *    firm module aggregate) counts the LATEST final per (firm, group); earlier
 *    finals stay stored and readable as history, they just do not vote.
 *  - divergence constants: one pair, imported by every engine that labels a
 *    vendor-vs-firm gap, matching the methodology page.
 */

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
