import { describe, expect, it } from "vitest";
import {
  DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM,
  DEMO_PAT_FIRMS,
  DEMO_PAT_VENDORS,
  DEMO_PRODUCT_COUNT_MINIMUM,
  DEMO_VENDOR_COUNT_MINIMUM,
  getDemoEcosystemMinimums,
  getDemoFirmVendorRelationships,
  getDemoProducts,
} from "@/data/demoPatEcosystem";
import { applyRepoEnv } from "@/lib/env/repoEnv";

const EXPECTED_FIRM_ALIGNMENT_MODULE_COUNT = 5;

describe("PAT deterministic demo ecosystem", () => {
  it("defines enough coherent demo vendors, products, firms, and firm/vendor relationships", () => {
    const minimums = getDemoEcosystemMinimums();
    const products = getDemoProducts();
    const relationships = getDemoFirmVendorRelationships();

    expect(minimums.vendorCount).toBeGreaterThanOrEqual(DEMO_VENDOR_COUNT_MINIMUM);
    expect(minimums.productCount).toBeGreaterThanOrEqual(DEMO_PRODUCT_COUNT_MINIMUM);
    expect(minimums.firmCount).toBe(10);
    expect(minimums.firmVendorRelationshipCount).toBeGreaterThanOrEqual(DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM);

    for (const vendor of DEMO_PAT_VENDORS) {
      expect(vendor.products.length).toBeGreaterThanOrEqual(3);
      expect(vendor.products.length).toBeLessThanOrEqual(5);
      expect(vendor.industryFocus).toMatch(/\w/);
      expect(vendor.integrationNeeds.length).toBeGreaterThanOrEqual(3);
      expect(vendor.riskFlags.length).toBeGreaterThanOrEqual(1);
    }

    for (const product of products) {
      expect(product.product.utilityKeys.length).toBeGreaterThanOrEqual(3);
      expect(product.product.profile.positioning).toMatch(/\w/);
      expect(product.product.profile.integrationPosture).toMatch(/\w/);
      expect(product.product.riskFlags.length).toBeGreaterThanOrEqual(1);
    }

    for (const firm of DEMO_PAT_FIRMS) {
      expect(firm.industry).toMatch(/\w/);
      expect(firm.integrationNeeds.length).toBeGreaterThanOrEqual(3);
      expect(firm.riskFlags.length).toBeGreaterThanOrEqual(1);
    }

    for (const vendor of DEMO_PAT_VENDORS) {
      const firmsForVendor = new Set(
        relationships
          .filter((relationship) => relationship.vendor.key === vendor.key)
          .map((relationship) => relationship.firm.key)
      );
      expect(firmsForVendor.size).toBe(10);
    }
  });

  it("proves the seeded local database is route-ready after seed:baseline and seed:pat-runtime", async () => {
    applyRepoEnv();
    const { getDemoPatEcosystemHealth } = await import("@/lib/demoPatEcosystemHealth");
    const health = await getDemoPatEcosystemHealth();

    expect(health.error).toBeNull();
    expect(health.vendorCount).toBeGreaterThanOrEqual(DEMO_VENDOR_COUNT_MINIMUM);
    expect(health.productCount).toBeGreaterThanOrEqual(DEMO_PRODUCT_COUNT_MINIMUM);
    expect(health.firmCount).toBe(10);
    expect(health.productProfileCount).toBeGreaterThanOrEqual(health.productCount);
    expect(health.vendorProductPlanCount).toBeGreaterThanOrEqual(health.productCount);
    expect(health.firmProductPlanCount).toBeGreaterThanOrEqual(health.productCount);
    expect(health.vendorProductAssessmentCount).toBeGreaterThanOrEqual(health.productCount);
    expect(health.firmAlignmentSubmissionCount).toBeGreaterThanOrEqual(
      health.firmCount * EXPECTED_FIRM_ALIGNMENT_MODULE_COUNT
    );
    expect(health.firmProductAssessmentCount).toBeGreaterThanOrEqual(DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM);
    expect(health.firmVendorRelationshipCount).toBeGreaterThanOrEqual(DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM);
    expect(health.routeReady).toBe(true);
    expect(health.ok).toBe(true);
  });
});
