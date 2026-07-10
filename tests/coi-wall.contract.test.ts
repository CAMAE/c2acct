import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Conflict-of-interest wall (Governance Phase 2, A3/B7). The benchmark-integrity
 * crown jewel: a rated vendor's OWN self-reported data must never influence any
 * peer / cross-firm aggregate it is measured against. This is DISTINCT from the
 * demo dataBoundary wall (tests/data-boundary-exclusion.contract.test.ts) — that
 * excludes synthetic rows; this excludes a real vendor's self-report from the
 * real firm-review mean it is compared to.
 *
 * Two independent proofs:
 *   1. Math wall — the pure snapshot builder computes the firm-reviewed mean from
 *      firm inputs ONLY; a vendor self-report value can never enter it.
 *   2. Query wall — the live getter fetches firm reviews with a Company.type=FIRM
 *      + firm-product-module filter, structurally separate from the vendor's own
 *      self-report (vendor module, vendor's own company).
 */

// --- Proof 1: math wall (pure builder, no mocks) -------------------------------

describe("COI wall — vendor self-report never enters the firm-reviewed mean", () => {
  it("firm mean uses firm inputs only; a high vendor self-report does not pull it up", async () => {
    const { buildVendorProductInsightSnapshot } = await import("@/lib/vendorProductInsightEngine");

    const snapshot = buildVendorProductInsightSnapshot({
      product: { id: "product-1", name: "Ledger Pro", category: null, summary: null, utilityKeys: [] },
      vendorAssessmentStatus: {
        completed: true,
        latestSubmittedAt: new Date("2026-07-01"),
        statusLabel: "Completed",
        reason: "complete",
      },
      // Vendor rates itself a 90.
      vendorSelfReported: {
        latestScore: 90,
        submittedAt: new Date("2026-07-01"),
        responses: { answers: {}, scaleMin: 0, scaleMax: 100 },
      },
      // Two firms reviewed it; their mean is 60.
      firmReviewed: {
        assessmentCount: 2,
        latestSubmittedAt: new Date("2026-07-02"),
        averageScore: 60,
        responseSets: [
          { answers: {}, scaleMin: 0, scaleMax: 100 },
          { answers: {}, scaleMin: 0, scaleMax: 100 },
        ],
      },
    });

    // The firm-reviewed mean is 60 — the vendor's 90 is NOT blended in
    // ((90+60+60)/3 would be 70; a 2-firm firm-only mean is 60).
    expect(snapshot.firmReviewed.averageScore).toBe(60);
    expect(snapshot.vendorSelfReported.latestScore).toBe(90);
    // Divergence is measured as vendor-vs-firm, proving the two stay separate.
    expect(snapshot.divergence.points).toBe(30);
  });

  it("the firm mean is invariant to the vendor's self-report value", async () => {
    const { buildVendorProductInsightSnapshot } = await import("@/lib/vendorProductInsightEngine");

    const build = (vendorScore: number) =>
      buildVendorProductInsightSnapshot({
        product: { id: "product-2", name: "Recon Suite", category: null, summary: null, utilityKeys: [] },
        vendorAssessmentStatus: {
          completed: true,
          latestSubmittedAt: new Date("2026-07-01"),
          statusLabel: "Completed",
          reason: "complete",
        },
        vendorSelfReported: {
          latestScore: vendorScore,
          submittedAt: new Date("2026-07-01"),
          responses: { answers: {}, scaleMin: 0, scaleMax: 100 },
        },
        firmReviewed: {
          assessmentCount: 3,
          latestSubmittedAt: new Date("2026-07-02"),
          averageScore: 55,
          responseSets: [
            { answers: {}, scaleMin: 0, scaleMax: 100 },
            { answers: {}, scaleMin: 0, scaleMax: 100 },
            { answers: {}, scaleMin: 0, scaleMax: 100 },
          ],
        },
      });

    // Vendor rates itself 0 in one world and 100 in another; the peer firm mean
    // it is measured against does not move — the COI wall holds.
    expect(build(0).firmReviewed.averageScore).toBe(55);
    expect(build(100).firmReviewed.averageScore).toBe(55);
    expect(build(0).firmReviewed.averageScore).toBe(build(100).firmReviewed.averageScore);
  });
});

// --- Proof 2: query wall (live getter, mocked persistence) ---------------------

const q = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surveyModule: { findUnique: q.findUnique },
    surveySubmission: { findMany: q.findMany, findFirst: q.findFirst },
  },
}));

// Identity passthrough so we inspect the raw where the engine constructs.
vi.mock("@/lib/surveyDrafts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/surveyDrafts")>()),
  getSurveyFinalWhere: (where: unknown) => where,
}));

vi.mock("@/lib/tenancy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tenancy")>()),
  getVendorScopedFirms: vi.fn(async () => ["firm-a", "firm-b"]),
}));

vi.mock("@/lib/vendorPat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/vendorPat")>()),
  getVendorCompanyContext: vi.fn(async () => ({
    company: { id: "vendor-1", name: "Acme", type: "VENDOR" },
    products: [{ id: "product-1", name: "Ledger Pro", summary: null, category: null, signals: [] }],
    compatibilityMode: false,
  })),
}));

describe("COI wall — live firm-review query is structurally walled from vendor self-report", () => {
  beforeEach(() => {
    q.findMany.mockReset().mockResolvedValue([]);
    q.findFirst.mockReset().mockResolvedValue(null);
    q.findUnique.mockReset().mockImplementation(async (args: { where: { key: string } }) => {
      if (args.where.key.includes("vendor")) return { id: "mod-vendor" };
      return { id: "mod-firm" };
    });
  });

  it("firm reviews are fetched with Company.type=FIRM on the firm-product module, not the vendor's own rows", async () => {
    const { getVendorProductInsightSnapshot } = await import("@/lib/vendorProductInsightEngine");
    const { VENDOR_PRODUCT_MODULE_KEY } = await import("@/lib/vendorPat");
    const { FIRM_PRODUCT_MODULE_KEY } = await import("@/lib/firmPat");

    // Distinct module namespaces are the structural basis of the wall.
    expect(VENDOR_PRODUCT_MODULE_KEY).not.toBe(FIRM_PRODUCT_MODULE_KEY);

    await getVendorProductInsightSnapshot("vendor-1", "product-1");

    // The firm-review aggregate query (findMany) must restrict to FIRM companies
    // on the firm-product module — a vendor self-report row (VENDOR company,
    // vendor module) can never be selected into it.
    expect(q.findMany).toHaveBeenCalledTimes(1);
    const firmWhere = q.findMany.mock.calls[0][0].where as {
      moduleId: string;
      Company: { type: string };
    };
    expect(firmWhere.moduleId).toBe("mod-firm");
    expect(firmWhere.Company.type).toBe("FIRM");

    // The vendor's own self-report is a SEPARATE query, scoped to the vendor's
    // own company on the vendor module — never mixed into the firm findMany.
    expect(q.findFirst).toHaveBeenCalledTimes(1);
    const vendorWhere = q.findFirst.mock.calls[0][0].where as {
      moduleId: string;
      companyId: string;
    };
    expect(vendorWhere.moduleId).toBe("mod-vendor");
    expect(vendorWhere.companyId).toBe("vendor-1");
    expect(vendorWhere.moduleId).not.toBe(firmWhere.moduleId);
  });
});
