import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";

/**
 * Demo swap events for the two Elite vendor accounts (data only, preview).
 * Modelled on scripts/seed-demo-swaps.ts, but ADDITIVE: nothing is deleted.
 *
 * For every product of the vendor companies behind the two vendor-elite accounts,
 * DEMO-boundary SandboxSwapEvent rows dated within the last 90 days, from firms in
 * that vendor's own ecosystem only: 14 to 22 swap-ins and 6 to 11 swap-outs per
 * vendor, spread across at least four categories and three products, with one
 * "hero" product carrying the largest swap-in share so it is the most-swapped and
 * net motion (in minus out) is clearly positive. The Demand Signals reader
 * (lib/eliteInsightsV2 buildVendorDemandSignals) keys swap-ins on vendorInId and
 * swap-outs on productOutId, both within 90 days.
 *
 *   DATABASE_URL=... node --import tsx scripts/demo/seed-demo-swaps-vendor-elite.ts [--apply]
 */
const APPLY = process.argv.includes("--apply");
const EMAILS = ["cameron+vendor-elite@garrettandgarrett.info", "lesliegarrettphd+vendor-elite@gmail.com"];
const DAY = 24 * 60 * 60 * 1000;
const IN_TARGETS = [18, 20];
const OUT_TARGETS = [8, 9];

type Product = { id: string; name: string; category: string | null };
type Planned = { productId: string; productName: string; category: string; side: "in" | "out"; firmId: string; createdAt: Date };

function offsetDays(seq: number, salt: number): number {
  return 2 + ((seq * 7 + salt * 3) % 84); // 2..85 days back, always inside the 90-day window
}

async function main() {
  console.log(`\n================ DEMO SWAPS, VENDOR ELITE — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  const users = await prisma.user.findMany({ where: { email: { in: EMAILS } }, select: { email: true, companyId: true } });
  for (const user of users) console.log(`account ${user.email} -> company ${user.companyId ?? "(none)"}`);
  const companyIds = [...new Set(users.map((user) => user.companyId).filter((id): id is string => Boolean(id)))];
  const now = Date.now();
  let totalCreated = 0;

  for (const [vendorIndex, companyId] of companyIds.entries()) {
    const vendor = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, dataBoundary: true, Product: { select: { id: true, name: true, category: true }, orderBy: { name: "asc" } } },
    });
    if (!vendor) continue;
    const ecosystem = await prisma.ecosystem.findUnique({
      where: { vendorCompanyId: companyId },
      select: { id: true, name: true, EcosystemFirm: { select: { FirmCompany: { select: { id: true, name: true } } }, orderBy: { FirmCompany: { name: "asc" } } } },
    });
    const firms = ecosystem?.EcosystemFirm.map((entry) => entry.FirmCompany) ?? [];
    const products: Product[] = vendor.Product;
    const categories = [...new Set(products.map((product) => product.category ?? "Uncategorized"))];
    console.log(`\nvendor ${vendor.name} (${vendor.id}, ${vendor.dataBoundary}): ${products.length} products in ${categories.length} categories; ecosystem ${ecosystem?.name ?? "(none)"} with ${firms.length} firms`);
    for (const product of products) console.log(`  product ${product.name} | ${product.category ?? "Uncategorized"}`);
    if (firms.length === 0 || products.length < 3 || categories.length < 4) {
      console.log(`  SKIP: needs an ecosystem with firms, 3+ products and 4+ categories`);
      continue;
    }
    const existingIn = await prisma.sandboxSwapEvent.count({ where: { vendorInId: companyId, createdAt: { gte: new Date(now - 90 * DAY) } } });
    const existingOut = await prisma.sandboxSwapEvent.count({ where: { productOutId: { in: products.map((product) => product.id) }, createdAt: { gte: new Date(now - 90 * DAY) } } });
    console.log(`  existing rows in the window: ${existingIn} in, ${existingOut} out (kept)`);

    // Hero: the first product of the first category carries the largest swap-in share.
    const hero = products[0];
    const others = products.filter((product) => product.id !== hero.id);
    const inTarget = IN_TARGETS[vendorIndex % IN_TARGETS.length];
    const outTarget = OUT_TARGETS[vendorIndex % OUT_TARGETS.length];
    const heroIns = Math.ceil(inTarget * 0.35);
    const planned: Planned[] = [];
    let seq = 0;
    const push = (product: Product, side: "in" | "out") => {
      const firm = firms[(seq + (side === "out" ? 2 : 0)) % firms.length];
      planned.push({
        productId: product.id,
        productName: product.name,
        category: product.category ?? "Uncategorized",
        side,
        firmId: firm.id,
        createdAt: new Date(now - offsetDays(seq, vendorIndex) * DAY),
      });
      seq += 1;
    };
    for (let i = 0; i < heroIns; i += 1) push(hero, "in");
    for (let i = 0; i < inTarget - heroIns; i += 1) push(others[i % others.length], "in");
    // Swap-outs: never the hero; round-robin over the other products (3+ categories).
    for (let i = 0; i < outTarget; i += 1) push(others[(i + 1) % others.length], "out");

    const byCategory = new Map<string, { in: number; out: number }>();
    const byProduct = new Map<string, number>();
    for (const row of planned) {
      const bucket = byCategory.get(row.category) ?? { in: 0, out: 0 };
      bucket[row.side] += 1;
      byCategory.set(row.category, bucket);
      if (row.side === "in") byProduct.set(row.productName, (byProduct.get(row.productName) ?? 0) + 1);
    }
    const ins = planned.filter((row) => row.side === "in").length;
    const outs = planned.filter((row) => row.side === "out").length;
    console.log(`  planned: ${ins} swap-ins, ${outs} swap-outs, net +${ins - outs}; categories with ins ${[...byCategory.values()].filter((b) => b.in > 0).length}, with outs ${[...byCategory.values()].filter((b) => b.out > 0).length}`);
    for (const [category, bucket] of byCategory) console.log(`    ${category}: in ${bucket.in}, out ${bucket.out}`);
    const topProduct = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];
    console.log(`  most-swapped product: ${topProduct[0]} (${topProduct[1]} swap-ins)`);

    if (APPLY) {
      const rows = planned.map((row, index) => ({
        id: randomUUID(),
        companyId: row.firmId,
        productInId: row.side === "in" ? row.productId : `demo-swap-in-elite-${vendorIndex}-${index}`,
        productOutId: row.side === "out" ? row.productId : null,
        vendorInId: row.side === "in" ? vendor.id : null,
        boundary: "DEMO",
        createdAt: row.createdAt,
      }));
      const result = await prisma.sandboxSwapEvent.createMany({ data: rows });
      totalCreated += result.count;
      console.log(`  applied: ${result.count} rows created`);
    }
  }
  console.log(`\n${APPLY ? `created ${totalCreated} rows` : "dry run; re-run with --apply to write"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
