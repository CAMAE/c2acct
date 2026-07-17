import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FRESHNESS_WINDOWS,
  FRESHNESS_STATE_LABEL,
  freshnessStateForAgeDays,
  newestDate,
  readFreshness,
} from "@/lib/freshness";

/**
 * 16a — the freshness reader is the ONE source of the age→state mapping. This
 * pins the published windows, the state boundaries, and — the anti-A3 clause —
 * that every freshness surface reads from @/lib/freshness rather than
 * re-deriving thresholds locally. Same reader everywhere.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";

describe("freshness windows (16a, published on /methodology)", () => {
  it("the windows are exactly Fresh <90d, Aging 90–365d, Stale >365d", () => {
    expect(FRESHNESS_WINDOWS.agingAfterDays).toBe(90);
    expect(FRESHNESS_WINDOWS.staleAfterDays).toBe(365);
  });

  it("state boundaries are inclusive at the lower edge", () => {
    expect(freshnessStateForAgeDays(0)).toBe("fresh");
    expect(freshnessStateForAgeDays(89)).toBe("fresh");
    expect(freshnessStateForAgeDays(90)).toBe("aging");
    expect(freshnessStateForAgeDays(364)).toBe("aging");
    expect(freshnessStateForAgeDays(365)).toBe("stale");
    expect(freshnessStateForAgeDays(5000)).toBe("stale");
  });

  it("the three states carry the canonical labels", () => {
    expect(FRESHNESS_STATE_LABEL).toEqual({ fresh: "Fresh", aging: "Aging", stale: "Stale" });
  });
});

describe("readFreshness", () => {
  const now = new Date("2026-07-16T12:00:00.000Z");

  it("computes age + state from a date, injectable now", () => {
    const r = readFreshness(new Date("2026-07-16T00:00:00.000Z"), now);
    expect(r?.state).toBe("fresh");
    expect(r?.ageDays).toBe(0);
    expect(r?.ageLabel).toBe("today");
  });

  it("crosses into aging at 90 days and stale past a year", () => {
    const aging = readFreshness(new Date("2026-04-01T12:00:00.000Z"), now);
    expect(aging?.state).toBe("aging");
    const stale = readFreshness(new Date("2025-06-01T12:00:00.000Z"), now);
    expect(stale?.state).toBe("stale");
  });

  it("never infers decay from missing evidence — null in, null out", () => {
    expect(readFreshness(null, now)).toBeNull();
    expect(readFreshness(undefined, now)).toBeNull();
    expect(readFreshness("not-a-date", now)).toBeNull();
  });

  it("newestDate picks the most recent, ignoring nulls", () => {
    const d = newestDate([null, "2026-01-01", new Date("2026-05-05"), undefined]);
    expect(d?.toISOString().slice(0, 10)).toBe("2026-05-05");
    expect(newestDate([null, undefined])).toBeNull();
  });
});

describe("same reader everywhere — no A3-class freshness splits", () => {
  // Every surface that renders evidence freshness must read from @/lib/freshness
  // (readFreshness / freshnessStateForAgeDays / FreshnessChip) rather than
  // hardcoding its own day thresholds. Add a file here when it grows a freshness
  // surface; the assertion is that it imports the canonical module.
  const freshnessSurfaces = [
    "app/components/insights/elite/FreshnessNote.tsx",
    "app/consultants/ecosystems/[ecosystemId]/_components/FirmGrid.tsx",
    "app/components/freshness/FreshnessChip.tsx",
    "lib/eliteInsightsV2.ts",
    "lib/battleCard.ts",
    "lib/consultantFreshness.ts",
  ];

  it("each freshness surface imports the canonical reader", () => {
    for (const relativePath of freshnessSurfaces) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8");
      expect(text, `${relativePath} should import from @/lib/freshness`).toMatch(
        /from "@\/lib\/freshness"/
      );
    }
  });
});
