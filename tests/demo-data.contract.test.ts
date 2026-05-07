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
import {
  JUNE_1_PILOT_COHORT,
  getPilotCohortMinimums,
} from "@/data/pilotCohort";
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

    const productTargets = products.map(({ product }) => product.scoreTarget);
    const firmTargets = DEMO_PAT_FIRMS.map((firm) => firm.scoreTarget);
    expect(Math.max(...productTargets) - Math.min(...productTargets)).toBeGreaterThanOrEqual(0.8);
    expect(Math.max(...firmTargets) - Math.min(...firmTargets)).toBeGreaterThanOrEqual(1);
  });

  it("defines a separate June 1 pilot fixture without demo-boundary classification", () => {
    const minimums = getPilotCohortMinimums();
    const demoCompanyNames = new Set([
      ...DEMO_PAT_VENDORS.map((vendor) => vendor.displayName),
      ...DEMO_PAT_FIRMS.map((firm) => firm.displayName),
    ]);

    expect(JUNE_1_PILOT_COHORT.key).toBe("june-1-pilot-2026");
    expect(JUNE_1_PILOT_COHORT.dataBoundary).toBe("PILOT");
    expect(JUNE_1_PILOT_COHORT.startsAt).toBe("2026-06-01T00:00:00.000Z");
    expect(minimums.vendorMemberCount).toBeGreaterThanOrEqual(2);
    expect(minimums.firmMemberCount).toBeGreaterThanOrEqual(2);
    expect(minimums.userMemberCount).toBeGreaterThanOrEqual(3);

    for (const organization of JUNE_1_PILOT_COHORT.organizations) {
      expect(demoCompanyNames.has(organization.name)).toBe(false);
      expect(organization.supportContactEmail).toMatch(/@pat\.local$/);
      expect(organization.provisioningState).toMatch(/INVITED|PROVISIONING|ACTIVE/);
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
    expect(health.vendorProductScoreSpread).toBeGreaterThanOrEqual(30);
    expect(health.firmProductScoreSpread).toBeGreaterThanOrEqual(30);
    expect(health.firmAlignmentModuleScoreSpread).toBeGreaterThanOrEqual(25);
    expect(health.highAlignmentProductCount).toBeGreaterThanOrEqual(2);
    expect(health.lowAlignmentProductCount).toBeGreaterThanOrEqual(2);
    expect(health.vendorSelfHigherThanFirmCount).toBeGreaterThanOrEqual(2);
    expect(health.closeVendorFirmAlignmentCount).toBeGreaterThanOrEqual(2);
    expect(health.routeReady).toBe(true);
    expect(health.ok).toBe(true);
  });

  it("proves seeded pilot readiness without counting pilot records as demo data", async () => {
    applyRepoEnv();
    const { getDemoPatEcosystemHealth } = await import("@/lib/demoPatEcosystemHealth");
    const { getPilotCohortHealth } = await import("@/lib/pilotCohortHealth");
    const [demoHealth, pilotHealth] = await Promise.all([
      getDemoPatEcosystemHealth(),
      getPilotCohortHealth(),
    ]);
    const minimums = getPilotCohortMinimums();

    expect(demoHealth.vendorCount).toBeGreaterThanOrEqual(DEMO_VENDOR_COUNT_MINIMUM);
    expect(demoHealth.firmCount).toBe(10);
    expect(pilotHealth.error).toBeNull();
    expect(pilotHealth.expectedJune1CohortKey).toBe(JUNE_1_PILOT_COHORT.key);
    expect(pilotHealth.cohortCount).toBeGreaterThanOrEqual(minimums.cohortCount);
    expect(pilotHealth.memberCount).toBeGreaterThanOrEqual(minimums.memberCount);
    expect(pilotHealth.vendorMemberCount).toBeGreaterThanOrEqual(minimums.vendorMemberCount);
    expect(pilotHealth.firmMemberCount).toBeGreaterThanOrEqual(minimums.firmMemberCount);
    expect(pilotHealth.userMemberCount).toBeGreaterThanOrEqual(minimums.userMemberCount);
    expect(pilotHealth.pilotBoundaryMemberCount).toBe(pilotHealth.memberCount);
    expect(pilotHealth.demoBoundaryMemberCount).toBe(0);
    expect(pilotHealth.productionBoundaryMemberCount).toBe(0);
    expect(pilotHealth.june1PilotReady).toBe(true);
    expect(pilotHealth.ok).toBe(true);
  });
});
