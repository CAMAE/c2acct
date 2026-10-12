import { getVendorFirmReviewVotes } from "@/lib/vendorFirmReviewVotes";
import { readFreshness, FRESHNESS_WINDOWS, type FreshnessReading } from "@/lib/freshness";
import { ENTERING_EXPIRY_DAYS } from "@/lib/notifications/staleness/generators";
import { quarterCutoff } from "@/lib/consultantFreshness";

/**
 * 16f — vendor review-refresh view (P2-3). A vendor sees the freshness of the
 * FIRM reviews of its products: which are current, which are aging, which have
 * entered the month-10 refresh window, and which have aged out of the 12-month
 * benchmark window entirely. The vendor's mirror of the consultant freshness
 * board — same canonical readers ([[freshness]] readFreshness + the published
 * 12-month window), no per-surface re-derivation.
 *
 * Honest framing: PAT already auto-invites the reviewing firm to a low-friction
 * delta refresh at month 10 (the 16b review-expiry alert). This view only makes
 * that standing visible — freshness is a label on the review date, never a
 * change to any score.
 */

/** A firm review's position in the 12-month lifecycle, by age of its submission. */
export type ReviewLifecycle = "fresh" | "aging" | "refresh-window" | "expired";

export type VendorProductRefreshRow = {
  productId: string;
  productName: string;
  reviewCount: number;
  fresh: number;
  aging: number;
  /** Month 10–12: entered the refresh window but still counts. */
  refreshWindow: number;
  /** Older than 12 months: no longer counts toward benchmarks. */
  expired: number;
  latestFreshness: FreshnessReading | null;
};

export type VendorRefreshSummary = {
  products: number;
  reviews: number;
  refreshWindow: number;
  expired: number;
};

export type VendorRefreshBoard = {
  cutoffIso: string;
  cutoffLabel: string;
  rows: VendorProductRefreshRow[];
  summary: VendorRefreshSummary;
};

const MONTH_LABEL_OPTS = { month: "short", day: "numeric", year: "numeric" } as const;

/** Age → lifecycle bucket, using the published 90/300/365-day windows. */
export function reviewLifecycleForAgeDays(ageDays: number): ReviewLifecycle {
  if (ageDays > FRESHNESS_WINDOWS.staleAfterDays) return "expired";
  if (ageDays >= ENTERING_EXPIRY_DAYS) return "refresh-window";
  if (ageDays >= FRESHNESS_WINDOWS.agingAfterDays) return "aging";
  return "fresh";
}

export async function getVendorRefreshBoard(
  vendorCompanyId: string,
  now: Date = new Date()
): Promise<VendorRefreshBoard> {
  const cutoff = quarterCutoff(now);
  const empty: VendorRefreshSummary = { products: 0, reviews: 0, refreshWindow: 0, expired: 0 };
  const base = {
    cutoffIso: cutoff.toISOString(),
    cutoffLabel: cutoff.toLocaleDateString("en-US", MONTH_LABEL_OPTS),
  };

  // vendor-hub-reader box (2026-10-12, R60): one reader for "firm reviews on file" —
  // the latest FINAL per (firm, product) from the vendor's scoped firms, shared with
  // the vendor hub (lib/vendorFirmReviewVotes). Before the box this board counted
  // every final submission (97 for Meridian) while the hub showed 0.
  const votes = await getVendorFirmReviewVotes(vendorCompanyId);
  if (votes.products.length === 0) {
    return { ...base, rows: [], summary: empty };
  }
  const products = votes.products.map((product) => ({ id: product.productId, name: product.productName }));
  const byProduct = new Map<string, Date[]>(votes.products.map((product) => [product.productId, product.voteDates]));

  const rows: VendorProductRefreshRow[] = products.map((p) => {
    const dates = byProduct.get(p.id) ?? [];
    const row: VendorProductRefreshRow = {
      productId: p.id,
      productName: p.name,
      reviewCount: dates.length,
      fresh: 0,
      aging: 0,
      refreshWindow: 0,
      expired: 0,
      latestFreshness: dates.length > 0 ? readFreshness(dates[0], now) : null,
    };
    for (const d of dates) {
      const reading = readFreshness(d, now);
      if (!reading) continue;
      const bucket = reviewLifecycleForAgeDays(reading.ageDays);
      if (bucket === "fresh") row.fresh += 1;
      else if (bucket === "aging") row.aging += 1;
      else if (bucket === "refresh-window") row.refreshWindow += 1;
      else row.expired += 1;
    }
    return row;
  });

  // Most-attention products first: refresh-window, then expired, then most reviews.
  rows.sort((a, b) => b.refreshWindow - a.refreshWindow || b.expired - a.expired || b.reviewCount - a.reviewCount);

  const summary: VendorRefreshSummary = {
    products: rows.filter((r) => r.reviewCount > 0).length,
    reviews: rows.reduce((n, r) => n + r.reviewCount, 0),
    refreshWindow: rows.reduce((n, r) => n + r.refreshWindow, 0),
    expired: rows.reduce((n, r) => n + r.expired, 0),
  };

  return { ...base, rows, summary };
}
