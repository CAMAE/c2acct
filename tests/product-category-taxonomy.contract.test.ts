import { describe, expect, it } from "vitest";
import {
  CANONICAL_PRODUCT_CATEGORIES,
  canonicalCategoryForUtility,
  canonicalCategoryForProduct,
} from "@/lib/productCategoryTaxonomy";
import { PRODUCT_UTILITY_REGISTRY } from "@/lib/productUtilityRegistry";

/**
 * Block 10a: every registry utility maps into exactly one of the SEVEN shared
 * canonical categories, so demo products stop fragmenting into ~51 categories
 * and each category can clear the >=5-vendor benchmark floor.
 */
describe("canonical product category taxonomy", () => {
  it("defines seven canonical categories", () => {
    expect(CANONICAL_PRODUCT_CATEGORIES).toHaveLength(7);
  });

  it("maps every registry utility to a canonical category (no fragmentation)", () => {
    for (const utility of PRODUCT_UTILITY_REGISTRY) {
      const category = canonicalCategoryForUtility(utility.key);
      expect(CANONICAL_PRODUCT_CATEGORIES).toContain(category);
    }
  });

  it("collapses the registry to at most seven categories", () => {
    const produced = new Set(PRODUCT_UTILITY_REGISTRY.map((u) => canonicalCategoryForUtility(u.key)));
    expect(produced.size).toBeLessThanOrEqual(7);
    expect(produced.size).toBeGreaterThan(1);
  });

  it("is deterministic and falls back safely for unknown keys", () => {
    expect(canonicalCategoryForUtility(undefined)).toBe("Workflow & Practice Ops");
    expect(canonicalCategoryForUtility("totally-bespoke-key")).toBe("Workflow & Practice Ops");
    expect(canonicalCategoryForProduct([])).toBe("Workflow & Practice Ops");
  });
});
