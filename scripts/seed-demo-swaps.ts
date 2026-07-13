import { randomUUID } from "node:crypto";
import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * Seed demo Sandbox swap events (Elite Insights v2, V2 Demand Signals). Gives
 * every DEMO vendor a populated — but honestly "early signal" bounded — demand
 * state so the vendor Demand Signals card renders full-looking on demo accounts.
 * Boundary is DEMO on every row, so these never leak into a real vendor's signal;
 * the real-account early-signal floor is unchanged. Idempotent: clears prior
 * demo-boundary events first. Runs after demo-expand.
 *
 * Swap VOLUME is utility-varied per CATEGORY (some capability areas are hotter
 * than others) and per REGION (from the vendor's " · Region" suffix), so the
 * Demand Signals surface shows a real market shape, not a flat count.
 *
 * Swap TIMING is shaped so each category carries a real TREND: events land in
 * BOTH the current 90-day window and the prior one, with the ratio set by a
 * per-category trend shape (rising / flat / falling). The Demand Signals engine
 * compares the two windows, so the per-category arrows differ across categories
 * instead of all reading "up". DEMO boundary only — real accounts unaffected.
 */

/** Deterministic per-category demand heat (swaps-in base). Higher = hotter area. */
const CATEGORY_HEAT: Record<string, number> = {
  "Ledger & Close": 8,
  "Payments & Billing": 6,
  "Tax & Compliance": 7,
  "Reporting & Advisory": 5,
  "Workflow & Practice Ops": 6,
  "Client & Documents": 4,
  "Payroll & Workforce": 3,
};
/** Per-category demand trend: how the prior window compares to the current one. */
const CATEGORY_TREND: Record<string, "rising" | "flat" | "falling"> = {
  "Ledger & Close": "rising",
  "Payments & Billing": "flat",
  "Tax & Compliance": "rising",
  "Reporting & Advisory": "falling",
  "Workflow & Practice Ops": "flat",
  "Client & Documents": "falling",
  "Payroll & Workforce": "rising",
};
/** Per-region demand multiplier (from the N1 " · Region" name suffix). */
const REGION_MULT: Record<string, number> = {
  National: 1.2,
  East: 1.0,
  Central: 0.9,
  West: 1.1,
  South: 0.8,
  Pacific: 0.7,
};

function categoryHeat(category: string | null): number {
  return CATEGORY_HEAT[category ?? ""] ?? 4;
}
function regionMultiplier(name: string): number {
  const region = /·\s*([A-Za-z]+)\s*$/.exec(name)?.[1] ?? "";
  return REGION_MULT[region] ?? 1;
}
/** Prior-window volume for a current-window count, per the category trend shape.
 *  rising → current > prior; falling → current < prior; flat → ~equal. */
function priorWindowCount(currentCount: number, category: string | null): number {
  const shape = CATEGORY_TREND[category ?? ""] ?? "flat";
  if (shape === "rising") return Math.round(currentCount * 0.5);
  if (shape === "falling") return Math.round(currentCount * 1.7);
  return currentCount;
}

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");

  const [vendors, firms] = await Promise.all([
    prisma.company.findMany({
      where: { type: "VENDOR", dataBoundary: "DEMO" },
      select: { id: true, name: true, Product: { select: { id: true, category: true } } },
    }),
    prisma.company.findMany({ where: { type: "FIRM", dataBoundary: "DEMO" }, select: { id: true }, take: 12 }),
  ]);
  if (firms.length === 0) {
    console.log("No demo firms — skipping swap seed.");
    return;
  }

  await prisma.sandboxSwapEvent.deleteMany({ where: { boundary: "DEMO" } });

  const base = Date.UTC(2026, 6, 1); // stable anchor (avoids Date.now() nondeterminism)
  const DAY = 24 * 60 * 60 * 1000;
  // Current-window events land within ~0-45 days of the anchor (recent); prior-
  // window events land ~110-155 days back, so the engine's two-window compare
  // (Date.now() ± 90d, viewed near the anchor) sees them on opposite sides.
  const currentOffset = (i: number, pi: number) => (i * 3 + pi) % 45;
  const priorOffset = (i: number, pi: number) => 110 + ((i * 4 + pi * 2) % 42);
  let created = 0;
  for (const [vi, vendor] of vendors.entries()) {
    const products = vendor.Product;
    if (products.length === 0) continue;
    const regionMult = regionMultiplier(vendor.name);

    for (const [pi, product] of products.entries()) {
      // swaps IN: category heat × region, ±1 per-product jitter. Products in
      // hotter categories / stronger regions get more demand.
      const inCount = Math.max(
        1,
        Math.round(categoryHeat(product.category) * regionMult) + ((vi + pi) % 3) - 1
      );
      const inPrior = priorWindowCount(inCount, product.category);
      const emitIn = async (offset: number, seq: number) => {
        const firm = firms[(vi + pi + seq) % firms.length]!;
        await prisma.sandboxSwapEvent.create({
          data: {
            id: randomUUID(),
            companyId: firm.id,
            productInId: product.id,
            productOutId: null,
            vendorInId: vendor.id,
            boundary: "DEMO",
            createdAt: new Date(base - offset * DAY),
          },
        });
        created += 1;
      };
      for (let i = 0; i < inCount; i += 1) await emitIn(currentOffset(i, pi), i);
      for (let i = 0; i < inPrior; i += 1) await emitIn(priorOffset(i, pi), i + inCount);

      // swaps OUT: colder categories / weaker regions show more churn (inverse).
      const outCount = Math.max(0, Math.round((9 - categoryHeat(product.category)) * regionMult) - 3);
      const outPrior = priorWindowCount(outCount, product.category);
      const emitOut = async (offset: number, seq: number) => {
        const firm = firms[(vi + pi + seq + 2) % firms.length]!;
        await prisma.sandboxSwapEvent.create({
          data: {
            id: randomUUID(),
            companyId: firm.id,
            productInId: `demo-swap-in-${vi}-${pi}-${seq}`,
            productOutId: product.id,
            vendorInId: null,
            boundary: "DEMO",
            createdAt: new Date(base - offset * DAY),
          },
        });
        created += 1;
      };
      for (let i = 0; i < outCount; i += 1) await emitOut(currentOffset(i, pi), i);
      for (let i = 0; i < outPrior; i += 1) await emitOut(priorOffset(i, pi), i + outCount);
    }
  }
  console.log(`Seeded ${created} demo Sandbox swap events across ${vendors.length} demo vendors (category+region+trend varied).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
