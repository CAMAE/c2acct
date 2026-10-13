import { describe, expect, it } from "vitest";
import { ModuleDifficulty } from "@prisma/client";
import {
  ANCHOR_DRIVERS,
  SERVED_ANCHOR_COUNT,
  SERVED_ANCHOR_TIER_MIX,
  servedAnchorsFor,
  sittingSeedFor,
  type AnchorPoolCell,
} from "@/lib/assessmentCore";
import { parseQbank, poolWithItemTiers, readDeclaredAnchorCodes } from "@/lib/modules/qbankParser";

/**
 * anchor-pool (R66, items 2 and 3): the bank header is a pool of tagged cells or
 * the untagged six; the served six come from one rule in lib/assessmentCore.ts.
 */

const UNTAGGED = "### Bank stats: 90 items · anchor-item candidates: A9, B8, C8, C19, D6, D17 (high-discrimination scenarios)";
const LEGAL_OM = "### Bank stats: 90 items · anchor-item candidates: A2:D1:E, A3:D2:M, C16:D3:M, A25:D4:M, B19:D5:E, A16:D6:M, B3:R:M (charter cells)";

function cell(code: string, driver: AnchorPoolCell["driver"], tier: AnchorPoolCell["tier"]): AnchorPoolCell {
  return { code, driver, tier };
}

/** A full 18-cell pool plus a reserve: every driver at every tier. */
function fullPool(): AnchorPoolCell[] {
  const pool: AnchorPoolCell[] = [];
  let n = 1;
  for (const driver of ANCHOR_DRIVERS) {
    for (const tier of ["E", "M", "H"] as const) {
      pool.push(cell(`A${n}`, driver, tier));
      n += 1;
    }
  }
  pool.push(cell("B1", "R", "M"));
  return pool;
}

describe("anchor pool header (item 2)", () => {
  it("reads the untagged six-code form as the served set with no driver, and warns", () => {
    const declared = readDeclaredAnchorCodes(UNTAGGED);
    expect([...declared.codes]).toEqual(["A9", "B8", "C8", "C19", "D6", "D17"]);
    expect(declared.tagged).toBe(false);
    expect(declared.pool.every((c) => c.driver === null && c.tier === null)).toBe(true);
    expect(declared.errors).toEqual([]);
    expect(declared.warnings).toHaveLength(1);
  });

  it("reads the tagged form into cells, the reserve included, and ignores the trailing note", () => {
    const declared = readDeclaredAnchorCodes(LEGAL_OM);
    expect(declared.tagged).toBe(true);
    expect(declared.errors).toEqual([]);
    expect(declared.warnings).toEqual([]);
    expect(declared.pool).toEqual([
      cell("A2", "D1", "E"), cell("A3", "D2", "M"), cell("C16", "D3", "M"), cell("A25", "D4", "M"),
      cell("B19", "D5", "E"), cell("A16", "D6", "M"), cell("B3", "R", "M"),
    ]);
  });

  it("refuses a code in two cells, two codes in one cell, a mixed line and an unknown tag", () => {
    expect(readDeclaredAnchorCodes("anchor-item candidates: A2:D1:E, A2:D2:M").errors.join(" ")).toMatch(/A2 appears more than once/);
    expect(readDeclaredAnchorCodes("anchor-item candidates: A2:D1:E, A3:D1:E").errors.join(" ")).toMatch(/cell D1:E holds more than one code/);
    expect(readDeclaredAnchorCodes("anchor-item candidates: A2:D1:E, A3").errors.join(" ")).toMatch(/mixes tagged cells and bare codes/);
    expect(readDeclaredAnchorCodes("anchor-item candidates: A2:D7:E").errors.join(" ")).toMatch(/not a code/);
    expect(readDeclaredAnchorCodes("anchor-item candidates: A2:D1:X").errors.join(" ")).toMatch(/not a code/);
  });

  it("fills an untagged cell's tier from the item's own difficulty", () => {
    const pool = poolWithItemTiers(readDeclaredAnchorCodes(UNTAGGED).pool, [
      { code: "A9", difficulty: ModuleDifficulty.MODERATE },
      { code: "C19", difficulty: ModuleDifficulty.HARD },
    ]);
    expect(pool.find((c) => c.code === "A9")?.tier).toBe("M");
    expect(pool.find((c) => c.code === "C19")?.tier).toBe("H");
    expect(pool.find((c) => c.code === "B8")?.tier).toBeNull();
  });

  it("parseQbank carries the cell on a tagged anchor and null otherwise", () => {
    const bank = `
## SECTION A — Control Environment (2: 1E/1M/0H)

**A1 (E)** Stem one: a) x b) y c) z d) w — **b.** Because. *[NIST CSF 2.0]*

**A2 (M)** Stem two: a) x b) y c) z d) w — **a.** Because. *[NIST CSF 2.0]*

### Bank stats: 2 items · anchor-item candidates: A1:D1:E (cells)
`;
    const items = parseQbank(bank, "qbank-test", []);
    expect(items.map((i) => [i.code, i.isAnchor, i.anchorCell])).toEqual([
      ["A1", true, { driver: "D1", tier: "E" }],
      ["A2", false, null],
    ]);
  });
});

