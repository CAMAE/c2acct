import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 16f — vendor review-refresh view. Pins: (1) the review lifecycle buckets off
 * the published 90 / 300 / 365-day windows (fresh / aging / refresh-window /
 * expired); (2) the board buckets each product's firm reviews and summarizes;
 * (3) anti-A3 — it reads the canonical freshness reader, no local thresholds.
 */

const { db } = vi.hoisted(() => ({
  db: {
    product: { findMany: vi.fn() },
    surveyModule: { findUnique: vi.fn() },
    surveySubmission: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/tenancy", () => ({ getVendorScopedFirms: vi.fn(async () => ["firm1", "firm2"]) }));

import { getVendorRefreshBoard, reviewLifecycleForAgeDays } from "@/lib/vendorRefresh";

const ROOT = path.resolve(__dirname, "..");
const DAY = 86_400_000;
const NOW = new Date("2026-07-17T12:00:00.000Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

beforeEach(() => {
  vi.clearAllMocks();
  db.surveyModule.findUnique.mockResolvedValue({ id: "firm-mod" });
});

describe("reviewLifecycleForAgeDays", () => {
  it("buckets on the 90 / 300 / 365-day windows", () => {
    expect(reviewLifecycleForAgeDays(0)).toBe("fresh");
    expect(reviewLifecycleForAgeDays(89)).toBe("fresh");
    expect(reviewLifecycleForAgeDays(90)).toBe("aging");
    expect(reviewLifecycleForAgeDays(299)).toBe("aging");
    expect(reviewLifecycleForAgeDays(300)).toBe("refresh-window");
    expect(reviewLifecycleForAgeDays(365)).toBe("refresh-window");
    expect(reviewLifecycleForAgeDays(366)).toBe("expired");
  });
});

describe("getVendorRefreshBoard", () => {
  it("buckets each product's reviews and summarizes across products", async () => {
    db.product.findMany.mockResolvedValue([
      { id: "pA", name: "Product A" },
      { id: "pB", name: "Product B" },
    ]);
    db.surveySubmission.findMany.mockResolvedValue([
      // Product A: 1 fresh, 1 refresh-window, 1 expired
      { createdAt: ago(10), Subject: { productId: "pA" } },
      { createdAt: ago(320), Subject: { productId: "pA" } },
      { createdAt: ago(400), Subject: { productId: "pA" } },
      // Product B: 2 fresh
      { createdAt: ago(5), Subject: { productId: "pB" } },
      { createdAt: ago(20), Subject: { productId: "pB" } },
    ]);

    const board = await getVendorRefreshBoard("vendor1", NOW);
    const byId = Object.fromEntries(board.rows.map((r) => [r.productId, r]));
    expect(byId.pA).toMatchObject({ reviewCount: 3, fresh: 1, refreshWindow: 1, expired: 1 });
    expect(byId.pB).toMatchObject({ reviewCount: 2, fresh: 2, refreshWindow: 0, expired: 0 });
    expect(board.summary).toMatchObject({ products: 2, reviews: 5, refreshWindow: 1, expired: 1 });
    // Product A (has refresh-window items) sorts ahead of B.
    expect(board.rows[0].productId).toBe("pA");
    // Cutoff = end of Q3 for a July 'now'.
    expect(board.cutoffIso).toBe("2026-09-30T23:59:59.999Z");
  });

  it("returns an empty board when the vendor has no products", async () => {
    db.product.findMany.mockResolvedValue([]);
    const board = await getVendorRefreshBoard("vendor1", NOW);
    expect(board.rows).toEqual([]);
    expect(board.summary).toMatchObject({ products: 0, reviews: 0 });
  });

  it("a product with no reviews reads null freshness (absence is not staleness)", async () => {
    db.product.findMany.mockResolvedValue([{ id: "pC", name: "Product C" }]);
    db.surveySubmission.findMany.mockResolvedValue([]);
    const board = await getVendorRefreshBoard("vendor1", NOW);
    expect(board.rows[0]).toMatchObject({ reviewCount: 0, latestFreshness: null });
  });
});

describe("anti-A3 — vendor refresh reads the canonical freshness reader", () => {
  it("lib/vendorRefresh.ts imports the shared reader and the shared expiry window", () => {
    const text = readFileSync(path.join(ROOT, "lib/vendorRefresh.ts"), "utf8");
    expect(text).toMatch(/from "@\/lib\/freshness"/);
    expect(text).toMatch(/ENTERING_EXPIRY_DAYS/);
  });
});
