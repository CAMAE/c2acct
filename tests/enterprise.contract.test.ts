import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("@/lib/vendorProductInsightEngine", () => ({ getVendorProductInsightCatalog: vi.fn() }));

import {
  buildPortfolioRollup,
  getEnterpriseForUser,
  isEnterpriseEnabled,
  listEnterpriseChannels,
  listOwnedVendorCompanies,
  marketView,
  portfolioRollup,
  rankMarketView,
  type ProductSignalInput,
} from "@/lib/enterprise";

const FIRM_NAME = "Harbor Lane Accountants"; // a firm that reviews the competitor in the fixture story
const day = (n: number) => new Date(Date.UTC(2026, 8, 25 - n));
const FIXTURE: ProductSignalInput[] = [
  { productId: "p-own-1", productName: "Meridian Close", vendorCompanyId: "v-meridian", vendorCompanyName: "Meridian Practice Cloud", verticalId: "accounting", score: 71, n: 9, lastSubmissionAt: day(3) },
  { productId: "p-own-2", productName: "Bridgepath Flow", vendorCompanyId: "v-bridgepath", vendorCompanyName: "Bridgepath Suite", verticalId: "accounting", score: 78, n: 4, lastSubmissionAt: day(40) },
  { productId: "p-own-3", productName: "Bridgepath Draft", vendorCompanyId: "v-bridgepath", vendorCompanyName: "Bridgepath Suite", verticalId: "accounting", score: null, n: 0, lastSubmissionAt: null },
  { productId: "p-comp-1", productName: "Northwind Ledger Core", vendorCompanyId: "v-northwind", vendorCompanyName: "Northwind Ledger", verticalId: "accounting", score: 78, n: 6, lastSubmissionAt: day(1) },
  { productId: "p-other", productName: "Tax Elsewhere", vendorCompanyId: "v-northwind", vendorCompanyName: "Northwind Ledger", verticalId: "tax", score: 90, n: 2, lastSubmissionAt: day(2) },
];
const OWNED = new Set(["v-meridian", "v-bridgepath"]);

describe("3e enterprise — flag", () => {
  it("is off unless PAT_ENABLE_ENTERPRISE is exactly \"1\"", () => {
    expect(isEnterpriseEnabled({})).toBe(false);
    expect(isEnterpriseEnabled({ PAT_ENABLE_ENTERPRISE: "true" })).toBe(false);
    expect(isEnterpriseEnabled({ PAT_ENABLE_ENTERPRISE: "1" })).toBe(true);
  });

  it("flag off: every reader returns null or empty without touching the database", async () => {
    const saved = process.env.PAT_ENABLE_ENTERPRISE;
    delete process.env.PAT_ENABLE_ENTERPRISE;
    try {
      expect(await getEnterpriseForUser("u1")).toBeNull();
      expect(await listOwnedVendorCompanies("e1")).toEqual([]);
      expect(await portfolioRollup("e1")).toBeNull();
      expect(await marketView("e1", "accounting")).toBeNull();
      expect(await listEnterpriseChannels("e1")).toEqual([]);
    } finally {
      if (saved !== undefined) process.env.PAT_ENABLE_ENTERPRISE = saved;
    }
  });
});

describe("3e enterprise — portfolio roll-up (pure)", () => {
  it("one row per owned product, best score first, unscored last, freshness in days", () => {
    const owned = FIXTURE.filter((p) => OWNED.has(p.vendorCompanyId));
    const rows = buildPortfolioRollup(owned, new Date(Date.UTC(2026, 8, 25)));
    expect(rows.map((r) => r.productId)).toEqual(["p-own-2", "p-own-1", "p-own-3"]);
    expect(rows[0]).toMatchObject({ score: 78, n: 4, freshnessDays: 40, vendorCompanyName: "Bridgepath Suite" });
    expect(rows[1]).toMatchObject({ score: 71, n: 9, freshnessDays: 3 });
    expect(rows[2]).toMatchObject({ score: null, n: 0, freshnessDays: null, lastSubmissionAt: null });
  });
});

describe("3e enterprise — market view (pure) and the neutrality rule", () => {
  it("ranks every product in the channel by score, n breaks ties, and flags ownership", () => {
    const rows = rankMarketView(FIXTURE, OWNED, "accounting");
    expect(rows.map((r) => [r.rank, r.productId, r.owned])).toEqual([
      [1, "p-comp-1", false], // 78 with n 6 beats 78 with n 4
      [2, "p-own-2", true],
      [3, "p-own-1", true],
      [4, "p-own-3", true],
    ]);
    expect(rows.every((r) => r.vendorName.length > 0)).toBe(true);
    expect(rows.find((r) => r.productId === "p-other")).toBeUndefined();
  });

  it("carries no firm key and no firm name for any row, owned or not", () => {
    const rows = rankMarketView(FIXTURE, OWNED, "accounting");
    for (const row of rows) {
      for (const key of Object.keys(row)) expect(key, key).not.toMatch(/firm/i);
    }
    expect(JSON.stringify(rows)).not.toContain(FIRM_NAME);
    expect(JSON.stringify(rows)).not.toMatch(/firm/i);
    // The input type itself has no firm field: a compile-time guard for the reader.
    const keys = Object.keys(FIXTURE[0]);
    expect(keys.some((k) => /firm/i.test(k))).toBe(false);
  });

  it("an empty channel ranks nothing", () => {
    expect(rankMarketView(FIXTURE, OWNED, "legal")).toEqual([]);
  });
});
