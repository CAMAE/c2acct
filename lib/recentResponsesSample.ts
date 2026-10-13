// box-c (R65, item 7a): pure and dependency-free, so the client-side responses panel can import it
// without pulling the server-only ecosystem module (and the registry's node:fs behind it) into the bundle.
/**
 * box-c (R65, item 7a): the "Recent firm responses" panel showed the first ten rows,
 * which on production were ten quotes from one firm on one product. Sample across
 * firms and products instead: newest first, at most `perFirm` per firm and at most
 * `perProduct` per product, up to `max`. Pure; the input is already newest-first.
 */
export function sampleRecentResponses<T extends { firmCompanyId: string; productId: string }>(
  responses: readonly T[],
  limits: { max: number; perFirm: number; perProduct: number | null }
): T[] {
  const perFirm = new Map<string, number>();
  const perProduct = new Map<string, number>();
  const out: T[] = [];
  for (const response of responses) {
    if (out.length >= limits.max) break;
    const firmCount = perFirm.get(response.firmCompanyId) ?? 0;
    const productCount = perProduct.get(response.productId) ?? 0;
    if (firmCount >= limits.perFirm) continue;
    if (limits.perProduct !== null && productCount >= limits.perProduct) continue;
    perFirm.set(response.firmCompanyId, firmCount + 1);
    perProduct.set(response.productId, productCount + 1);
    out.push(response);
  }
  return out;
}

