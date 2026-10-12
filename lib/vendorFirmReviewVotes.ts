import prisma from "@/lib/prisma";
import { latestFinalPerFirm } from "@/lib/assessmentCore";
import { FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { getVendorScopedFirms } from "@/lib/tenancy";

/**
 * vendor-hub-reader box (2026-10-12, R60 one reader per entity): the firm reviews
 * on file for one vendor, counted the one way the platform counts them — the latest
 * FINAL per (firm, product) from the vendor's scoped firms (enforce-core ruling 2,
 * lib/assessmentCore latestFinalPerFirm). The vendor hub's "firm reviews on file"
 * and the Review refresh board both read this; before the box the hub summed the
 * completed-product catalog (0 when every final read as incomplete) while the board
 * counted raw submissions (97 for the same vendor).
 *
 * Every active product is listed, including products whose own vendor assessment
 * is incomplete: a review on file is on file whether or not the vendor has finished
 * its side. Vote dates are newest first.
 */
export type VendorProductReviewVotes = {
  productId: string;
  productName: string;
  /** createdAt of each counting review (one per firm), newest first. */
  voteDates: Date[];
};

export type VendorFirmReviewVotes = {
  products: VendorProductReviewVotes[];
  /** Sum of votes across products. */
  total: number;
};

export async function getVendorFirmReviewVotes(vendorCompanyId: string): Promise<VendorFirmReviewVotes> {
  const [products, firmModule] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: vendorCompanyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.surveyModule.findUnique({ where: { key: FIRM_PRODUCT_MODULE_KEY }, select: { id: true } }),
  ]);
  if (products.length === 0 || !firmModule) {
    return { products: products.map((product) => ({ productId: product.id, productName: product.name, voteDates: [] })), total: 0 };
  }

  const productIds = products.map((product) => product.id);
  const scopedFirmIds = await getVendorScopedFirms(vendorCompanyId);
  const reviews = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      moduleId: firmModule.id,
      Subject: { productId: { in: productIds } },
      Company: { type: "FIRM", id: { in: scopedFirmIds } },
    }),
    orderBy: { createdAt: "desc" },
    select: { companyId: true, createdAt: true, Subject: { select: { productId: true } } },
  });

  const votes = latestFinalPerFirm(reviews, {
    firmId: (review) => review.companyId,
    groupKey: (review) => review.Subject?.productId,
    createdAt: (review) => review.createdAt,
  });
  const datesByProduct = new Map<string, Date[]>();
  for (const vote of votes) {
    const productId = vote.Subject?.productId;
    if (!productId) continue;
    const dates = datesByProduct.get(productId) ?? [];
    dates.push(vote.createdAt);
    datesByProduct.set(productId, dates);
  }
  const rows = products.map((product) => ({
    productId: product.id,
    productName: product.name,
    voteDates: (datesByProduct.get(product.id) ?? []).sort((a, b) => b.getTime() - a.getTime()),
  }));
  return { products: rows, total: rows.reduce((sum, row) => sum + row.voteDates.length, 0) };
}
