import { applyRepoEnv } from "@/lib/env/repoEnv";
import { createHash } from "node:crypto";
import { maturityTier, MATURITY_SNAPSHOT_VERSION } from "@/lib/firmMaturity";

/**
 * Demo backfill of ProductMaturitySnapshot history with VARIED trajectories, so
 * the hybrid Elite depth Trend pane shows a real, moving line for demo products
 * (which have no natural multi-point review history). Deterministic per product:
 * a rising / falling / flat / volatile shape that LANDS on the product's current
 * firm-reviewed strength — so the newest point matches the live cohort number.
 * Idempotent (stable ids). Demo products only; production/pilot build real
 * history from submissions + the monthly rollup.
 *
 *   pnpm seed:demo-product-maturity
 */

const POINTS = 6; // ~6 monthly points

function sid(productId: string, iso: string): string {
  return `pms-demo-${createHash("sha1").update(`${productId}:${iso}`).digest("hex").slice(0, 22)}`;
}

/** Deterministic varied shape ending at `end`; pattern rotates by index. */
function trajectory(end: number, patternIdx: number): number[] {
  const clamp = (v: number) => Math.max(20, Math.min(97, Math.round(v)));
  const pattern = patternIdx % 4;
  const out: number[] = [];
  for (let i = 0; i < POINTS; i += 1) {
    const t = i / (POINTS - 1); // 0..1
    let v: number;
    if (pattern === 0) v = end - 14 * (1 - t); // rising: starts ~14 below, climbs to end
    else if (pattern === 1) v = end + 12 * (1 - t); // falling: starts ~12 above, declines to end
    else if (pattern === 2) v = end + (i % 2 === 0 ? -2 : 2); // flat: small noise around end
    else v = end + [8, -6, 5, -4, 3, 0][i]!; // volatile: swings, lands on end
    out.push(clamp(v));
  }
  out[out.length - 1] = clamp(end); // newest point == current strength
  return out;
}

function stdev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  const { computeProductAlignmentIndex } = await import("@/lib/productMaturity");

  const products = await prisma.product.findMany({
    where: { Company: { is: { dataBoundary: "DEMO" } } },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const now = new Date();
  let withHistory = 0;
  let snapshots = 0;

  for (let idx = 0; idx < products.length; idx += 1) {
    const productId = products[idx]!.id;
    const end = await computeProductAlignmentIndex(prisma, productId);
    if (end === null) continue; // no firm-reviewed evidence → no trajectory (honest)
    withHistory += 1;

    const series = trajectory(end, idx);
    const points = series.map((score, i) => {
      const at = new Date(now.getFullYear(), now.getMonth() - (POINTS - 1 - i), 15);
      return { at, score };
    });

    for (const p of points) {
      const tier = maturityTier(p.score);
      const id = sid(productId, p.at.toISOString());
      await prisma.productMaturitySnapshot.upsert({
        where: { id },
        create: {
          id,
          productId,
          score: p.score,
          tier: tier.tier,
          bandMin: tier.bandMin,
          bandMax: tier.bandMax,
          version: MATURITY_SNAPSHOT_VERSION,
          computedAt: p.at,
        },
        update: { score: p.score, tier: tier.tier, bandMin: tier.bandMin, bandMax: tier.bandMax, computedAt: p.at },
      });
      snapshots += 1;
    }

    // index (current) + momentum (from the generated series)
    const last = points[points.length - 1]!;
    const lastTier = maturityTier(last.score);
    await prisma.productMaturityIndex.upsert({
      where: { productId_version: { productId, version: MATURITY_SNAPSHOT_VERSION } },
      create: { id: `pmi-${productId}`, productId, score: last.score, tier: lastTier.tier, bandMin: lastTier.bandMin, bandMax: lastTier.bandMax, version: MATURITY_SNAPSHOT_VERSION },
      update: { score: last.score, tier: lastTier.tier, bandMin: lastTier.bandMin, bandMax: lastTier.bandMax, computedAt: last.at },
    });

    const deltas = series.slice(1).map((v, i) => v - series[i]!);
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const vol = stdev(deltas);
    const trend = avgDelta > 1.5 ? "UP" : avgDelta < -1.5 ? "DOWN" : "FLAT";
    const velocity = vol > 5 ? "VOLATILE" : "STABLE";
    await prisma.productMaturityMomentum.upsert({
      where: { productId_version: { productId, version: MATURITY_SNAPSHOT_VERSION } },
      create: { id: `pmm-${productId}`, productId, avgDelta, volatility: vol, trend, velocity, version: MATURITY_SNAPSHOT_VERSION },
      update: { avgDelta, volatility: vol, trend, velocity, computedAt: last.at },
    });
  }

  console.log(`Demo product maturity: ${withHistory} of ${products.length} demo products seeded with a trajectory · ${snapshots} snapshots.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
