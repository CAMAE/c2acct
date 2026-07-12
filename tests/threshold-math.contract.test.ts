import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describeCapabilityBar } from "@/lib/firmInsightEngine";
import { FIRM_TIER1_INSIGHT_CAPABILITY_RULES } from "@/lib/firmCapabilities";

/**
 * Block 10d (threshold math): capability evidence bars are per-capability (60%
 * or 65%). Copy and charts must name the REAL bar per row — never a hardcoded
 * single "60%" while the count is measured against a mix of 60/65 bars. And the
 * "N of M cleared" count must come from those same per-row thresholds.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("describeCapabilityBar names the real bar(s)", () => {
  it("uniform bar → the single %", () => {
    expect(describeCapabilityBar([{ threshold: 60 }, { threshold: 60 }])).toBe("the 60% bar");
    expect(describeCapabilityBar([{ threshold: 65 }])).toBe("the 65% bar");
  });

  it("mixed bars → a labelled range, never a single number", () => {
    const phrase = describeCapabilityBar([{ threshold: 65 }, { threshold: 65 }, { threshold: 60 }]);
    expect(phrase).toBe("their 60–65% bars");
    expect(phrase).not.toBe("the 60% bar");
  });

  it("data-and-controls really is a mixed 60/65 set (so the copy can't be a flat 60%)", () => {
    const rules = FIRM_TIER1_INSIGHT_CAPABILITY_RULES.firm_tier1_data_and_controls;
    const distinct = [...new Set(rules.map((r) => r.minScore))].sort((a, b) => a - b);
    expect(distinct.length).toBeGreaterThan(1); // 60 and 65 both present
    expect(describeCapabilityBar(rules.map((r) => ({ threshold: r.minScore })))).toBe("their 60–65% bars");
  });
});

describe("no hardcoded single threshold line survives in the gap-plan surfaces", () => {
  it("FirmGapPlanCard draws the bar only when uniform (no threshold={60})", () => {
    const src = read("app/components/insights/elite/FirmGapPlanCard.tsx");
    expect(src).not.toContain("threshold={60}");
    expect(src).not.toContain('thresholdLabel="60% bar"');
    expect(src).toContain("barLineFor"); // per-set bar-line helper
    expect(src).not.toContain("top-quartile bar"); // vague third label removed
  });

  it("firm insight detail charts the real per-capability bar (no hardcoded 60% unlock line)", () => {
    const src = read("app/firm/insights/[key]/page.tsx");
    expect(src).not.toContain("threshold={60}");
    expect(src).not.toContain('thresholdLabel="60% unlock threshold"');
    expect(src).toContain("capBarLine");
    // each capability row is labelled with its own bar
    expect(src).toContain("% bar`");
  });

  it("firm insight copy no longer hardcodes 'the 60% threshold'", () => {
    const src = read("lib/firmInsightEngine.ts");
    expect(src).not.toContain("at or above the 60% threshold");
    expect(src).not.toContain("clear the 60% threshold");
    expect(src).toContain("describeCapabilityBar");
  });
});
