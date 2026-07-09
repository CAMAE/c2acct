import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Data-integrity wall contract (2026-07-09 audit, CLASS 1). Proves that demo
 * rows are excluded from every customer-facing aggregate, that the classifier
 * marks synthetic companies, and that the pool policy holds. This is the
 * regression-proof part: if an aggregate drops its boundary filter, a test here
 * fails.
 */

describe("boundary pool policy", () => {
  it("real/pilot viewers pool over {PRODUCTION, PILOT}; demo is walled to demo", async () => {
    const { poolForViewerBoundary, CUSTOMER_FACING_BOUNDARIES } = await import("@/lib/dataBoundary");
    expect(poolForViewerBoundary("PRODUCTION" as never)).toEqual(["PRODUCTION", "PILOT"]);
    expect(poolForViewerBoundary("PILOT" as never)).toEqual(["PRODUCTION", "PILOT"]);
    expect(poolForViewerBoundary("DEMO" as never)).toEqual(["DEMO"]);
    // Demo never appears in the customer-facing pool.
    expect(CUSTOMER_FACING_BOUNDARIES).not.toContain("DEMO");
  });
});

describe("classifyCompanyBoundaries (reseed classifier)", () => {
  it("marks demo-* as DEMO, pilot-company-* as PILOT, leaves real ids untouched", async () => {
    const { classifyCompanyBoundaries } = await import("@/lib/dataBoundaryBackfill");
    const updateManyCalls: Array<{ where: unknown; data: unknown }> = [];
    const client = {
      company: {
        updateMany: vi.fn(async (args: { where: unknown; data: unknown }) => {
          updateManyCalls.push(args);
          return { count: 1 };
        }),
      },
      user: { findMany: vi.fn(async () => []) },
    };

    await classifyCompanyBoundaries(client as never);

    // DEMO by id namespace, PILOT by id namespace — both present.
    expect(updateManyCalls).toEqual(
      expect.arrayContaining([
        { where: { id: { startsWith: "demo-" } }, data: { dataBoundary: "DEMO" } },
        { where: { id: { startsWith: "pilot-company-" } }, data: { dataBoundary: "PILOT" } },
      ])
    );
    // No rule ever sets a company to PRODUCTION (real is the default; never demoted).
    for (const call of updateManyCalls) {
      expect((call.data as { dataBoundary: string }).dataBoundary).not.toBe("PRODUCTION");
    }
  });
});

// --- Admin platform picture: REAL-only aggregate --------------------------
const platformMocks = vi.hoisted(() => ({
  count: vi.fn(),
  submissionFindMany: vi.fn(),
  productFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    company: { count: platformMocks.count },
    surveySubmission: { findMany: platformMocks.submissionFindMany },
    product: { findMany: platformMocks.productFindMany },
  },
}));

describe("adminPlatformPicture excludes demo from every pool", () => {
  beforeEach(() => {
    platformMocks.count.mockReset().mockResolvedValue(0);
    platformMocks.submissionFindMany.mockReset().mockResolvedValue([]);
    platformMocks.productFindMany.mockReset().mockResolvedValue([]);
  });

  it("every count + submission query filters to REAL+PILOT (demo excluded)", async () => {
    const { getPlatformPicture } = await import("@/lib/adminPlatformPicture");
    await getPlatformPicture();

    // Company counts scoped to the real pool.
    for (const call of platformMocks.count.mock.calls) {
      const where = call[0].where as { dataBoundary?: { in: string[] } };
      expect(where.dataBoundary?.in).toEqual(["PRODUCTION", "PILOT"]);
      expect(where.dataBoundary?.in).not.toContain("DEMO");
    }
    expect(platformMocks.count).toHaveBeenCalledTimes(2);

    // Submission aggregates scoped via the submitting Company's boundary.
    for (const call of platformMocks.submissionFindMany.mock.calls) {
      const where = call[0].where as { Company?: { is?: { dataBoundary?: { in: string[] } } } };
      expect(where.Company?.is?.dataBoundary?.in).toEqual(["PRODUCTION", "PILOT"]);
    }
    expect(platformMocks.submissionFindMany).toHaveBeenCalled();
  });
});
