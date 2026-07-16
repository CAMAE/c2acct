/**
 * 13k BattleCard + Category-Position boost — BENCH variant.
 *
 * Sibling of boost-vendor-firms.ts (which handles EXPANSION vendors via
 * loadExpansionBank). This one boosts a canonical demo-BENCH vendor — one of the
 * four in data/demo-seed/vendor-catalog.json (Sentinel, Bridgepath, Lumen,
 * Stratabind) — so its BattleCard shows >=15 reviewing firms across all three
 * lanes (strong/good/weak). It sources the vendor + product plan from
 * loadVendorCatalog()/buildVendorPlan() (the planEcosystems() bank) instead of
 * the expansion bank, and namespaces new firms under the canonical bench prefix
 * ("demo-bench-firm-") with an offset firmIndex so keys never collide with the
 * ~9-14 canonical firms already in the vendor's ecosystem.
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/boost-vendor-bench-firms.ts bridgepath
 *
 * LANE MATH IS vs-RELATIVE (the key difference from the Meridian expansion boost,
 * whose bands were hard-coded to vendorStrength~59). alignmentDelta =
 * vendorStrength - firmAlignment; lanes are strong (delta>=12) / good (0<=delta<12)
 * / weak (delta<0). Bridgepath's vendorStrength is ~68, so the Meridian good-band
 * [50,56] would land at delta~15 = STRONG here. Instead we measure the vendor's
 * live vendorStrength up front and derive each lane's target firmAlignment from
 * it, so the boost self-tunes for any bench vendor. Because a firm's product-review
 * score is 65% product-anchored / 35% firm (see firmProductReviewTarget), adding
 * these firms shifts vendorStrength only slightly, so the pre-measure is a good
 * anchor. Boost firms review ALL products (guarantees every category cell keeps
 * n>=firms), and firmAlignment is set by overriding the archetype moduleScoreRanges
 * to a tight per-lane band.
 *
 * IMPORTANT: uses the @/lib/prisma singleton (the seed helpers use it too) — a
 * second `new PrismaClient()` doubles the pool and can deadlock local Postgres.
 * All writes are SERIAL. Prints per-step + per-firm progress; silence = a real
 * hang, not tail buffering.
 */
import prisma from "@/lib/prisma";
import type { FirmArchetypeKey, FirmRosterEntry } from "@/lib/demo-seed/combinator";
import {
  loadVendorCatalog,
  buildVendorPlan,
  buildFirmPlan,
  loadFirmArchetypes,
  loadOpenEndedTemplates,
  createMulberry32,
  DEMO_BENCHMARK_SEED,
} from "@/lib/demo-seed/combinator";
import { getVendorBattleCardData } from "@/lib/battleCard";
import { classifyCompanyBoundaries } from "@/lib/dataBoundaryBackfill";

const idSubstr = process.argv[2] ?? "bridgepath";
const FIRM_INDEX_OFFSET = 60; // beyond any canonical bench firmIndex → new keys
const BENCH_FIRM_PREFIX = "demo-bench-firm-"; // canonical bench namespace

// lane = intended BattleCard fit lane. Bands are computed vs-relative in main()
// from the measured vendorStrength (vs). Archetype is kept for realistic labels /
// risk flags / open-ended quotes, but moduleScoreRanges is OVERRIDDEN to the
// lane's tight band so firmAlignment lands where the lane needs it:
//   strong → align ~ vs-20 (delta ~+20)
//   good   → align ~ vs-6  (delta ~+6, safely inside [0,12))
//   weak   → align ~ vs+8  (delta ~-8)
type Lane = "strong" | "good" | "weak";
type BoostEntry = FirmRosterEntry & { lane: Lane };
const BOOST_FIRMS: BoostEntry[] = [
  { name: "Marloch Advisory", size: "mid", archetype: "struggling", regionalFlavor: "midwest", userCountSeed: 7, lane: "strong" },
  { name: "Northgate Vane", size: "small", archetype: "struggling", regionalFlavor: "west", userCountSeed: 9, lane: "strong" },
  { name: "Oakcliff Reed", size: "mid", archetype: "struggling", regionalFlavor: "northeast", userCountSeed: 6, lane: "strong" },
  { name: "Pennywell CPAs", size: "small", archetype: "struggling", regionalFlavor: "southeast", userCountSeed: 8, lane: "strong" },
  { name: "Quarrenton LLP", size: "mid", archetype: "mid-tier", regionalFlavor: "midwest", userCountSeed: 5, lane: "good" },
  { name: "Redhill Marsh", size: "small", archetype: "mid-tier", regionalFlavor: "west", userCountSeed: 6, lane: "good" },
  { name: "Selby Crane", size: "mid", archetype: "mid-tier", regionalFlavor: "national", userCountSeed: 7, lane: "good" },
  { name: "Thornwick Group", size: "large", archetype: "mid-tier", regionalFlavor: "northeast", userCountSeed: 10, lane: "good" },
  { name: "Umberton Vale", size: "large", archetype: "compliance-heavy", regionalFlavor: "national", userCountSeed: 9, lane: "weak" },
  { name: "Vandergrift Poole", size: "mid", archetype: "compliance-heavy", regionalFlavor: "southeast", userCountSeed: 8, lane: "weak" },
  { name: "Westmere Kline", size: "large", archetype: "high-performing", regionalFlavor: "midwest", userCountSeed: 11, lane: "weak" },
  { name: "Yardley Stone", size: "mid", archetype: "high-performing", regionalFlavor: "west", userCountSeed: 9, lane: "weak" },
];

