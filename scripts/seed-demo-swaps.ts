import { randomUUID } from "node:crypto";
import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * Seed demo Sandbox swap events (Elite Insights v2, V2 Demand Signals). Gives
 * every DEMO vendor a populated — but honestly "early signal" bounded — demand
 * state so the vendor Demand Signals card renders full-looking on demo accounts.
 * Boundary is DEMO on every row, so these never leak into a real vendor's signal.
 * Idempotent: clears prior demo-boundary events first. Runs after demo-expand.
 */
async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");

  const [vendors, firms] = await Promise.all([
    prisma.company.findMany({
      where: { type: "VENDOR", dataBoundary: "DEMO" },
      select: { id: true, Product: { select: { id: true } } },
    }),
    prisma.company.findMany({ where: { type: "FIRM", dataBoundary: "DEMO" }, select: { id: true }, take: 12 }),
  ]);
  if (firms.length === 0) {
    console.log("No demo firms — skipping swap seed.");
    return;
  }

  await prisma.sandboxSwapEvent.deleteMany({ where: { boundary: "DEMO" } });

  let created = 0;
  for (const [vi, vendor] of vendors.entries()) {
    const products = vendor.Product;
    if (products.length === 0) continue;
    // deterministic in/out counts per vendor so the demo is stable but varied
    const inCount = 3 + (vi % 5); // 3..7 swaps IN
    const outCount = vi % 3; // 0..2 swaps OUT
    for (let i = 0; i < inCount; i += 1) {
      const product = products[i % products.length];
      const firm = firms[(vi + i) % firms.length];
      await prisma.sandboxSwapEvent.create({
        data: {
          id: randomUUID(),
          companyId: firm.id,
          productInId: product.id,
          productOutId: null,
          vendorInId: vendor.id,
          boundary: "DEMO",
          createdAt: new Date(Date.now() - i * 6 * 24 * 60 * 60 * 1000),
        },
      });
      created += 1;
    }
    for (let i = 0; i < outCount; i += 1) {
      const product = products[i % products.length];
      const firm = firms[(vi + i + 2) % firms.length];
      await prisma.sandboxSwapEvent.create({
        data: {
          id: randomUUID(),
          companyId: firm.id,
          productInId: `demo-swap-in-${vi}-${i}`,
          productOutId: product.id,
          vendorInId: null,
          boundary: "DEMO",
          createdAt: new Date(Date.now() - i * 9 * 24 * 60 * 60 * 1000),
        },
      });
      created += 1;
    }
  }
  console.log(`Seeded ${created} demo Sandbox swap events across ${vendors.length} demo vendors.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
