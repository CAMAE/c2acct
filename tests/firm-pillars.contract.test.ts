import { describe, expect, it } from "vitest";
import {
  FIRM_PILLARS,
  PILLAR_BY_MODULE_KEY,
  PILLAR_BY_MODULE_TITLE,
  pillarForModule,
} from "@/lib/firmPillars";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";

describe("firm pillars (15a)", () => {
  it("the pillar set is exactly 5, unique", () => {
    expect(FIRM_PILLARS).toHaveLength(5);
    expect(new Set(FIRM_PILLARS).size).toBe(5);
    expect([...FIRM_PILLARS].sort()).toEqual(
      ["Automation", "Governance", "Integration", "Operations", "Strategy"]
    );
  });

  it("maps 1:1 to the five firm module keys", () => {
    const defKeys = FIRM_MODULE_DEFINITIONS.map((m) => m.key).sort();
    expect(Object.keys(PILLAR_BY_MODULE_KEY).sort()).toEqual(defKeys);
    // each module maps to a valid pillar, and every pillar is used exactly once
    const pillars = FIRM_MODULE_DEFINITIONS.map((m) => PILLAR_BY_MODULE_KEY[m.key]);
    expect(new Set(pillars).size).toBe(5);
    for (const p of pillars) expect(FIRM_PILLARS).toContain(p);
  });

  it("FIRM_MODULE_DEFINITIONS.pillarName matches the canonical map (no drift)", () => {
    for (const m of FIRM_MODULE_DEFINITIONS) {
      expect(m.pillarName, `${m.key} pillarName`).toBe(PILLAR_BY_MODULE_KEY[m.key]);
      // title map is in sync with the definitions
      expect(PILLAR_BY_MODULE_TITLE[m.title], `title map for ${m.title}`).toBe(m.pillarName);
    }
    // the title map has no stale entries
    const defTitles = new Set<string>(FIRM_MODULE_DEFINITIONS.map((m) => m.title));
    for (const title of Object.keys(PILLAR_BY_MODULE_TITLE)) expect(defTitles.has(title)).toBe(true);
  });

  it("pillarForModule resolves by key AND by full title, passes unknowns through", () => {
    expect(pillarForModule("firm_alignment_automation_ai_v1")).toBe("Automation");
    expect(pillarForModule("Strategy, Change Readiness, and Market Alignment")).toBe("Strategy");
    expect(pillarForModule("Some product-fit dimension")).toBe("Some product-fit dimension");
    expect(pillarForModule(null)).toBe("");
  });
});
