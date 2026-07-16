/**
 * 13k Demand-Signals boost — seed SandboxSwapEvent rows for one vendor so its
 * Demand Signals surface shows real swapped-in/out rows + nonzero net motion in
 * the LIVE 90d window (the surface filters on real Date.now()).
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/boost-vendor-swaps.ts meridian
 *
 * Idempotent: stable ids, upsert. createdAt is stamped relative to NOW each run
 * (2–46 days back) so events never age out of the 90d window on re-run. Only
 * writes SandboxSwapEvent (boundary=DEMO). Net motion is engineered positive
 * (more in than out) but both lanes are populated.
 */
import { PrismaClient } from "@prisma/client";
import { stableId } from "@/lib/demoPatEcosystemSeed";

const prisma = new PrismaClient();
const idSubstr = process.argv[2] ?? "meridian";
const IN_COUNT = 12;
const OUT_COUNT = 5;

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  console.log(`\n=== DEMAND-SIGNALS BOOST (${idSubstr}) ===`);
  if (!process.env.DATABASE_URL) { console.log("  ❌ DATABASE_URL unset"); process.exitCode = 1; return; }

  const vendor = await prisma.company.findFirst({
    where: { type: "VENDOR", dataBoundary: "DEMO", OR: [{ id: { contains: idSubstr } }, { name: { contains: idSubstr } }] },
    select: { id: true, name: true },
  });
  if (!vendor) { console.log(`no DEMO vendor matching '${idSubstr}'`); return; }

  const products = await prisma.product.findMany({ where: { companyId: vendor.id }, select: { id: true } });
  if (products.length === 0) { console.log(`vendor ${vendor.name} has no products`); return; }
  // counterparties: other demo vendors' products (for the "replacement" side)
  const others = await prisma.product.findMany({
    where: { companyId: { not: vendor.id }, Company: { dataBoundary: "DEMO", type: "VENDOR" } },
    select: { id: true, companyId: true },
    take: 40,
  });
  const firms = await prisma.company.findMany({ where: { type: "FIRM", dataBoundary: "DEMO", deletedAt: null }, select: { id: true }, take: 40 });
  if (others.length === 0 || firms.length === 0) { console.log("insufficient counterparty products/firms in DEMO pool"); return; }

  const pick = <T>(arr: T[], i: number) => arr[i % arr.length];
  let created = 0;

  // Swapped-IN to this vendor: vendorInId = vendor, productInId = vendor product.
  for (let i = 0; i < IN_COUNT; i += 1) {
    const id = stableId("demo-swap-boost-in", `${vendor.id}-${i}`);
    const data = {
      companyId: pick(firms, i).id,
      productInId: pick(products, i).id,
      productOutId: pick(others, i).id,
      vendorInId: vendor.id,
      boundary: "DEMO",
      createdAt: daysAgo(2 + (i * 37) % 44), // 2..45d, spread across the window
    };
    await prisma.sandboxSwapEvent.upsert({ where: { id }, update: data, create: { id, ...data } });
    created += 1;
  }
  // Swapped-OUT of this vendor: productOutId = vendor product, replaced by another vendor.
  for (let i = 0; i < OUT_COUNT; i += 1) {
    const id = stableId("demo-swap-boost-out", `${vendor.id}-${i}`);
    const other = pick(others, i + 3);
    const data = {
      companyId: pick(firms, i + 5).id,
      productInId: other.id,
      productOutId: pick(products, i).id,
      vendorInId: other.companyId,
      boundary: "DEMO",
      createdAt: daysAgo(3 + (i * 29) % 40),
    };
    await prisma.sandboxSwapEvent.upsert({ where: { id }, update: data, create: { id, ...data } });
    created += 1;
  }

  console.log(`Vendor: ${vendor.name} (${vendor.id})`);
  console.log(`  wrote ${created} swap events (${IN_COUNT} in / ${OUT_COUNT} out → net +${IN_COUNT - OUT_COUNT}) in the last 46d window.`);
  console.log(`  (idempotent — re-running refreshes createdAt to stay in-window.)`);
}

main().catch((e) => { console.error("swap-boost failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
