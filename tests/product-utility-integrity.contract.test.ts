import { describe, expect, it } from "vitest";
import { formatFeatureCountLabel, replaceUtilityTermsForDisplay } from "@/lib/displayCopy";
import {
  PRODUCT_GENERAL_MODULE,
  PRODUCT_OPEN_ENDED_MODULE,
  PRODUCT_SCORE_GUIDE,
  PRODUCT_UTILITY_REGISTRY,
  PRODUCT_UTILITY_REGISTRY_METADATA,
  PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
} from "@/lib/productUtilityRegistry";

describe("product utility registry integrity", () => {
  it("keeps the stored product scoring guide explicit and bounded", () => {
    expect(PRODUCT_SCORE_GUIDE).toHaveLength(6);
    expect(PRODUCT_SCORE_GUIDE[0]).toContain("0 =");
    expect(PRODUCT_SCORE_GUIDE[5]).toContain("5 =");
  });

  it("uses grounded product-general prompts rather than placeholder profile copy", () => {
    const prompts = PRODUCT_GENERAL_MODULE.questions.map((question) => question.prompt);
    expect(prompts.some((prompt) => prompt.includes("grounded operating paragraph"))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes("plain operating terms"))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes("integration posture"))).toBe(true);
  });

  it("keeps the open-ended module focused on evidence and operating fit", () => {
    const prompts = PRODUCT_OPEN_ENDED_MODULE.questions.map((question) => question.prompt);
    expect(prompts.some((prompt) => prompt.includes("what evidence supports that read"))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes("evidence gap or operating limit"))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes("additional evidence would most improve confidence"))).toBe(true);
  });

  it("documents the non-ranking intent of the registry metadata", () => {
    expect(PRODUCT_UTILITY_REGISTRY_METADATA.notes.some((note) => note.includes("not product rankings"))).toBe(true);
    expect(PRODUCT_UTILITY_REGISTRY_METADATA.notes.some((note) => note.includes("evidence honesty"))).toBe(true);
  });

  it("keeps the shipped feature registry above the old four-feature ceiling with 20 scored questions per feature", () => {
    expect(PRODUCT_UTILITY_REGISTRY.length).toBeGreaterThan(4);
    expect(
      PRODUCT_UTILITY_REGISTRY.every(
        (utility) =>
          utility.subcategories.reduce((sum, subcategory) => sum + subcategory.questions.length, 0) ===
          PRODUCT_UTILITY_SCORED_QUESTION_COUNT
      )
    ).toBe(true);
  });

  it("keeps internal utility contracts intact while allowing display-layer feature wording", () => {
    expect(PRODUCT_UTILITY_REGISTRY.every((utility) => typeof utility.key === "string" && utility.key.length > 0)).toBe(
      true
    );
    expect(PRODUCT_UTILITY_REGISTRY_METADATA.notes.some((note) => /utilit/i.test(note))).toBe(true);
    expect(replaceUtilityTermsForDisplay("Utility scoring for declared utilities")).toBe(
      "Feature scoring for declared features"
    );
    expect(formatFeatureCountLabel(2)).toBe("2 features");
  });
});