describe("served six by the charter rule (item 3)", () => {
  it("the untagged six serve as they are, in pool order, every driver uncovered (byte-identity)", () => {
    const pool = poolWithItemTiers(readDeclaredAnchorCodes(UNTAGGED).pool, [
      { code: "A9", difficulty: ModuleDifficulty.MODERATE }, { code: "B8", difficulty: ModuleDifficulty.MODERATE },
      { code: "C8", difficulty: ModuleDifficulty.MODERATE }, { code: "C19", difficulty: ModuleDifficulty.HARD },
      { code: "D6", difficulty: ModuleDifficulty.MODERATE }, { code: "D17", difficulty: ModuleDifficulty.HARD },
    ]);
    for (const seed of ["firm-a#1", "firm-a#2", "firm-b#1"]) {
      const result = servedAnchorsFor({ pool }, seed);
      expect(result.tagged).toBe(false);
      expect(result.served.map((c) => c.code)).toEqual(["A9", "B8", "C8", "C19", "D6", "D17"]);
      expect(result.uncoveredDrivers).toEqual([...ANCHOR_DRIVERS]);
      expect(result.tierCount).toEqual({ E: 0, M: 4, H: 2 });
      expect(result.shortfall).toEqual({ E: 2, M: 0, H: 0 });
    }
  });

  it("a full pool serves six, one per driver, at 2 Easy 3 Moderate 1 Hard, deterministic per seed, varying across seeds", () => {
    const pool = fullPool();
    const first = servedAnchorsFor({ pool }, sittingSeedFor("firm-a", 1));
    expect(first.served).toHaveLength(SERVED_ANCHOR_COUNT);
    expect(first.served.map((c) => c.driver)).toEqual([...ANCHOR_DRIVERS]);
    expect(first.tierCount).toEqual(SERVED_ANCHOR_TIER_MIX);
    expect(first.shortfall).toEqual({ E: 0, M: 0, H: 0 });
    expect(first.uncoveredDrivers).toEqual([]);
    expect(servedAnchorsFor({ pool }, sittingSeedFor("firm-a", 1)).served).toEqual(first.served);
    const seen = new Set<string>();
    for (let n = 1; n <= 12; n += 1) seen.add(servedAnchorsFor({ pool }, sittingSeedFor("firm-a", n)).served.map((c) => c.code).join(","));
    expect(seen.size).toBeGreaterThan(1);
    // The reserve never serves while every driver has a code.
    expect(first.served.some((c) => c.code === "B1")).toBe(false);
  });

  it("a driver with one code serves it at any tier; the closest mix serves and the shortfall is recorded", () => {
    const pool = readDeclaredAnchorCodes(LEGAL_OM).pool; // 2E 4M 0H across the drivers, reserve M
    const result = servedAnchorsFor({ pool }, "firm-a#1");
    expect(result.served.map((c) => c.code)).toEqual(["A2", "A3", "C16", "A25", "B19", "A16"]);
    expect(result.tierCount).toEqual({ E: 2, M: 4, H: 0 });
    expect(result.shortfall).toEqual({ E: 0, M: 0, H: 1 });
    expect(result.uncoveredDrivers).toEqual([]);
  });

  it("an empty driver is filled from the reserve, then from an unused pool code, up to six", () => {
    const pool = [cell("A1", "D1", "E"), cell("A2", "D1", "M"), cell("A3", "D2", "M"), cell("A4", "D3", "M"), cell("A5", "D4", "E"), cell("A6", "D5", "H"), cell("R1", "R", "M")];
    const result = servedAnchorsFor({ pool }, "firm-a#1");
    expect(result.served).toHaveLength(6);
    expect(result.uncoveredDrivers).toEqual(["D6"]);
    expect(result.served.map((c) => c.code).slice(0, 5)).toEqual(["A1", "A3", "A4", "A5", "A6"]);
    expect(result.served[5]!.code).toBe("R1");
    const noReserve = servedAnchorsFor({ pool: pool.filter((c) => c.driver !== "R") }, "firm-a#1");
    expect(noReserve.served.map((c) => c.code).sort()).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);
    expect(noReserve.tierCount).toEqual({ E: 2, M: 3, H: 1 });
    const thin = servedAnchorsFor({ pool: pool.slice(2, 6) }, "firm-a#1");
    expect(thin.served).toHaveLength(4);
    expect(thin.uncoveredDrivers).toEqual(["D1", "D6"]);
  });
});
