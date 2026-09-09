import prisma from "@/lib/prisma";
import { quarterCutoff } from "@/lib/consultantFreshness";
import { getVendorCompanyContext } from "@/lib/vendorPat";
import { getVendorProductInsightCatalog, type VendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

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
  firmReviewsOnFile: number;
  largestDivergence: { productId: string; productName: string; points: number; label: string } | null;
  nextBriefing: { dateLabel: string; firmsReviewing: number };
  latestReadout: { productId: string; productName: string; firmReviews: number; selfReported: number | null; firmReviewed: number | null; href: string } | null;
  sinceLastVisit: { sinceLabel: string | null; firmReviewsReceived: number; readoutsRefreshed: number };
  products: { id: string; name: string; final: boolean; firmReviews: number; divergenceLabel: string }[];
};

export async function getVendorWorkspaceDashboard(companyId: string, userId: string | null, now = new Date()): Promise<VendorWorkspaceDashboard> {
  const [context, catalog, user] = await Promise.all([
    getVendorCompanyContext(companyId),
    getVendorProductInsightCatalog(companyId).catch(() => [] as VendorProductInsightSnapshot[]),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { lastLoginAt: true } }) : Promise.resolve(null),
  ]);
  const byProduct = new Map(catalog.map((snapshot) => [snapshot.product.id, snapshot]));
  const products = context.products.map((product) => {
    const snapshot = byProduct.get(product.id);
    return {
      id: product.id,
      name: product.name,
      final: snapshot?.vendorAssessmentStatus.completed ?? false,
      firmReviews: snapshot?.firmReviewed.assessmentCount ?? 0,
      divergenceLabel: snapshot?.divergence.label ?? "No firm reviews yet",
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
    firmReviewsOnFile: catalog.reduce((sum, snapshot) => sum + snapshot.firmReviewed.assessmentCount, 0),
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
          href: `/vendor/product-insight/${mostReviewed.product.id}`,
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
