import { describe, expect, it } from "vitest";
import {
  PRODUCT_GENERAL_MODULE,
  PRODUCT_OPEN_ENDED_MODULE,
  PRODUCT_SCORE_GUIDE,
  PRODUCT_UTILITY_REGISTRY_METADATA,
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
});
