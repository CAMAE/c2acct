import { describe, expect, it } from "vitest";
import {
  METHODOLOGY_VERSION,
  METHODOLOGY_CHANGELOG,
  METHODOLOGY_SECTIONS,
} from "@/lib/methodology";

/**
 * Public methodology page (Governance Phase 2, A1). Locks the versioned,
 * changelogged content: the required metric families are covered and the copy
 * never implies weighting/significance beyond what the methodology states.
 */

describe("methodology content — versioned + changelogged", () => {
  it("has a version and a non-empty changelog whose newest entry matches the version", () => {
    expect(METHODOLOGY_VERSION).toMatch(/^\d+\.\d+$/);
    expect(METHODOLOGY_CHANGELOG.length).toBeGreaterThan(0);
    expect(METHODOLOGY_CHANGELOG[0].version).toBe(METHODOLOGY_VERSION);
  });

  it("covers every computed metric family the audit requires", () => {
    const keys = METHODOLOGY_SECTIONS.map((s) => s.key);
    for (const required of ["averaging", "divergence", "confidence", "suppression", "integrity", "rounding"]) {
      expect(keys).toContain(required);
    }
  });

  it("states suppression as removal (not just a label) and names the safe-harbor numbers", () => {
    const suppression = METHODOLOGY_SECTIONS.find((s) => s.key === "suppression");
    const text = suppression?.paragraphs.join(" ") ?? "";
    expect(text).toMatch(/insufficient/i);
    expect(text).toMatch(/five/i);
    expect(text).toMatch(/25%/);
  });

  it("keeps copy honest — disclaims advice/significance, presents figures as directional", () => {
    const allText = METHODOLOGY_SECTIONS.flatMap((s) => [...s.paragraphs, ...(s.bullets ?? [])]).join(" ");
    expect(allText).toMatch(/professional advice/i);
    expect(allText).toMatch(/directional/i);
    // Significance/p-value language only ever appears as a DISCLAIMER (negated),
    // never as a positive claim.
    expect(allText).toMatch(/no claimed statistical basis|never imply a p-value|no.{0,20}statistical/i);
    expect(allText).not.toMatch(/statistically significant (result|finding|difference)/i);
  });
});