// Build a flat [lo,hi] band for every module key, clamped to a sane 0-100 window.
function laneBand(moduleKeys: string[], centerPct: number, halfWidth: number): Record<string, [number, number]> {
  const lo = Math.max(18, Math.round(centerPct - halfWidth));
  const hi = Math.min(96, Math.round(centerPct + halfWidth));
  return Object.fromEntries(moduleKeys.map((k) => [k, [lo, hi] as [number, number]]));
}

async function main() {
  const t0 = Date.now();
  const log = (m: string) => console.log(`[+${Math.round((Date.now() - t0) / 1000)}s] ${m}`);
  console.log(`\n=== BENCH FIRM BOOST (${idSubstr}) ===`);
  if (!process.env.DATABASE_URL) { console.log("  ❌ DATABASE_URL unset"); process.exitCode = 1; return; }

  const catalog = loadVendorCatalog();
  const vendorIndex = catalog.findIndex((v) => v.id.includes(idSubstr) || v.name.toLowerCase().includes(idSubstr));
  if (vendorIndex < 0) { console.log(`'${idSubstr}' is not a BENCH catalog vendor (${catalog.map((v) => v.id).join(", ")}).`); return; }
  const vendorEntry = catalog[vendorIndex]!;
  const vendorPlan = buildVendorPlan(vendorEntry);
  const archetypeMap = loadFirmArchetypes();
  const templates = loadOpenEndedTemplates();
  const rng = createMulberry32(`${DEMO_BENCHMARK_SEED}-boost-${vendorEntry.id}`);
  log(`catalog loaded; vendor=${vendorEntry.name} idx=${vendorIndex} products=${vendorPlan.demoVendorInput.products.length}`);

  const [
    { ensureVendor, ensureProduct, ensureFirm, seedFirmAlignmentSubmission, seedFirmProductAssessment, loadFirmAlignmentModules, ensureResearchSource },
    { ensureFirmAlignmentSystem, ensureFirmProductModule },
    { ensureUserPatScaffold },
  ] = await Promise.all([import("@/lib/demoPatEcosystemSeed"), import("@/lib/firmPat"), import("@/lib/userPat")]);
  log("helpers imported");

  await ensureUserPatScaffold();
  const [, firmProductModule, alignmentModules, source] = await Promise.all([
    ensureFirmAlignmentSystem(), ensureFirmProductModule(), loadFirmAlignmentModules(prisma), ensureResearchSource(prisma),
  ]);
  log(`modules ready (${alignmentModules.length} alignment modules)`);

  const seededVendor = await ensureVendor(prisma, { vendor: vendorPlan.demoVendorInput, vendorIndex, sourceId: source.id });
  const seededProducts = [] as Array<Awaited<ReturnType<typeof ensureProduct>>>;
  for (const [productIndex, product] of vendorPlan.demoVendorInput.products.entries()) {
    seededProducts.push(await ensureProduct(prisma, {
      vendor: vendorPlan.demoVendorInput, vendorCompanyId: seededVendor.company.id,
      vendorProfileId: seededVendor.vendorProfile.id, product, productIndex, sourceId: source.id,
    }));
  }
  log(`vendor + ${seededProducts.length} products ensured`);

  // Measure the vendor's live strength BEFORE seeding so the lane bands self-tune.
  const bc0 = await getVendorBattleCardData(seededVendor.company.id);
  const vs = bc0?.vendorStrength ?? 60;
  // Centers are chosen so that per-firm module variance (firmOffset ±~7pct +
  // the de-clump module drop) can't drift a firm out of its lane: strong sits
  // ~26 above the 12-threshold's worst case, good ~6 inside [0,12), weak ~8 below 0.
  const strongCenter = vs - 26; // delta ~ +26 (robust strong margin)
  const goodCenter = vs - 6; //    delta ~ +6  (safely inside [0,12))
  const weakCenter = vs + 8; //    delta ~ -8
  log(`pre-boost vendorStrength=${vs} → lane centers strong≈${strongCenter} good≈${goodCenter} weak≈${weakCenter} (delta +26/+6/-8)`);

  const ecosystem = await prisma.ecosystem.findFirst({ where: { vendorCompanyId: seededVendor.company.id }, select: { id: true, name: true } });
  if (!ecosystem) { console.log(`no ecosystem for vendor ${seededVendor.company.id}`); return; }
  log(`ecosystem "${ecosystem.name}" — seeding ${BOOST_FIRMS.length} firms × ${seededProducts.length} product reviews`);

  let firmsSeeded = 0, submissions = 0, reviews = 0;
  for (const [i, entry] of BOOST_FIRMS.entries()) {
    const baseProfile = archetypeMap[entry.archetype as FirmArchetypeKey];
    if (!baseProfile) { console.log(`  unknown archetype '${entry.archetype}'`); continue; }
    const moduleKeys = Object.keys(baseProfile.moduleScoreRanges);
    const center = entry.lane === "strong" ? strongCenter : entry.lane === "good" ? goodCenter : weakCenter;
    // half-width 2 → a tight band so firmAlignment lands within ~2pts of center.
    const archetypeProfile = { ...baseProfile, moduleScoreRanges: laneBand(moduleKeys, center, 2) };
    const firmIndex = FIRM_INDEX_OFFSET + i;
    const firmPlan = buildFirmPlan({ firm: entry, ecosystemIndex: vendorIndex, firmIndex, archetypeProfile, vendorPlan, templates, rng, firmKeyPrefix: BENCH_FIRM_PREFIX });

    const seededFirm = await ensureFirm(prisma, firmPlan.demoFirmInput);
    await prisma.ecosystemFirm.upsert({ where: { firmCompanyId: seededFirm.company.id }, update: { ecosystemId: ecosystem.id }, create: { ecosystemId: ecosystem.id, firmCompanyId: seededFirm.company.id } });
    firmsSeeded += 1;

    const globalFirmIndex = vendorIndex * 100 + firmIndex;
    const modulesToComplete = Math.max(1, Math.round(alignmentModules.length * archetypeProfile.completionRate));
    for (let moduleIndex = 0; moduleIndex < modulesToComplete; moduleIndex += 1) {
      const moduleEntry = alignmentModules[moduleIndex];
      if (!moduleEntry) break;
      await seedFirmAlignmentSubmission(prisma, { firm: firmPlan.demoFirmInput, companyId: seededFirm.company.id, subjectId: seededFirm.subject.id, module: moduleEntry, moduleIndex, firmIndex: globalFirmIndex });
      submissions += 1;
    }
    for (const [reviewIndex, seededProduct] of seededProducts.entries()) {
      await seedFirmProductAssessment(prisma, { firm: firmPlan.demoFirmInput, firmCompanyId: seededFirm.company.id, product: seededProduct, moduleId: firmProductModule.id, moduleVersion: firmProductModule.version ?? 1, relationshipIndex: globalFirmIndex * 13 + reviewIndex });
      reviews += 1;
    }
    log(`firm ${i + 1}/${BOOST_FIRMS.length} ${entry.name} [${entry.lane}/${entry.archetype}] — ${modulesToComplete} briefings, ${seededProducts.length} reviews`);
  }

  const boundary = await classifyCompanyBoundaries(prisma);
  log(`DONE: ${firmsSeeded} firms, ${submissions} submissions, ${reviews} reviews. boundaryClassified=${JSON.stringify(boundary)}`);
}

main().catch((e) => { console.error("bench-firm-boost failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
