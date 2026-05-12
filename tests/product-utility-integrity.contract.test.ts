import { describe, expect, it } from "vitest";
import {
  PRODUCT_GENERAL_MODULE,
  PRODUCT_GENERAL_QUESTION_COUNT,
  PRODUCT_OPEN_ENDED_MODULE,
  PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  PRODUCT_UTILITY_REGISTRY,
  PRODUCT_UTILITY_REGISTRY_METADATA,
  PRODUCT_UTILITY_REGISTRY_VERSION,
  PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
} from "@/lib/productUtilityRegistry";
import { getProductAssessmentPlan } from "@/lib/productAssessmentRuntime";

describe("product utility integrity contracts", () => {
  it("keeps the live registry version stable for the current reconciliation pass", () => {
    expect(PRODUCT_UTILITY_REGISTRY_VERSION).toBe("2026-03-product-utility-v2");
    expect(PRODUCT_UTILITY_REGISTRY_METADATA.version).toBe(PRODUCT_UTILITY_REGISTRY_VERSION);
    expect(PRODUCT_UTILITY_REGISTRY_METADATA.notes).toContain(
      "Utilities are scope declarations, not product rankings or market-truth claims."
    );
    expect(PRODUCT_UTILITY_REGISTRY_METADATA.notes.some((note) => note.includes("No registry-version bump was taken"))).toBe(true);
  });

  it("keeps every utility on the canonical four-subcategory, five-question shape", () => {
    expect(PRODUCT_UTILITY_REGISTRY.length).toBeGreaterThan(0);
    expect(
      PRODUCT_UTILITY_REGISTRY.every((utility) => utility.subcategories.length === 4)
    ).toBe(true);
    expect(
      PRODUCT_UTILITY_REGISTRY.every((utility) =>
        utility.subcategories.every((subcategory) => subcategory.questions.length === 5)
      )
    ).toBe(true);
    expect(
      PRODUCT_UTILITY_REGISTRY.every((utility) =>
        utility.subcategories.flatMap((subcategory) => subcategory.questions).length === PRODUCT_UTILITY_SCORED_QUESTION_COUNT
      )
    ).toBe(true);
  });

  it("keeps the product-general and open-ended modules as stable operator-usefulness layers", () => {
    expect(PRODUCT_GENERAL_MODULE.questions).toHaveLength(PRODUCT_GENERAL_QUESTION_COUNT);
    expect(PRODUCT_OPEN_ENDED_MODULE.questions).toHaveLength(PRODUCT_OPEN_ENDED_QUESTION_COUNT);
    expect(PRODUCT_GENERAL_MODULE.questions[1]?.prompt).toMatch(/grounded operating paragraph/i);
    expect(PRODUCT_OPEN_ENDED_MODULE.questions.some((question) => question.key === "evidence_needed_next")).toBe(true);
    expect(PRODUCT_OPEN_ENDED_MODULE.questions.some((question) => question.key === "recommended_next_action")).toBe(true);
  });

  it("keeps generated question ids versioned and stable against the current registry contract", () => {
    const plan = getProductAssessmentPlan({
      perspective: "vendor",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });
    const questionIds = plan.modules.flatMap((module) => module.questions.map((question) => question.id));

    expect(questionIds.length).toBe(40);
    expect(questionIds.every((id) => id.startsWith(`${PRODUCT_UTILITY_REGISTRY_VERSION}__`))).toBe(true);
    expect(questionIds).toContain(`${PRODUCT_UTILITY_REGISTRY_VERSION}__product_general_v1__product_name`);
    expect(questionIds).toContain(`${PRODUCT_UTILITY_REGISTRY_VERSION}__erp_gl_core_ledger__journal_processing__day_to_day_fit`);
    expect(questionIds).toContain(`${PRODUCT_UTILITY_REGISTRY_VERSION}__product_open_ended_v1__evidence_needed_next`);
  });
});
