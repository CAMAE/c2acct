import { describe, expect, it } from "vitest";

import {
  FIRM_BRIEF_VARIANT_BANK,
  FIRM_BRIEF_VARIANT_IDS,
  renderFirmVariant,
  type FirmBriefVariantSlots,
} from "@/lib/firmBriefs/template-bank";
import {
  VENDOR_BRIEF_VARIANT_BANK,
  VENDOR_BRIEF_VARIANT_IDS,
  renderVendorVariant,
  type VendorBriefVariantSlots,
} from "@/lib/briefs/executive-summary-templates";

/**
 * Mock v2.1 §7 invariant: 2 variants per section in pilot, same claims and
 * numbers, only tone varies. These tests freeze that contract — if anyone
 * adds a third variant per section they must adjust both the count and
 * extract the numeric-parity assertion to cover the new render.
 */

const VENDOR_SECTION_KEYS = [
  "vendor.executive-summary",
  "vendor.self-vs-market-delta",
  "vendor.action-roadmap",
] as const;

const FIRM_SECTION_KEYS = [
  "firm.alignment-header",
  "firm.stack-fit-analysis",
  "firm.six-quarter-roadmap",
] as const;

describe("VENDOR_BRIEF_VARIANT_BANK", () => {
  it("declares 2 variants per eligible section", () => {
    for (const key of VENDOR_SECTION_KEYS) {
      expect(VENDOR_BRIEF_VARIANT_BANK[key]).toBeDefined();
      expect(VENDOR_BRIEF_VARIANT_BANK[key]).toHaveLength(2);
    }
  });

  it("VARIANT_IDS allowlist matches VARIANT_BANK ids exactly (single source of truth)", () => {
    for (const key of VENDOR_SECTION_KEYS) {
      const bankIds = VENDOR_BRIEF_VARIANT_BANK[key].map((v) => v.id);
      expect(bankIds).toEqual([...VENDOR_BRIEF_VARIANT_IDS[key]]);
    }
  });

  const SAMPLE_SLOTS: VendorBriefVariantSlots = {
    ecosystemName: "Ecosystem Alpha",
    firmCount: 10,
    avgFirmScore: 68,
    avgVendorSelfReport: 76,
    hotDivergences: 3,
    productCount: 7,
    roadmapItemCount: 9,
  };

  it("both variants reference the section's primary slot count (same claims discipline)", () => {
    // Per Mock v2.1 §7: variants share claims and numbers; only tone varies.
    // Assert each variant references the section's primary slot value, so
    // the consultant can't pick a variant that strips a key data point.
    const PRIMARY_BY_SECTION: Record<string, string> = {
      "vendor.executive-summary": "10", // firmCount
      "vendor.self-vs-market-delta": "7", // productCount
      "vendor.action-roadmap": "9", // roadmapItemCount
    };
    for (const key of VENDOR_SECTION_KEYS) {
      const [v0, v1] = VENDOR_BRIEF_VARIANT_BANK[key];
      const out0 = v0.render(SAMPLE_SLOTS);
      const out1 = v1.render(SAMPLE_SLOTS);
      const primary = PRIMARY_BY_SECTION[key];
      expect(out0).toContain(primary);
      expect(out1).toContain(primary);
    }
  });

  it("default render path (no chosen variant) returns variant index 0", () => {
    for (const key of VENDOR_SECTION_KEYS) {
      const defaultOut = renderVendorVariant(key, undefined, SAMPLE_SLOTS);
      const explicit0 = VENDOR_BRIEF_VARIANT_BANK[key][0].render(SAMPLE_SLOTS);
      expect(defaultOut).toBe(explicit0);
    }
  });

  it("unknown variant id falls back to variant index 0 (resilient against stale choice rows)", () => {
    for (const key of VENDOR_SECTION_KEYS) {
      const fallbackOut = renderVendorVariant(key, "v9-bogus", SAMPLE_SLOTS);
      const explicit0 = VENDOR_BRIEF_VARIANT_BANK[key][0].render(SAMPLE_SLOTS);
      expect(fallbackOut).toBe(explicit0);
    }
  });

  it("renderVendorVariant returns empty string on unknown section", () => {
    expect(renderVendorVariant("vendor.unknown-section", "v1-measured", SAMPLE_SLOTS)).toBe("");
  });
});

describe("FIRM_BRIEF_VARIANT_BANK", () => {
  it("declares 2 variants per eligible section", () => {
    for (const key of FIRM_SECTION_KEYS) {
      expect(FIRM_BRIEF_VARIANT_BANK[key]).toBeDefined();
      expect(FIRM_BRIEF_VARIANT_BANK[key]).toHaveLength(2);
    }
  });

  it("VARIANT_IDS allowlist matches VARIANT_BANK ids exactly", () => {
    for (const key of FIRM_SECTION_KEYS) {
      const bankIds = FIRM_BRIEF_VARIANT_BANK[key].map((v) => v.id);
      expect(bankIds).toEqual([...FIRM_BRIEF_VARIANT_IDS[key]]);
    }
  });

  const SAMPLE_SLOTS: FirmBriefVariantSlots = {
    firmCompanyName: "Northstar CPA",
    canonicalFirmScore: 72,
    ecosystemAverageScore: 68,
    peerFirmCount: 9,
    reviewedProductCount: 4,
    totalProductCount: 6,
    currentQuarterLabel: "Q2'26",
    trajectoryEnd: 80,
  };

  it("both variants reference the section's primary slot value (same claims discipline)", () => {
    const PRIMARY_BY_SECTION: Record<string, string> = {
      "firm.alignment-header": "72", // canonicalFirmScore
      "firm.stack-fit-analysis": "6", // totalProductCount
      "firm.six-quarter-roadmap": "Q2'26", // currentQuarterLabel
    };
    for (const key of FIRM_SECTION_KEYS) {
      const [v0, v1] = FIRM_BRIEF_VARIANT_BANK[key];
      const out0 = v0.render(SAMPLE_SLOTS);
      const out1 = v1.render(SAMPLE_SLOTS);
      const primary = PRIMARY_BY_SECTION[key];
      expect(out0).toContain(primary);
      expect(out1).toContain(primary);
    }
  });

  it("default render path (no chosen variant) returns variant index 0", () => {
    for (const key of FIRM_SECTION_KEYS) {
      const defaultOut = renderFirmVariant(key, undefined, SAMPLE_SLOTS);
      const explicit0 = FIRM_BRIEF_VARIANT_BANK[key][0].render(SAMPLE_SLOTS);
      expect(defaultOut).toBe(explicit0);
    }
  });

  it("unknown variant id falls back to variant index 0", () => {
    for (const key of FIRM_SECTION_KEYS) {
      const fallbackOut = renderFirmVariant(key, "v9-bogus", SAMPLE_SLOTS);
      const explicit0 = FIRM_BRIEF_VARIANT_BANK[key][0].render(SAMPLE_SLOTS);
      expect(fallbackOut).toBe(explicit0);
    }
  });

  it("renderFirmVariant returns empty string on unknown section", () => {
    expect(renderFirmVariant("firm.unknown-section", "v1-measured", SAMPLE_SLOTS)).toBe("");
  });
});
