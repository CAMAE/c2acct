import { describe, expect, it } from "vitest";
import { getVendorProductInsightActivation } from "@/lib/vendorProductInsightActivation";
import {
  getVendorProductInsightDetail,
  getVendorProductInsightOverviewCards,
} from "@/lib/vendorProductInsightCards";
import {
  buildVendorProductInsightSnapshot,
  type VendorProductInsightSnapshotInput,
} from "@/lib/vendorProductInsightEngine";

function buildFixtureInput(): VendorProductInsightSnapshotInput {
  return {
    product: {
      id: "product-fixture",
      name: "PAT Fixture Product",
      summary: "Short product summary.",
      utilityKeys: ["ap_automation", "reporting_analytics"],
    },
    vendorSelfReported: {
      latestScore: 84,
      submittedAt: new Date("2026-03-30T12:00:00.000Z"),
      responses: {
        answers: {
          registry__ap_automation__invoice_capture__q1: 5,
          registry__ap_automation__invoice_capture__q2: 4,
          registry__ap_automation__approval_controls__q1: 5,
          registry__reporting_analytics__dashboard_visibility__q1: 4,
        },
        scaleMin: 0,
        scaleMax: 5,
      },
    },
    firmReviewed: {
      assessmentCount: 2,
      latestSubmittedAt: new Date("2026-03-30T13:00:00.000Z"),
      averageScore: 34,
      responseSets: [
        {
          answers: {
            registry__ap_automation__invoice_capture__q1: 2,
            registry__ap_automation__approval_controls__q1: 3,
            registry__reporting_analytics__dashboard_visibility__q1: 2,
          },
          scaleMin: 0,
          scaleMax: 5,
        },
        {
          answers: {
            registry__ap_automation__invoice_capture__q1: 1,
            registry__ap_automation__approval_controls__q1: 2,
            registry__reporting_analytics__dashboard_visibility__q1: 2,
          },
          scaleMin: 1,
          scaleMax: 5,
        },
      ],
    },
  };
}

function buildFixture() {
  return buildVendorProductInsightSnapshot(buildFixtureInput());
}

describe("vendor product insight card architecture", () => {
  it("builds concise clickable cards with stable detail routes", () => {
    const snapshot = buildFixture();
    const cards = getVendorProductInsightOverviewCards(snapshot);

    expect(cards.length).toBe(9);
    expect(new Set(cards.map((card) => card.key)).size).toBe(cards.length);
    expect(cards.every((card) => card.indicators.length <= 3)).toBe(true);
    expect(cards.every((card) => card.href.startsWith(`/vendor/product-insight/${snapshot.product.id}/`))).toBe(true);
    expect(cards.every((card) => card.href.split("/").length === 5)).toBe(true);
    expect(cards.some((card) => card.key === "vendor-self-reported-signal")).toBe(true);
    expect(cards.some((card) => card.key === "current-product-fit")).toBe(true);
    expect(cards.some((card) => card.key === "market-comparison")).toBe(true);
  });

  it("provides a detail model for every clickable overview card", () => {
    const snapshot = buildFixture();
    const cards = getVendorProductInsightOverviewCards(snapshot);

    for (const card of cards) {
      const detail = getVendorProductInsightDetail(snapshot, card.key);
      expect(detail, `Missing detail model for ${card.key}`).toBeTruthy();
      expect(detail?.key).toBe(card.key);
      expect(detail?.title.length).toBeGreaterThan(0);
    }
  });

  it("maps metric and pro cards into stable detail models", () => {
    const snapshot = buildFixture();
    const metricDetail = getVendorProductInsightDetail(snapshot, "combined-current-pat-readout");
    const proDetail = getVendorProductInsightDetail(snapshot, "current-product-fit");

    expect(metricDetail?.heroValue).toBe("50 pts");
    expect(metricDetail?.exactAssessmentBasis).toContain("Vendor score: 84%");
    expect(metricDetail?.exactAssessmentBasis).toContain("Firm-reviewed average: 34%");
    expect(metricDetail?.exactAssessmentBasis).toContain("Utility scope:");
    expect(proDetail?.locked).toBe(false);
    expect(proDetail?.howCalculated).toContain("Vendor self-reported signal");
    expect(proDetail?.howCalculated).toContain("Firm-reviewed signal");
    expect(proDetail?.exactAssessmentBasis).toContain("Utility scope:");
    expect(proDetail?.evidencePanels).toHaveLength(3);
    expect(proDetail?.evidencePanels[2]?.title).toBe("Confidence caveats");
  });

  it("keeps locked elite detail routes honest", () => {
    const snapshot = buildFixture();
    const detail = getVendorProductInsightDetail(snapshot, "market-comparison");

    expect(detail?.locked).toBe(true);
    expect(detail?.heroValue).toBe("Locked");
    expect(detail?.notClaimed).toMatch(/does not imply/i);
    expect(detail?.evidencePanels[0]?.body).toMatch(/does not expose a separate benchmark, forecast, or simulation layer/i);
    expect(detail?.exactAssessmentBasis).toMatch(/No .* basis is live/i);
  });

  it("routes missing utility, vendor, and firm evidence into honest next actions", () => {
    const base = buildFixtureInput();
    const utilityless = buildVendorProductInsightSnapshot({
      ...base,
      product: {
        ...base.product,
        utilityKeys: [],
      },
      vendorSelfReported: {
        latestScore: null,
        submittedAt: null,
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 0,
        latestSubmittedAt: null,
        averageScore: null,
        responseSets: [],
      },
    });
    const vendorMissing = buildVendorProductInsightSnapshot({
      ...base,
      vendorSelfReported: {
        latestScore: null,
        submittedAt: null,
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 0,
        latestSubmittedAt: null,
        averageScore: null,
        responseSets: [],
      },
    });
    const firmThin = buildVendorProductInsightSnapshot({
      ...base,
      firmReviewed: {
        ...base.firmReviewed,
        assessmentCount: 1,
        responseSets: [base.firmReviewed.responseSets[0]],
      },
    });

    const utilitylessActivation = getVendorProductInsightActivation(utilityless);
    const vendorMissingActivation = getVendorProductInsightActivation(vendorMissing);
    const firmThinActivation = getVendorProductInsightActivation(firmThin);

    expect(utilitylessActivation.primaryCta.href).toBe("/vendor/product-assessment/product-fixture");
    expect(utilitylessActivation.title).toMatch(/declare utilities/i);
    expect(utilitylessActivation.missingEvidence).toMatch(/No utility declaration is live/i);

    expect(vendorMissingActivation.primaryCta.label).toMatch(/Start product assessment/i);
    expect(vendorMissingActivation.missingEvidence).toMatch(/Vendor-authored product evidence is still missing/i);

    expect(firmThinActivation.title).toMatch(/Thin firm-reviewed sample/i);
    expect(firmThinActivation.primaryCta.href).toBe("/vendor/product-insight/product-fixture");
    expect(firmThinActivation.missingEvidence).toMatch(/sample-thin/i);
  });
});
