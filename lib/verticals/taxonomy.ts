import prisma from "@/lib/prisma";
import { loadVerticalPack } from "./loader";
import type { TaxonomyBucket } from "@prisma/client";

/**
 * Resolve the taxonomy for a vertical. The descriptive taxonomy (vendor
 * categories) lives in the TaxonomyBucket table — the real externalized
 * taxonomy (the spec's "TaxonomyNode"/"AccountingTaxonomyNode" never existed) —
 * filtered by verticalId per the pack's taxonomy filter.
 */
export async function getTaxonomyForVertical(verticalId: string): Promise<TaxonomyBucket[]> {
  const pack = await loadVerticalPack(verticalId);
  if (pack.taxonomy.source !== "db") {
    throw new Error(
      `Vertical Pack "${verticalId}" taxonomy source "${pack.taxonomy.source}" is not supported (db only in v1).`
    );
  }
  const filterVerticalId = pack.taxonomy.filter?.verticalId ?? verticalId;
  return prisma.taxonomyBucket.findMany({
    where: { verticalId: filterVerticalId },
    orderBy: { key: "asc" },
  });
}
