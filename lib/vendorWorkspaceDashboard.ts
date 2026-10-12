import prisma from "@/lib/prisma";
import { quarterCutoff } from "@/lib/consultantFreshness";
import { getVendorCompanyContext } from "@/lib/vendorPat";
import { buildVendorProductGapCallout, getVendorProductInsightCatalog, type VendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";
import { getVendorFirmReviewVotes } from "@/lib/vendorFirmReviewVotes";
import { recordPatDiagnostic } from "@/lib/patDiagnostics";

/**
 * Depth box 1 (2026-09-09): the vendor workspace home is the vendor's
 * dashboard — products declared, firm reviews on file, the largest divergence,
 * the next briefing date (the quarterly benchmark cut), the latest product
 * readout, and what changed since the last visit. Same builders as
 * /vendor/product-insight.
 */
export type VendorWorkspaceDashboard = {
  companyName: string;
  productsDeclared: number;
  productsFinal: number;
  /** vendor-hub-reader box (2026-10-12, R60): the one-vote count from lib/vendorFirmReviewVotes, the same number the Review refresh board shows. */
  firmReviewsOnFile: number;
  /** vendor-hub-reader box: the product catalog failed to build; the message, never an empty catalog read as "no reviews". */
  catalogError: string | null;
  largestDivergence: { productId: string; productName: string; points: number; label: string } | null;
  nextBriefing: { dateLabel: string; firmsReviewing: number };
  latestReadout: { productId: string; productName: string; firmReviews: number; selfReported: number | null; firmReviewed: number | null; href: string } | null;
  sinceLastVisit: { sinceLabel: string | null; firmReviewsReceived: number; readoutsRefreshed: number };
  /** R19 (box 2, 2026-09-11): per product, the same signal the Product
   *  Intelligence catalog card shows — self-reported vs firm-reviewed scores
   *  (0-100, null when absent) and the divergence chip label/tone. */
  products: {
    id: string;
    name: string;
    final: boolean;
    firmReviews: number;
    divergenceLabel: string;
    selfReported: number | null;
    firmReviewed: number | null;
    divergencePoints: number | null;
    divergenceTone: "positive" | "amber" | "muted";
    gapLabel: string | null;
  }[];
};

export async function getVendorWorkspaceDashboard(companyId: string, userId: string | null, now = new Date()): Promise<VendorWorkspaceDashboard> {
  let catalogError: string | null = null;
  const [context, catalog, user, reviewVotes] = await Promise.all([
    getVendorCompanyContext(companyId),
    // vendor-hub-reader box (2026-10-12): a failed catalog is logged and surfaced, not
    // read as an empty one (which the page showed as "0 firm reviews on file").
    getVendorProductInsightCatalog(companyId).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      catalogError = message;
      recordPatDiagnostic({
        area: "vendor_product",
        level: "error",
        status: "error",
        summary: "Vendor product insight catalog failed to build for the workspace dashboard.",
        details: { companyId, message: message.slice(0, 300) },
      });
      return [] as VendorProductInsightSnapshot[];
    }),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { lastLoginAt: true } }) : Promise.resolve(null),
    getVendorFirmReviewVotes(companyId),
  ]);
  const byProduct = new Map(catalog.map((snapshot) => [snapshot.product.id, snapshot]));
  const products = context.products.map((product) => {
    const snapshot = byProduct.get(product.id);
    const points = snapshot && snapshot.divergence.points !== null ? Math.round(snapshot.divergence.points) : null;
    const hot = !!snapshot && points !== null && !snapshot.divergence.belowFloor && Math.abs(points) >= 10;
    return {
      id: product.id,
      name: product.name,
      final: snapshot?.vendorAssessmentStatus.completed ?? false,
      firmReviews: snapshot?.firmReviewed.assessmentCount ?? 0,
      divergenceLabel: snapshot?.divergence.label ?? "No firm reviews yet",
      selfReported: snapshot?.vendorSelfReported.latestScore ?? null,
      firmReviewed: snapshot?.firmReviewed.averageScore ?? null,
      divergencePoints: points,
      divergenceTone: (points === null ? "muted" : hot ? "amber" : "positive") as "positive" | "amber" | "muted",
      gapLabel: snapshot ? buildVendorProductGapCallout(snapshot).magnitudeLabel : null,
    };
  });
  const divergences = catalog
    .filter((snapshot) => snapshot.divergence.points !== null && !snapshot.divergence.belowFloor)
    .map((snapshot) => ({ productId: snapshot.product.id, productName: snapshot.product.name, points: Math.round(snapshot.divergence.points as number), label: snapshot.divergence.label }))
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  const mostReviewed = [...catalog].sort((a, b) => b.firmReviewed.assessmentCount - a.firmReviewed.assessmentCount)[0] ?? null;
  const since = user?.lastLoginAt ?? null;
  const productIds = context.products.map((product) => product.id);
  const [firmReviewsReceived, readoutsRefreshed] =
    since && productIds.length
      ? await Promise.all([
          prisma.surveySubmission.count({ where: { createdAt: { gte: since }, Subject: { productId: { in: productIds } }, NOT: { companyId } } }),
          prisma.productMaturitySnapshot.count({ where: { productId: { in: productIds }, computedAt: { gte: since } } }),
        ])
      : [0, 0];
  const cutoff = quarterCutoff(now);
  const reviewingFirms = productIds.length
    ? await prisma.surveySubmission.findMany({
        where: { Subject: { productId: { in: productIds } }, NOT: { companyId } },
        distinct: ["companyId"],
        select: { companyId: true },
      })
    : [];
  const firmsReviewing = new Set(reviewingFirms.map((row) => row.companyId));
  return {
    companyName: context.company?.name ?? "Vendor",
    productsDeclared: context.products.length,
    productsFinal: products.filter((product) => product.final).length,
    firmReviewsOnFile: reviewVotes.total,
    catalogError,
    largestDivergence: divergences[0] ?? null,
    nextBriefing: {
      dateLabel: cutoff.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
      firmsReviewing: firmsReviewing.size,
    },
    latestReadout: mostReviewed
      ? {
          productId: mostReviewed.product.id,
          productName: mostReviewed.product.name,
          firmReviews: mostReviewed.firmReviewed.assessmentCount,
          selfReported: mostReviewed.vendorSelfReported.latestScore,
          firmReviewed: mostReviewed.firmReviewed.averageScore,
          // R34: opens the product's first Pro readout in the drawer on the product insight page.
          href: `/vendor/product-insight/${mostReviewed.product.id}?readout=current-product-fit`,
        }
      : null,
    sinceLastVisit: {
      sinceLabel: since ? since.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
      firmReviewsReceived,
      readoutsRefreshed,
    },
    products,
  };
}
