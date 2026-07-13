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
      for (let i = 0; i < inCount; i += 1) {
        const firm = firms[(vi + pi + i) % firms.length]!;
        await prisma.sandboxSwapEvent.create({
          data: {
            id: randomUUID(),
            companyId: firm.id,
            productInId: product.id,
            productOutId: null,
            vendorInId: vendor.id,
            boundary: "DEMO",
            createdAt: new Date(base - (i * 5 + pi * 2) * DAY),
          },
        });
        created += 1;
      }
      // swaps OUT: colder categories / weaker regions show more churn (inverse).
      const outCount = Math.max(0, Math.round((9 - categoryHeat(product.category)) * regionMult) - 3);
      for (let i = 0; i < outCount; i += 1) {
        const firm = firms[(vi + pi + i + 2) % firms.length]!;
        await prisma.sandboxSwapEvent.create({
          data: {
            id: randomUUID(),
            companyId: firm.id,
            productInId: `demo-swap-in-${vi}-${pi}-${i}`,
            productOutId: product.id,
            vendorInId: null,
            boundary: "DEMO",
            createdAt: new Date(base - (i * 7 + pi * 3) * DAY),
          },
        });
        created += 1;
      }
    }
  }
  console.log(`Seeded ${created} demo Sandbox swap events across ${vendors.length} demo vendors (category+region varied).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
