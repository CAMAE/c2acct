import { ModuleDifficulty } from "@prisma/client";

import {
  ANCHOR_DRIVERS,
  ANCHOR_RESERVE,
  ANCHOR_TIERS,
  servedAnchorsFor,
  type AnchorPoolCell,
  type AnchorSlot,
  type AnchorTier,
  type ServedAnchors,
} from "@/lib/assessmentCore";

/**
 * anchor-pool (R66): the stored pool and the 7 by 3 grid read from it. Pure:
 * no Prisma, no Date. The one rule for which six serve is servedAnchorsFor in
 * lib/assessmentCore.ts; this module only reads the stored shape and lays the
 * grid out for the coverage worklist (item 5) and the admin page (item 6).
 */

export const ANCHOR_SLOTS: readonly AnchorSlot[] = [...ANCHOR_DRIVERS, ANCHOR_RESERVE];

const TIER_OF: Record<ModuleDifficulty, AnchorTier> = {
  [ModuleDifficulty.EASY]: "E",
  [ModuleDifficulty.MODERATE]: "M",
  [ModuleDifficulty.HARD]: "H",
};

const SLOT_RE = /^(?:D[1-6]|R)$/;
const TIER_RE = /^[EMH]$/;

/** ModuleTemplate.anchorPool as cells, or null when NULL, empty or not the stored shape. */
export function readStoredAnchorPool(value: unknown): AnchorPoolCell[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const cells: AnchorPoolCell[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const { code, driver, tier } = entry as Record<string, unknown>;
    if (typeof code !== "string" || typeof driver !== "string" || typeof tier !== "string") return null;
    if (!SLOT_RE.test(driver) || !TIER_RE.test(tier)) return null;
    cells.push({ code, driver: driver as AnchorSlot, tier: tier as AnchorTier });
  }
  return cells;
}

/** The bank code an item key carries after its template key: "qbank-gov-v1-a9" → "A9". */
export function codeOfItemKey(itemKey: string, templateKey: string): string {
  return itemKey.startsWith(`${templateKey}-`) ? itemKey.slice(templateKey.length + 1).toUpperCase() : itemKey.toUpperCase();
}

/** The untagged six as pool cells: no driver, tier from the item's own difficulty. */
export function untaggedPoolFrom(anchors: ReadonlyArray<{ code: string; difficulty: ModuleDifficulty }>): AnchorPoolCell[] {
  return anchors.map((item) => ({ code: item.code, driver: null, tier: TIER_OF[item.difficulty] }));
}

export type AnchorPoolGridRow = { slot: AnchorSlot; cells: Record<AnchorTier, string | null> };

export type AnchorPoolGrid = {
  tagged: boolean;
  rows: AnchorPoolGridRow[];
  /** Driver cells with no code, "D5:H"; the reserve is not counted. */
  emptyCells: string[];
  filledCells: number;
  /** What the rule serves from this pool for a fixed seed: the tier count and the shortfall against the charter. */
  served: ServedAnchors;
};

/** The 7 by 3 grid (six drivers and the reserve, by tier). An untagged pool has no cells to place; its six show on the served line only. */
export function anchorPoolGrid(pool: readonly AnchorPoolCell[], seed = "coverage"): AnchorPoolGrid {
  const tagged = pool.length > 0 && pool.every((cell) => cell.driver !== null);
  const rows: AnchorPoolGridRow[] = ANCHOR_SLOTS.map((slot) => {
    const cells: Record<AnchorTier, string | null> = { E: null, M: null, H: null };
    if (tagged) {
      for (const cell of pool) if (cell.driver === slot && cell.tier) cells[cell.tier] = cell.code;
    }
    return { slot, cells };
  });
  const emptyCells: string[] = [];
  let filledCells = 0;
  for (const row of rows) {
    if (row.slot === ANCHOR_RESERVE) continue;
    for (const tier of ANCHOR_TIERS) {
      if (row.cells[tier]) filledCells += 1;
      else emptyCells.push(`${row.slot}:${tier}`);
    }
  }
  return { tagged, rows, emptyCells, filledCells, served: servedAnchorsFor({ pool }, seed) };
}
