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

  it("states the sections in the box's order (scoring-core, R63)", () => {
    expect(METHODOLOGY_SECTIONS.map((s) => s.key)).toEqual([
      "score", "index", "product-and-review", "benchmark", "confidence", "freshness", "divergence",
      "knowledge-banks", "reproducibility", "version",
    ]);
  });

  it("states suppression as removal (not just a label) and names the evidence floor numbers", () => {
    const benchmark = METHODOLOGY_SECTIONS.find((s) => s.key === "benchmark");
    const text = benchmark?.paragraphs.join(" ") ?? "";
    expect(text).toMatch(/insufficient/i);
    expect(text).toMatch(/five/i);
    expect(text).toMatch(/25 percent/);
    expect(text).toContain("structured consistent with the former 1996 DOJ/FTC safety zone, withdrawn in 2023");
  });

  it("states what the code does: the index floor, the display tiers, the confidence and freshness tables, the Stale step, reproducibility", () => {
    const text = (key: string) => {
      const s = METHODOLOGY_SECTIONS.find((section) => section.key === key);
      return [...(s?.paragraphs ?? []), ...(s?.bullets ?? []), ...(s?.table?.rows.flat() ?? [])].join(" ");
    };
    expect(text("index")).toContain("at least 3 final modules");
    expect(text("index")).toContain("Partial");
    expect(text("benchmark")).toContain("Under 5 contributing firms: nothing is published.");
    expect(text("benchmark")).toContain("5 to 9: the cohort median and your band.");
    expect(text("benchmark")).toContain("10 to 29: the quartiles and your band. Your exact rank opens at 10.");
    expect(text("benchmark")).toContain("30 and up: your percentile, with the quartiles and your rank.");
    expect(text("benchmark")).toContain("counted, never estimated");
    expect(text("confidence")).toContain("Grounded");
    expect(text("confidence")).toContain("6 and up");
    expect(text("confidence")).toContain("lowers the label one step");
    expect(text("freshness")).toContain("365 days and older");
    expect(text("freshness")).toContain("drops one step");
    expect(text("knowledge-banks")).toContain("90 items");
    expect(text("knowledge-banks")).toContain("30 of them");
    expect(text("reproducibility")).toContain("recomputed from the stored raw rows");
  });

  it("the new text carries no em dash and never says safe harbor", () => {
    const allText = METHODOLOGY_SECTIONS.flatMap((s) => [s.title, ...s.paragraphs, ...(s.bullets ?? []), ...(s.table?.rows.flat() ?? [])]).join(" ");
    expect(allText).not.toContain("\u2014");
    expect(allText).not.toMatch(/safe[- ]harbor/i);
    expect(METHODOLOGY_CHANGELOG[0].summary).not.toMatch(/safe[- ]harbor/i);
  });

  it("keeps copy honest — disclaims advice/significance; the word directional is gone (V3 box 4.2)", () => {
    const allText = METHODOLOGY_SECTIONS.flatMap((s) => [...s.paragraphs, ...(s.bullets ?? [])]).join(" ");
    expect(allText).toMatch(/professional advice/i);
    expect(allText).not.toMatch(/directional/i);
    // Significance/p-value language only ever appears as a DISCLAIMER (negated),
    // never as a positive claim.
    expect(allText).toMatch(/no claimed statistical basis|never imply a p-value|no.{0,20}statistical/i);
    expect(allText).not.toMatch(/statistically significant (result|finding|difference)/i);
  });
});
