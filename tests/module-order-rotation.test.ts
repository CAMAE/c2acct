import { afterEach, describe, expect, it } from "vitest";
import {
  isModuleOrderRotationEnabled,
  moduleRotationOffset,
  orderModulesForUser,
  rotateByOffset,
} from "@/lib/moduleOrderRotation";

const MODULES = ["operating", "automation", "data", "governance", "strategy"] as const;
const FLAG = "PAT_ENABLE_MODULE_ORDER_ROTATION";

afterEach(() => {
  delete process.env[FLAG];
});

describe("rotateByOffset", () => {
  it("cyclically rotates by the normalized offset", () => {
    expect(rotateByOffset(MODULES, 0)).toEqual([...MODULES]);
    expect(rotateByOffset(MODULES, 2)).toEqual(["data", "governance", "strategy", "operating", "automation"]);
    expect(rotateByOffset(MODULES, MODULES.length)).toEqual([...MODULES]); // full turn = identity
    expect(rotateByOffset(MODULES, -1)).toEqual(["strategy", "operating", "automation", "data", "governance"]);
    expect(rotateByOffset([], 3)).toEqual([]);
  });

  it("forms a Latin square across the n rotation classes (no positional bias)", () => {
    const n = MODULES.length;
    const rows = Array.from({ length: n }, (_, k) => rotateByOffset(MODULES, k));
    // Every column must contain each module exactly once.
    for (let col = 0; col < n; col += 1) {
      const column = new Set(rows.map((row) => row[col]));
      expect(column.size).toBe(n);
    }
  });
});

describe("moduleRotationOffset", () => {
  it("is deterministic and in range", () => {
    for (const userId of ["user-a", "user-b", "abc123", ""]) {
      const first = moduleRotationOffset(userId, MODULES.length);
      expect(first).toBe(moduleRotationOffset(userId, MODULES.length));
      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThan(MODULES.length);
    }
    expect(moduleRotationOffset("x", 0)).toBe(0);
  });
});

describe("orderModulesForUser", () => {
  it("returns the canonical order when the flag is off", () => {
    expect(isModuleOrderRotationEnabled()).toBe(false);
    expect(orderModulesForUser(MODULES, "user-a")).toEqual([...MODULES]);
  });

  it("rotates deterministically per user when the flag is on, and is stable", () => {
    process.env[FLAG] = "1";
    expect(isModuleOrderRotationEnabled()).toBe(true);
    const once = orderModulesForUser(MODULES, "user-a");
    const twice = orderModulesForUser(MODULES, "user-a");
    expect(once).toEqual(twice); // resume-safe / stable across calls
    expect(once).toEqual(rotateByOffset(MODULES, moduleRotationOffset("user-a", MODULES.length)));
    // Same modules, just reordered — nothing added or dropped.
    expect([...once].sort()).toEqual([...MODULES].sort());
  });

  it("falls back to canonical order when there is no user id even with the flag on", () => {
    process.env[FLAG] = "1";
    expect(orderModulesForUser(MODULES, null)).toEqual([...MODULES]);
    expect(orderModulesForUser(MODULES, undefined)).toEqual([...MODULES]);
  });
});
