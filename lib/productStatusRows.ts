import type { FirmProductCatalogItem } from "@/lib/firmPat";
import { getVendorProductInsightSnapshotsByProductId, type VendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";
import type { ProductStatusRow } from "@/app/components/products/ProductStatusStrip";

/**
 * Depth box 7 (2026-09-09): rows for the per-product status strip on both
 * product lists. Needs-attention first: a product with no completed vendor
 * assessment, no firm review on file, or a divergence above the floor sorts
 * to the top; ties keep the list's own order.
 */
type VendorEntry = {
  product: { id: string; name: string; vendorName: string };
  status: { completed: boolean; latestSubmissionId: string | null; latestSubmittedAt: Date | null; utilityKeys: string[] };
};

function divergenceChip(snapshot: VendorProductInsightSnapshot | undefined): ProductStatusRow["divergence"] {
  if (!snapshot || snapshot.divergence.points === null) return { label: snapshot?.divergence.label ?? "No firm reviews yet", tone: "muted", points: null };
  const points = Math.round(snapshot.divergence.points);
  const hot = !snapshot.divergence.belowFloor && Math.abs(points) >= 10;
  return { label: snapshot.divergence.label, tone: hot ? "amber" : "positive", points };
}

function latest(...dates: (Date | null | undefined)[]): Date | null {
  return dates.reduce<Date | null>((best, value) => (value && (!best || value > best) ? value : best), null);
}

export async function buildVendorProductStatusRows(vendorCompanyId: string, entries: VendorEntry[]): Promise<ProductStatusRow[]> {
  const snapshots = await getVendorProductInsightSnapshotsByProductId(vendorCompanyId).catch(() => ({}) as Record<string, VendorProductInsightSnapshot>);
  const rows = entries.map((entry): ProductStatusRow => {
    const snapshot = (snapshots as Record<string, VendorProductInsightSnapshot | undefined>)[entry.product.id];
    const divergence = divergenceChip(snapshot);
    const reviews = snapshot?.firmReviewed.assessmentCount ?? 0;
    const reasons: string[] = [];
    if (!entry.status.completed) reasons.push(entry.status.utilityKeys.length ? "vendor assessment not final" : "no features declared");
    if (entry.status.completed && reviews === 0) reasons.push("no firm review on file");
    if (divergence.tone === "amber") reasons.push("divergence above the floor");
    return {
      id: entry.product.id,
      name: entry.product.name,
      vendorName: entry.product.vendorName,
      href: `/vendor/product-assessment/${entry.product.id}`,
      ctaLabel: entry.status.completed ? "Open assessment" : "Continue assessment",
      statusLabel: entry.status.completed ? "Final" : entry.status.latestSubmissionId ? "In progress" : entry.status.utilityKeys.length ? "Ready" : "Needs features",
      statusTone: entry.status.completed ? "positive" : entry.status.latestSubmissionId ? "amber" : "muted",
      features: entry.status.utilityKeys.length,
      reviewsOnFile: reviews,
      lastUpdated: latest(entry.status.latestSubmittedAt, snapshot?.latestUpdatedAt, snapshot?.firmReviewed.latestSubmittedAt),
      divergence,
      needsAttention: reasons.length > 0,
      attentionReason: reasons.length ? reasons.join(" · ") : null,
    };
  });
  return [...rows.filter((row) => row.needsAttention), ...rows.filter((row) => !row.needsAttention)];
}

export async function buildFirmProductStatusRows(products: FirmProductCatalogItem[]): Promise<ProductStatusRow[]> {
  const vendorIds = Array.from(new Set(products.map((product) => product.vendorCompanyId).filter((id): id is string => Boolean(id))));
  const snapshotsByVendor = await Promise.all(
    vendorIds.map(async (vendorId) => [vendorId, await getVendorProductInsightSnapshotsByProductId(vendorId).catch(() => ({}))] as const)
  );
  const snapshotByProduct = new Map<string, VendorProductInsightSnapshot>();
  for (const [, snapshots] of snapshotsByVendor) {
    for (const [productId, snapshot] of Object.entries(snapshots as Record<string, VendorProductInsightSnapshot>)) {
      snapshotByProduct.set(productId, snapshot);
    }
  }
  const rows = products.map((product): ProductStatusRow => {
    const snapshot = snapshotByProduct.get(product.id);
    const divergence = divergenceChip(snapshot);
    const reviewed = product.latestFirmReviewSubmittedAt !== null;
    const reasons: string[] = [];
    if (!product.reviewAvailable) reasons.push("vendor assessment not final");
    if (product.reviewAvailable && !reviewed) reasons.push("your review is not on file");
    if (divergence.tone === "amber") reasons.push("divergence above the floor");
    return {
      id: product.id,
      name: product.name,
      vendorName: product.vendorName,
      href: `/firm/product-assessments/${product.id}`,
      ctaLabel: reviewed ? "Open review" : product.reviewAvailable ? "Start review" : "View",
      statusLabel: product.firmReviewStatusLabel,
      statusTone: reviewed ? "positive" : product.reviewAvailable ? "amber" : "muted",
      features: product.utilityKeys.length,
      reviewsOnFile: snapshot?.firmReviewed.assessmentCount ?? 0,
      lastUpdated: latest(product.latestFirmReviewSubmittedAt, product.firmReviewDraftUpdatedAt, product.vendorAssessmentCompletedAt),
      divergence,
      needsAttention: reasons.length > 0,
      attentionReason: reasons.length ? reasons.join(" · ") : null,
    };
  });
  return [...rows.filter((row) => row.needsAttention), ...rows.filter((row) => !row.needsAttention)];
}
