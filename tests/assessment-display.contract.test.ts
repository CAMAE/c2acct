import { describe, expect, it } from "vitest";

import { displayPrompt, isFlatAssessmentLayout } from "@/lib/assessmentDisplay";

describe("assessment display rules (visual only — storage and payload untouched)", () => {
  it("flattens firm alignment modules only", () => {
    expect(isFlatAssessmentLayout("firm_alignment_operating_model_v1")).toBe(true);
    expect(isFlatAssessmentLayout("firm_alignment_strategy_v1")).toBe(true);
    expect(isFlatAssessmentLayout("user_alignment_v1")).toBe(false);
    expect(isFlatAssessmentLayout("vendor_product_alignment_v1")).toBe(false);
    expect(isFlatAssessmentLayout("firm_product_review_v1")).toBe(false);
  });

  it("strips exactly one leading module-title prefix from the displayed prompt", () => {
    const title = "Operating Model and Workflow Discipline";
    expect(displayPrompt(`${title}: How clearly is the current-state approach defined in this area?`, title)).toBe(
      "How clearly is the current-state approach defined in this area?"
    );
    expect(displayPrompt(`${title}: ${title}: twice`, title)).toBe(`${title}: twice`);
  });

  it("returns prompts without the prefix, or with another title, untouched", () => {
    const title = "Operating Model and Workflow Discipline";
    expect(displayPrompt("How clearly is this defined?", title)).toBe("How clearly is this defined?");
    expect(displayPrompt("Automation and AI Readiness: How ready?", title)).toBe("Automation and AI Readiness: How ready?");
    expect(displayPrompt(`${title}:no space`, title)).toBe(`${title}:no space`);
    expect(displayPrompt(`${title}: `, title)).toBe(`${title}: `);
    expect(displayPrompt("Anything", "   ")).toBe("Anything");
  });
});
