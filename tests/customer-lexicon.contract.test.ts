import { describe, expect, it } from "vitest";
import { sweepVendorSurfaceCopy, vendorSurfaceCopyViolations } from "@/lib/customerLexicon";
import { LIBRARY, type QuestionContext } from "@/lib/perFirmQuestionLibrary";

/**
 * Block 17 Track B / B2 — the vendor customer-surface lexicon sweep. Guards that
 * the ported consultant question engine never leaks analyst shorthand onto the
 * vendor BattleCard: EVERY template, rendered and swept, must be clean. A new
 * template that reintroduces banned vocab fails here.
 */

const CTX: QuestionContext = {
  vendorName: "Meridian",
  firmName: "Kirkland Reyes",
  productName: "Meridian Portal",
  capabilityArea: "Workflow & Practice Ops",
  firmScore: 42,
  vendorScore: 78,
  delta: 36,
};

describe("sweepVendorSurfaceCopy", () => {
  it("rewrites internal shorthand to plain buyer-facing language", () => {
    expect(sweepVendorSurfaceCopy("the canary in the deal")).not.toMatch(/canary/i);
    expect(sweepVendorSurfaceCopy("what's the off-ramp")).toContain("exit path");
    expect(sweepVendorSurfaceCopy("replace, scope-reduce, or rebuild internal capability")).not.toMatch(
      /scope-reduce|rebuild internal capability/i
    );
    expect(sweepVendorSurfaceCopy("vs the vendor's self-read")).not.toMatch(/self-read/i);
    expect(sweepVendorSurfaceCopy("surface that to other prospects honestly")).not.toMatch(/other prospects/i);
  });

  it("vendorSurfaceCopyViolations flags banned tokens and clears once swept", () => {
    expect(vendorSurfaceCopyViolations("this is the canary")).not.toHaveLength(0);
    expect(vendorSurfaceCopyViolations(sweepVendorSurfaceCopy("this is the canary"))).toHaveLength(0);
  });
});

describe("every ported question template is clean after the sweep", () => {
  it("no library template leaves a banned token on the vendor surface", () => {
    const dirty: string[] = [];
    for (const template of LIBRARY) {
      const swept = sweepVendorSurfaceCopy(template.question(CTX));
      const violations = vendorSurfaceCopyViolations(swept);
      if (violations.length > 0) dirty.push(`${template.id}: ${violations.join(", ")}`);
    }
    expect(dirty, `templates still carrying internal vocab after sweep:\n${dirty.join("\n")}`).toEqual([]);
  });
});
