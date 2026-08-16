import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getBenchmarkArtifactMeta, quarterKeyFor, quarterLabelFor } from "@/lib/benchmarkArtifact";

/**
 * 16g — the quarterly benchmark artifact. Pins the quarter/cutoff mechanics
 * (the published deadline) and the tier-wall structure inside the surface:
 * members see bands/percentiles, the Elite rank layer is gated.
 */

const ROOT = path.resolve(__dirname, "..");

describe("quarter + cutoff mechanics", () => {
  it("derives the calendar-quarter key and label", () => {
    expect(quarterKeyFor(new Date("2026-07-17T00:00:00Z"))).toBe("2026-Q3");
    expect(quarterLabelFor(new Date("2026-07-17T00:00:00Z"))).toBe("Q3 2026");
    expect(quarterKeyFor(new Date("2026-01-01T00:00:00Z"))).toBe("2026-Q1");
    expect(quarterKeyFor(new Date("2026-12-31T00:00:00Z"))).toBe("2026-Q4");
  });

  it("publishes a cutoff = quarter end with an inclusion sentence and days-remaining", () => {
    const meta = getBenchmarkArtifactMeta(new Date("2026-07-17T00:00:00Z"));
    expect(meta.quarterLabel).toBe("Q3 2026");
    expect(meta.cutoffIso).toBe("2026-09-30T23:59:59.999Z");
    expect(meta.cutoffLabel).toBe("Sep 30, 2026");
    expect(meta.cutoffSentence).toMatch(/completed by Sep 30, 2026 count for the Q3 2026 benchmark/);
    expect(meta.daysToCutoff).toBeGreaterThan(0);
  });

  it("days-to-cutoff floors at 0 once the cutoff has passed", () => {
    // Oct 1 is in Q4, so its cutoff is Dec 31 — still positive. Use quarter end.
    const meta = getBenchmarkArtifactMeta(new Date("2026-09-30T23:59:59.999Z"));
    expect(meta.daysToCutoff).toBe(0);
  });
});

describe("tier wall inside the artifact", () => {
  it("the page gates the Elite rank layer and members-only entry", () => {
    const src = readFileSync(path.join(ROOT, "app/(app)/firm/benchmark/page.tsx"), "utf8");
    // Members-only: Pro entitlement gate with the shared surface gate on deny.
    expect(src).toMatch(/resolveMembershipEntitlement\(sessionUser, "firm", MEMBERSHIP_PLAN\.PRO\)/);
    expect(src).toContain("MembershipSurfaceGate");
    // Elite layer walled inside: entitled → rank; else LockedElitePreview.
    expect(src).toMatch(/eliteEntitlement\.allowed/);
    expect(src).toContain("LockedElitePreview");
    // Pro sees the bands (percentile distribution).
    expect(src).toContain("PercentileBand");
    // Cutoff published on methodology.
    expect(src).toContain("/methodology#quarterly-cutoff");
  });
});
