import { describe, expect, it } from "vitest";
import { openEndedTemplateIndex } from "@/lib/demoPatEcosystemSeed";

/**
 * B8-7: demo open-ended quotes must not clump — no template is reused within a
 * firm/product's latest N (=template-count) responses. The rotation is a
 * full-cycle permutation (coprime step), so any run of `count` consecutive
 * indices contains all `count` templates exactly once.
 */
describe("qualitative de-clump — open-ended template rotation", () => {
  const COUNT = 25;

  it("uses every template exactly once within a run of `count` responses", () => {
    for (const productKey of ["policygrid", "brightline-suite", "acme", "z"]) {
      const seen = new Set<number>();
      for (let i = 0; i < COUNT; i += 1) {
        seen.add(openEndedTemplateIndex(productKey, i, COUNT));
      }
      expect(seen.size).toBe(COUNT); // no reuse within the window
    }
  });

  it("never repeats a template back-to-back", () => {
    for (const productKey of ["policygrid", "brightline-suite", "acme"]) {
      for (let i = 1; i < 60; i += 1) {
        expect(openEndedTemplateIndex(productKey, i, COUNT)).not.toBe(
          openEndedTemplateIndex(productKey, i - 1, COUNT)
        );
      }
    }
  });

  it("varies the opening template across products (not all firms identical)", () => {
    const firsts = ["policygrid", "brightline-suite", "acme", "meridian"].map((k) =>
      openEndedTemplateIndex(k, 0, COUNT)
    );
    expect(new Set(firsts).size).toBeGreaterThan(1);
  });

  it("is deterministic (stable re-seeds)", () => {
    expect(openEndedTemplateIndex("policygrid", 3, COUNT)).toBe(
      openEndedTemplateIndex("policygrid", 3, COUNT)
    );
  });
});
