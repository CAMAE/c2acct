/**
 * READ-ONLY 13k inspector. Calls the REAL surface functions (not a
 * reimplementation) for one vendor and scores them against Cam's acceptance:
 *   BattleCard      — >=15 reviewing firms AND all three lanes (strong/good/weak) non-empty
 *   Category Position — renders (available) with category cells clearing n>=5
 *   Demand Signals  — available, totalIn+totalOut>=5, nonzero net in the live 90d window
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/inspect-vendor-evidence.ts meridian
 *
 * Arg = vendor id/name substring (default "meridian"). Writes nothing.
 */
import { DataBoundary } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getVendorBattleCardData } from "@/lib/battleCard";
import { buildVendorCategoryPosition, buildVendorDemandSignals } from "@/lib/eliteInsightsV2";
import { fitTierKey } from "@/lib/fitHeat";
const idSubstr = process.argv[2] ?? "meridian";

async function main() {
  console.log(`\n=== VENDOR EVIDENCE INSPECTOR (${idSubstr}) — DB ${(process.env.DATABASE_URL || "").replace(/^[^@]*@/, "").replace(/[/?].*$/, "") || "(unset)"} ===`);
  const vendor = await prisma.company.findFirst({
    where: { type: "VENDOR", dataBoundary: "DEMO", OR: [{ id: { contains: idSubstr } }, { name: { contains: idSubstr } }] },
    select: { id: true, name: true },
  });
  if (!vendor) { console.log(`no DEMO vendor matching '${idSubstr}'`); return; }
  console.log(`Vendor: ${vendor.name} (${vendor.id})`);

  // ---- BATTLECARD ----
  const bc = await getVendorBattleCardData(vendor.id);
  const firms = (bc?.rankedFirms ?? []) as Array<{ alignmentDelta: number | null }>;
  const lanes = { strong: 0, good: 0, weak: 0, pending: 0 } as Record<string, number>;
  for (const f of firms) lanes[fitTierKey(f.alignmentDelta)] += 1;
  const reviewing = firms.length;
  const bcPass = reviewing >= 15 && lanes.strong > 0 && lanes.good > 0 && lanes.weak > 0;
  console.log(`\nBATTLECARD: reviewingFirms=${reviewing} | strong=${lanes.strong} good=${lanes.good} weak=${lanes.weak} pending=${lanes.pending}`);
  console.log(`  firmReviewedProductCount=${bc?.firmReviewedProductCount ?? "?"} selfReportedOnly=${bc?.selfReportedOnlyProductCount ?? "?"}`);
  console.log(`  ${bcPass ? "✅" : "❌"} accept: >=15 reviewing AND all three lanes non-empty`);

  // ---- CATEGORY POSITION ----
  const cat = await buildVendorCategoryPosition(prisma, vendor.id, DataBoundary.DEMO);
  const cats = (cat as { categories?: Array<Record<string, unknown>> }).categories ?? [];
  console.log(`\nCATEGORY POSITION: available=${(cat as { available?: boolean }).available} categories=${cats.length}`);
  if (cats[0]) console.log(`  (row keys: ${Object.keys(cats[0]).join(", ")})`);
  let cleared = 0;
  for (const c of cats) {
    const suppressed = Boolean(c.suppressed);
    if (!suppressed) cleared += 1;
    console.log(`  ${suppressed ? "✗" : "✓"} ${String(c.label ?? c.name ?? c.category ?? "?")} n=${String(c.n ?? "?")} suppressed=${suppressed} score=${String(c.score ?? "—")}`);
  }
  // n = number of VENDORS with firm-reviewed products in the category (>=5 to clear).
  // A single-vendor boost cannot raise this — sparse categories need >=5 vendors.
  const catRenders = Boolean((cat as { available?: boolean }).available) && cleared >= 1;
  const catAllClear = catRenders && cats.length > 0 && cleared === cats.length;
  console.log(`  ${catRenders ? "✅" : "❌"} renders (available + >=1 cell); ${catAllClear ? "✅" : "⚠️ "} all cells clear n>=5 vendors (${cleared}/${cats.length}) — suppressed cells are vendor-count-limited, not firm-count`);

  // ---- DEMAND SIGNALS ----
  const dem = await buildVendorDemandSignals(prisma, vendor.id, [DataBoundary.DEMO], { identityAllowed: true }) as Record<string, unknown>;
  console.log(`\nDEMAND SIGNALS: (top keys: ${Object.keys(dem).join(", ")})`);
  const totalIn = Number(dem.totalIn ?? 0);
  const totalOut = Number(dem.totalOut ?? 0);
  const net = totalIn - totalOut;
  console.log(`  available=${dem.available} totalIn=${totalIn} totalOut=${totalOut} net=${net} earlySignal=${dem.earlySignal}`);
  const demPass = Boolean(dem.available) && (totalIn + totalOut) >= 5 && net !== 0;
  console.log(`  ${demPass ? "✅" : "❌"} accept: available, total>=5, nonzero net in 90d`);

  console.log(`\n=== BattleCard ${bcPass ? "✅" : "❌"} · Category ${catAllClear ? "✅ all cells" : catRenders ? "◑ renders (some cells vendor-limited)" : "❌"} · Demand ${demPass ? "✅" : "❌"} ===`);
}

main().catch((e) => { console.error("inspect failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
