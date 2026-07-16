/**
 * 13k BattleCard + Category-Position boost — add dedicated firms to an EXPANSION
 * vendor's ecosystem so its BattleCard shows >=15 reviewing firms across all
 * three lanes (strong/good/weak) and every category cell clears n>=5.
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/boost-vendor-firms.ts meridian
 *
 * Reuses the exact demo machinery (buildVendorPlan/buildFirmPlan + seed helpers),
 * so scoring is deterministic and idempotent. New firms use offset firmIndex +
 * unique names so keys never collide. Each firm gets a full alignment briefing
 * (varies alignmentDelta → lanes) and reviews ALL of the vendor's products
 * (guarantees every category cell >= n firms). Archetype mix is weighted to
 * struggling/sample-thin (STRONG lane — a low-alignment firm is a strong fit for
 * a stronger vendor) + mid-tier/compliance-heavy (GOOD lane).
 *
 * IMPORTANT: uses the @/lib/prisma singleton (the seed helpers use it too) — a
 * second `new PrismaClient()` doubles the pool and can deadlock local Postgres.
 * All writes are SERIAL. Prints per-step + per-firm progress; silence = a real
 * hang, not tail buffering.
 */
import prisma from "@/lib/prisma";
import type { FirmArchetypeKey, FirmRosterEntry } from "@/lib/demo-seed/combinator";
import { loadExpansionBank, EXPANSION_FIRM_PREFIX, DEMO_EXPANSION_SEED } from "@/lib/demo-seed/expansion";
import { buildVendorPlan, buildFirmPlan, loadFirmArchetypes, loadOpenEndedTemplates, createMulberry32 } from "@/lib/demo-seed/combinator";
import { classifyCompanyBoundaries } from "@/lib/dataBoundaryBackfill";

const idSubstr = process.argv[2] ?? "meridian";
const FIRM_INDEX_OFFSET = 60; // beyond any existing firmIndex → new keys

const BOOST_FIRMS: FirmRosterEntry[] = [
  { name: "Aldermere Group", size: "mid", archetype: "struggling", regionalFlavor: "midwest", userCountSeed: 7 },
  { name: "Bexley Crossmark", size: "small", archetype: "struggling", regionalFlavor: "west", userCountSeed: 9 },
  { name: "Cornbrook LLP", size: "mid", archetype: "struggling", regionalFlavor: "northeast", userCountSeed: 6 },
  { name: "Draymoor Partners", size: "small", archetype: "struggling", regionalFlavor: "southeast", userCountSeed: 8 },
  { name: "Ellwood Vance", size: "small", archetype: "sample-thin", regionalFlavor: "midwest", userCountSeed: 5 },
  { name: "Fenwick Sable", size: "small", archetype: "sample-thin", regionalFlavor: "west", userCountSeed: 6 },
  { name: "Garrow and Pike", size: "mid", archetype: "sample-thin", regionalFlavor: "national", userCountSeed: 7 },
  { name: "Hensley Braid", size: "mid", archetype: "mid-tier", regionalFlavor: "northeast", userCountSeed: 10 },
  { name: "Ironvale CPAs", size: "large", archetype: "mid-tier", regionalFlavor: "national", userCountSeed: 9 },
  { name: "Jarrow Kline", size: "mid", archetype: "mid-tier", regionalFlavor: "southeast", userCountSeed: 8 },
  { name: "Kesterly Fox", size: "large", archetype: "compliance-heavy", regionalFlavor: "midwest", userCountSeed: 11 },
  { name: "Larchmont Reed", size: "mid", archetype: "compliance-heavy", regionalFlavor: "west", userCountSeed: 9 },
];

async function main() {
  const t0 = Date.now();
  const log = (m: string) => console.log(`[+${Math.round((Date.now() - t0) / 1000)}s] ${m}`);
  console.log(`\n=== FIRM BOOST (${idSubstr}) ===`);
  if (!process.env.DATABASE_URL) { console.log("  ❌ DATABASE_URL unset"); process.exitCode = 1; return; }

  const bank = loadExpansionBank();
  const vendorIndex = bank.vendors.findIndex((v) => v.id.includes(idSubstr) || v.name.toLowerCase().includes(idSubstr));
  if (vendorIndex < 0) { console.log(`'${idSubstr}' is not an EXPANSION vendor.`); return; }
  const vendorEntry = bank.vendors[vendorIndex]!;
  const vendorPlan = buildVendorPlan(vendorEntry);
  const archetypeMap = loadFirmArchetypes();
  const templates = loadOpenEndedTemplates();
  const rng = createMulberry32(`${DEMO_EXPANSION_SEED}-boost-${vendorEntry.id}`);
  log(`bank loaded; vendor=${vendorEntry.name} idx=${vendorIndex} products=${vendorPlan.demoVendorInput.products.length}`);

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

  const ecosystem = await prisma.ecosystem.findFirst({ where: { vendorCompanyId: seededVendor.company.id }, select: { id: true, name: true } });
  if (!ecosystem) { console.log(`no ecosystem for vendor ${seededVendor.company.id}`); return; }
  log(`ecosystem "${ecosystem.name}" — seeding ${BOOST_FIRMS.length} firms × ${seededProducts.length} product reviews`);

  let firmsSeeded = 0, submissions = 0, reviews = 0;
  for (const [i, entry] of BOOST_FIRMS.entries()) {
    const archetypeProfile = archetypeMap[entry.archetype as FirmArchetypeKey];
    if (!archetypeProfile) { console.log(`  unknown archetype '${entry.archetype}'`); continue; }
    const firmIndex = FIRM_INDEX_OFFSET + i;
    const firmPlan = buildFirmPlan({ firm: entry, ecosystemIndex: vendorIndex, firmIndex, archetypeProfile, vendorPlan, templates, rng, firmKeyPrefix: EXPANSION_FIRM_PREFIX });

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
    log(`firm ${i + 1}/${BOOST_FIRMS.length} ${entry.name} [${entry.archetype}] — ${modulesToComplete} briefings, ${seededProducts.length} reviews`);
  }

  const boundary = await classifyCompanyBoundaries(prisma);
  log(`DONE: ${firmsSeeded} firms, ${submissions} submissions, ${reviews} reviews. boundaryClassified=${JSON.stringify(boundary)}`);
}

main().catch((e) => { console.error("firm-boost failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
