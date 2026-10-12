import { appendFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { FINAL_SCORE_VERSION, alignmentIndex } from "@/lib/assessmentCore";
import { classifyCompanyBoundaries } from "@/lib/dataBoundaryBackfill";
import {
  LEGAL_DEMO_PREFIX,
  LEGAL_ECOSYSTEM_PREFIX,
  LEGAL_FIRM_PREFIX,
  LEGAL_VENDOR_PREFIX,
  LEGAL_VERTICAL_ID,
  loadLegalCategoryVertical,
  planLegalEcosystems,
} from "@/lib/demo-seed/legal";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { isVerticalPacksEnabled } from "@/lib/verticals/flag";

/**
 * Legal demo seed (legal-load, R64; audit section 12 items 11 and 13, delta 6, R-S).
 *
 * Seeds the legal channel's demo set on the DEMO boundary: five fictional vendors
 * with 18 products and their self-assessments, five Guides, 40 fictional law firms
 * with linked users, module submissions (per archetype completion rate) whose five
 * follow-ups are option picks from the legal registry, and firm product reviews.
 * Every Company, Product, VendorProfile and SurveySubmission row carries
 * verticalId "legal"; every id sits in the demo-legal-* namespace; the boundary
 * classifier marks every company DEMO at the end.
 *
 * R-S: additive, idempotent (stable ids, upserts), no future dates (demoDate), no
 * identical answers (deterministic per firm, module and question). Prints a prose
 * sample and the hub-card numbers for every legal demo firm, and the account list
 * by name; passwords go to ~/work/preview-accounts.txt only, never to stdout.
 *
 * Requires PAT_ENABLE_VERTICAL_PACKS=1 in this shell (the legal bank must resolve).
 *
 *   node --import tsx scripts/demo/seed-legal-demo.ts            # DRY RUN — prints the plan
 *   node --import tsx scripts/demo/seed-legal-demo.ts --apply    # writes (idempotent)
 */
const APPLY = process.argv.includes("--apply");
const DEMO_LEGAL_PASSWORD = process.env.PAT_DEMO_LEGAL_PASSWORD ?? "Pat-Demo-Legal-2026";
const ACCOUNTS_FILE = path.join(os.homedir(), "work", "preview-accounts.txt");

let prismaClient: { $disconnect(): Promise<void> } | null = null;

function assertLegalBoundary(plans: ReturnType<typeof planLegalEcosystems>): void {
  const violations: string[] = [];
  for (const plan of plans) {
    if (!plan.ecosystemId.startsWith(LEGAL_ECOSYSTEM_PREFIX)) violations.push(`ecosystem "${plan.ecosystemId}"`);
    if (!plan.vendor.demoVendorInput.key.startsWith(LEGAL_VENDOR_PREFIX)) violations.push(`vendor "${plan.vendor.demoVendorInput.key}"`);
    if (!plan.consultant.userId.startsWith(LEGAL_DEMO_PREFIX) || !plan.consultant.profileId.startsWith(LEGAL_DEMO_PREFIX)) {
      violations.push(`consultant "${plan.consultant.userId}"`);
    }
    for (const product of plan.vendor.demoVendorInput.products) {
      if (!product.key.startsWith(`${LEGAL_DEMO_PREFIX}product-`)) violations.push(`product "${product.key}"`);
    }
    for (const firm of plan.firms) {
      if (!firm.demoFirmInput.key.startsWith(LEGAL_FIRM_PREFIX)) violations.push(`firm "${firm.demoFirmInput.key}"`);
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `ABORT — legal demo boundary violated (would write outside the demo-legal-* namespace): ${violations.slice(0, 10).join(", ")}${violations.length > 10 ? ` …and ${violations.length - 10} more` : ""}`
    );
  }
}

async function main() {
  applyRepoEnv();
  if (!isVerticalPacksEnabled()) {
    console.error("ABORT: PAT_ENABLE_VERTICAL_PACKS=1 is required in this shell so the legal bank and vertical resolve.");
    process.exitCode = 1;
    return;
  }

  const plans = planLegalEcosystems();
  assertLegalBoundary(plans);

  const totals = { ecosystems: plans.length, products: 0, firms: 0, plannedReviews: 0 };
  for (const plan of plans) {
    totals.products += plan.vendor.demoVendorInput.products.length;
    totals.firms += plan.firms.length;
    for (const firm of plan.firms) totals.plannedReviews += firm.productReviewIds.length;
  }
  console.log(`\n================ LEGAL DEMO SEED — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  console.log(`Namespace: ${LEGAL_ECOSYSTEM_PREFIX}* / ${LEGAL_VENDOR_PREFIX}* / ${LEGAL_FIRM_PREFIX}* · vertical ${LEGAL_VERTICAL_ID} · boundary DEMO\n`);
  for (const plan of plans) {
    const byArchetype = plan.firms.reduce<Record<string, number>>((acc, firm) => ({ ...acc, [firm.bankEntry.archetype]: (acc[firm.bankEntry.archetype] ?? 0) + 1 }), {});
    console.log(`  ${plan.ecosystemName} [${plan.vendor.bankEntry.archetype}] · ${plan.vendor.demoVendorInput.products.length} products · ${plan.firms.length} firms (${Object.entries(byArchetype).map(([key, count]) => `${key}×${count}`).join(", ")})`);
  }
  console.log(`\nTOTALS: ${totals.ecosystems} vendors · ${totals.products} products · ${totals.firms} firms · ${totals.plannedReviews} firm product reviews (plus module submissions per completionRate).`);

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply.");
    return;
  }

  const [
    { default: prisma },
    { ensureVendor, ensureProduct, ensureFirm, seedFirmAlignmentSubmission, seedFirmProductAssessment, seedVendorProductAssessment, loadFirmAlignmentModules, ensureResearchSource, stableId },
    { ensureFirmAlignmentSystem, ensureFirmProductModule },
    { ensureUserPatScaffold },
    { ensureVendorProductModule },
    { hashPilotPassword },
    { loadPackProductUtilityRegistry },
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/demoPatEcosystemSeed"),
    import("@/lib/firmPat"),
    import("@/lib/userPat"),
    import("@/lib/vendorPat"),
    import("@/lib/auth/passwords"),
    import("@/lib/verticals/questionBankPackLoader"),
  ]);
  prismaClient = prisma;

  const channel = {
    verticalId: LEGAL_VERTICAL_ID,
    registry: await loadPackProductUtilityRegistry(LEGAL_VERTICAL_ID),
    categoryVertical: loadLegalCategoryVertical(),
  };

  console.log("\nAPPLYING…");
  await ensureUserPatScaffold();
  const [vendorModule, _firmModules, firmProductModule, alignmentModules, source] = await Promise.all([
    ensureVendorProductModule(),
    ensureFirmAlignmentSystem(),
    ensureFirmProductModule(),
    loadFirmAlignmentModules(prisma),
    ensureResearchSource(prisma),
  ]);
  void _firmModules;
  const passwordHash = await hashPilotPassword(DEMO_LEGAL_PASSWORD);

  const counts = { ecosystems: 0, vendors: 0, products: 0, vendorProductAssessments: 0, consultants: 0, firms: 0, firmModuleSubmissions: 0, firmProductReviews: 0, linkedFirmUsers: 0 };
  const accounts: string[] = [];
  const hubCards: Array<{ firm: string; modules: string; index: number | null; sample: string }> = [];

  for (const [ecosystemIndex, plan] of plans.entries()) {
    const seededVendor = await ensureVendor(prisma, { channel, vendor: plan.vendor.demoVendorInput, vendorIndex: ecosystemIndex, sourceId: source.id });
    counts.vendors += 1;
    const seededProducts: Array<Awaited<ReturnType<typeof ensureProduct>>> = [];
    for (const [productIndex, productInput] of plan.vendor.demoVendorInput.products.entries()) {
      const seededProduct = await ensureProduct(prisma, {
        channel,
        vendor: plan.vendor.demoVendorInput,
        vendorCompanyId: seededVendor.company.id,
        vendorProfileId: seededVendor.vendorProfile.id,
        product: productInput,
        productIndex,
        sourceId: source.id,
      });
      seededProducts.push(seededProduct);
      counts.products += 1;
      await seedVendorProductAssessment(prisma, { product: seededProduct, moduleId: vendorModule.id, moduleVersion: vendorModule.version ?? 1, productIndex, channel });
      counts.vendorProductAssessments += 1;
    }

    const consultantUserId = await upsertUser(prisma, { id: plan.consultant.userId, email: plan.consultant.email, name: plan.consultant.name, passwordHash, companyId: null });
    const consultantProfile = await prisma.consultantProfile.upsert({
      where: { userId: consultantUserId },
      update: { active: true, updatedAt: new Date() },
      create: { id: plan.consultant.profileId, userId: consultantUserId, active: true, updatedAt: new Date() },
      select: { id: true },
    });
    counts.consultants += 1;
    accounts.push(`guide · ${plan.consultant.email}`);

    await prisma.ecosystem.upsert({
      where: { id: plan.ecosystemId },
      update: { name: plan.ecosystemName, vendorCompanyId: seededVendor.company.id, consultantProfileId: consultantProfile.id },
      create: { id: plan.ecosystemId, name: plan.ecosystemName, vendorCompanyId: seededVendor.company.id, consultantProfileId: consultantProfile.id },
    });
    counts.ecosystems += 1;
    await prisma.consultantAssignment.upsert({
      where: { consultantProfileId: consultantProfile.id },
      update: { ecosystemId: plan.ecosystemId, active: true },
      create: { id: stableId(`${LEGAL_DEMO_PREFIX}assignment`, `${plan.ecosystemId}-${consultantProfile.id}`), consultantProfileId: consultantProfile.id, ecosystemId: plan.ecosystemId, active: true },
    });

    // One vendor login per ecosystem, so a Vendor Elite / Pro walk has an account.
    const vendorSlug = plan.vendor.demoVendorInput.key.replace(LEGAL_VENDOR_PREFIX, "");
    const vendorEmail = `demo-legal-${vendorSlug}-vendor@pat.local`;
    await upsertUser(prisma, { id: `${LEGAL_DEMO_PREFIX}user-vendor-${vendorSlug}`, email: vendorEmail, name: `${plan.vendor.demoVendorInput.displayName} admin`, passwordHash, companyId: seededVendor.company.id });
    accounts.push(`vendor (${plan.vendor.demoVendorInput.membership.plan.toLowerCase()}) · ${vendorEmail}`);

    for (const [firmIndex, firmPlan] of plan.firms.entries()) {
      const seededFirm = await ensureFirm(prisma, firmPlan.demoFirmInput, channel);
      counts.firms += 1;
      await prisma.ecosystemFirm.upsert({
        where: { firmCompanyId: seededFirm.company.id },
        update: { ecosystemId: plan.ecosystemId },
        create: { ecosystemId: plan.ecosystemId, firmCompanyId: seededFirm.company.id },
      });
      const firmSlug = firmPlan.demoFirmInput.key.replace(LEGAL_FIRM_PREFIX, "");
      const userCount = Math.max(1, Math.min(firmPlan.userCount, 4));
      for (let i = 0; i < userCount; i += 1) {
        await upsertUser(prisma, {
          id: `${firmPlan.demoFirmInput.key}-user-${i + 1}`,
          email: `demo-legal-${firmSlug}-user${i + 1}@pat.local`,
          name: `${firmPlan.demoFirmInput.displayName} user ${i + 1}`,
          passwordHash,
          companyId: seededFirm.company.id,
        });
        counts.linkedFirmUsers += 1;
      }
      accounts.push(`firm (${firmPlan.demoFirmInput.membership.plan.toLowerCase()}) · demo-legal-${firmSlug}-user1@pat.local`);

      const modulesToComplete = Math.max(1, Math.round(alignmentModules.length * firmPlan.archetypeProfile.completionRate));
      // R-S "no identical answers": the accounting scheme (ecosystem × 100 + firm) lets two firms in
      // different ecosystems share a seed and, with the same target, the same answers. A stable
      // per-firm salt from the firm key breaks the tie deterministically.
      const globalFirmIndex = ecosystemIndex * 100 + firmIndex + firmSalt(firmPlan.demoFirmInput.key);
      const moduleScores: number[] = [];
      for (let moduleIndex = 0; moduleIndex < modulesToComplete; moduleIndex += 1) {
        const moduleEntry = alignmentModules[moduleIndex];
        if (!moduleEntry) break;
        await seedFirmAlignmentSubmission(prisma, {
          firm: firmPlan.demoFirmInput,
          companyId: seededFirm.company.id,
          subjectId: seededFirm.subject.id,
          module: moduleEntry,
          moduleIndex,
          firmIndex: globalFirmIndex,
          channel,
        });
        counts.firmModuleSubmissions += 1;
      }
      const finals = await prisma.surveySubmission.findMany({
        where: { companyId: seededFirm.company.id, scoreVersion: FINAL_SCORE_VERSION, moduleId: { in: alignmentModules.map((module) => module.id) } },
        select: { score: true },
      });
      for (const final of finals) moduleScores.push(final.score);

      for (const [reviewIndex, productId] of firmPlan.productReviewIds.entries()) {
        const seededProduct = seededProducts.find((entry) => entry.input.key === productId);
        if (!seededProduct) continue;
        await seedFirmProductAssessment(prisma, {
          firm: firmPlan.demoFirmInput,
          firmCompanyId: seededFirm.company.id,
          product: seededProduct,
          moduleId: firmProductModule.id,
          moduleVersion: firmProductModule.version ?? 1,
          relationshipIndex: globalFirmIndex * 13 + reviewIndex,
          channel,
        });
        counts.firmProductReviews += 1;
      }

      const sample = Object.values(firmPlan.openEndedQuotes)[0] ?? "(no product review quote)";
      hubCards.push({
        firm: firmPlan.demoFirmInput.displayName,
        modules: `${finals.length}/${alignmentModules.length}`,
        index: alignmentIndex(moduleScores),
        sample,
      });
    }
    console.log(`Ecosystem "${plan.ecosystemName}": vendor + ${plan.vendor.demoVendorInput.products.length} products, ${plan.firms.length} firms, Guide ${plan.consultant.email}`);
  }

  if (counts.products !== counts.vendorProductAssessments) {
    throw new Error(`seed-legal-demo wiring regression: products=${counts.products} vs vendorProductAssessments=${counts.vendorProductAssessments}.`);
  }

  const boundaryClassified = await classifyCompanyBoundaries(prisma);
  const legalCompanyIds = (await prisma.company.findMany({ where: { verticalId: LEGAL_VERTICAL_ID }, select: { id: true } })).map((row) => row.id);
  const [legalDemo, legalSubmissions, legalPicks] = await Promise.all([
    prisma.company.count({ where: { verticalId: LEGAL_VERTICAL_ID, dataBoundary: "DEMO" } }),
    prisma.surveySubmission.count({ where: { verticalId: LEGAL_VERTICAL_ID } }),
    prisma.assessmentItemResponse.count({ where: { companyId: { in: legalCompanyIds }, questionKey: { contains: "_open_" }, selectionMode: { in: ["SINGLE", "MULTI"] } } }),
  ]);
  const legalCompanies = legalCompanyIds.length;

  console.log("\nLegal demo seed complete:", { ...counts, boundaryClassified });
  console.log(`Legal companies: ${legalCompanies} (DEMO: ${legalDemo}); legal submissions: ${legalSubmissions}; legal follow-up pick rows: ${legalPicks}.`);

  console.log("\nHub cards (R-S), one line per legal demo firm: modules complete · alignment index · a prose sample");
  for (const card of hubCards) {
    console.log(`  ${card.firm} · ${card.modules} · ${card.index === null ? "Partial" : card.index} · "${card.sample}"`);
  }

  const header = `\n# Legal demo accounts (legal-load, R64) · ${new Date().toISOString()} · password for every account below: ${DEMO_LEGAL_PASSWORD}\n`;
  appendFileSync(ACCOUNTS_FILE, header + accounts.map((line) => `${line}\n`).join(""), { mode: 0o600 });
  console.log(`\nAccounts (names only; the password is in ${ACCOUNTS_FILE}${existsSync(ACCOUNTS_FILE) ? "" : " (created)"}):`);
  for (const line of accounts) console.log(`  ${line}`);
}

/** Deterministic small integer from a firm key (FNV-1a folded to 0..9973). */
function firmSalt(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 9973;
}

async function upsertUser(prisma: PrismaClient, input: { id: string; email: string; name: string; passwordHash: string; companyId: string | null }) {
  const row = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, passwordHash: input.passwordHash, role: "MEMBER", ...(input.companyId ? { companyId: input.companyId } : {}), updatedAt: new Date() },
    create: { id: input.id, email: input.email, name: input.name, role: "MEMBER", passwordHash: input.passwordHash, ...(input.companyId ? { companyId: input.companyId } : {}), updatedAt: new Date() },
    select: { id: true },
  });
  return row.id;
}

main()
  .catch((error) => {
    console.error("Legal demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) await prismaClient.$disconnect();
  });
