import { randomUUID } from "node:crypto";
import { DataBoundary, type PrismaClient } from "@prisma/client";
import { FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { MATURITY_SNAPSHOT_VERSION, maturityTier } from "@/lib/firmMaturity";

/**
 * Product maturity + trajectory writer — the per-product mirror of firmMaturity
 * (F3). Turns a product's firm-reviewed scores into a strength index and appends
 * a ProductMaturitySnapshot so the Elite depth Trend pane charts REAL history
 * over time for production/pilot products. Demo products are untouched (their
 * seeded history stands). Nothing here fabricates history — one snapshot per
 * write event.
 */

type ProductMaturityClient = Pick<
  PrismaClient,
  "surveySubmission" | "productMaturityIndex" | "productMaturitySnapshot" | "product"
>;

/** Mean of a product's firm-reviewed strength (0–100), or null when none exist. */
export async function computeProductAlignmentIndex(
  client: Pick<PrismaClient, "surveySubmission">,
  productId: string
): Promise<number | null> {
  const reviews = await client.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      SurveyModule: { is: { key: FIRM_PRODUCT_MODULE_KEY } },
      Subject: { is: { productId } },
    }),
    select: { score: true },
  });
  const scores = reviews
    .map((r) => r.score)
    .filter((s): s is number => typeof s === "number");
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Compute + persist the product's maturity index and APPEND a snapshot. Skips
 * DEMO products (their vendor is a DEMO company). Accepts a tx client so it
 * composes into the submit transaction. Returns the written score, or null when
 * skipped (no evidence / demo).
 */
export async function writeProductMaturitySnapshot(
  client: ProductMaturityClient,
  productId: string,
  options?: { at?: Date; skipIfDemo?: boolean }
): Promise<{ score: number } | null> {
  const skipIfDemo = options?.skipIfDemo ?? true;
  if (skipIfDemo) {
    const product = await client.product.findUnique({
      where: { id: productId },
      select: { Company: { select: { dataBoundary: true } } },
    });
    if (product?.Company?.dataBoundary === DataBoundary.DEMO) return null; // demo history is seeded, untouched
  }

  const score = await computeProductAlignmentIndex(client, productId);
  if (score === null) return null;
  const tier = maturityTier(score);
  const computedAt = options?.at ?? new Date();

  await client.productMaturityIndex.upsert({
    where: { productId_version: { productId, version: MATURITY_SNAPSHOT_VERSION } },
    create: {
      id: randomUUID(),
      productId,
      score,
      tier: tier.tier,
      bandMin: tier.bandMin,
      bandMax: tier.bandMax,
      version: MATURITY_SNAPSHOT_VERSION,
    },
    update: { score, tier: tier.tier, bandMin: tier.bandMin, bandMax: tier.bandMax, computedAt },
  });
  await client.productMaturitySnapshot.create({
    data: {
      id: randomUUID(),
      productId,
      score,
      tier: tier.tier,
      bandMin: tier.bandMin,
      bandMax: tier.bandMax,
      version: MATURITY_SNAPSHOT_VERSION,
      computedAt,
    },
  });
  return { score };
}
