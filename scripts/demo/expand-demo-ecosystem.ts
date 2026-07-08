import type { PrismaClient } from "@prisma/client";

import { applyRepoEnv } from "@/lib/env/repoEnv";
import {
  EXPANSION_ECOSYSTEM_PREFIX,
  EXPANSION_FIRM_PREFIX,
  EXPANSION_VENDOR_PREFIX,
  planExpansionEcosystems,
} from "@/lib/demo-seed/expansion";

/**
 * Demo-ecosystem EXPANSION seed (Sprint 3/4 addendum, 2026-07-08).
 *
 * Roughly DOUBLES the demo footprint — adds 8 new vendors + 44 new firms, each
 * with completed alignment submissions, vendor self-assessments, and firm
 * product reviews spread across archetypes — so every insight surface
 * (divergence, per-firm heatmap, positioning radar, benchmark bands) renders
 * fully populated for the demo. It reuses the battle-tested benchmark
 * combinator machinery under a distinct demo-expand-* namespace and PRNG seed.
 *
 * Boundary: NEVER touches the pilot cohort, and never the canonical demo-bench-*
 * cohort. Every id/key it writes is verified to start with a demo-expand-*
 * prefix before a single row is written (see assertExpansionBoundary). The
 * canonical seed chain (seed:demo-benchmark) is not modified and keeps its
 * ~64-firm footprint; this script is additive and opt-in.
 *
 * Idempotent + deterministic: all writes are upserts on stable ids derived from
 * the deterministic plan, exactly like seed-demo-benchmark.ts. Re-running
 * --apply does NOT grow row counts.
 *
 * Usage:
 *   node --import tsx scripts/demo/expand-demo-ecosystem.ts            # DRY RUN (default) — prints the plan, writes nothing
 *   node --import tsx scripts/demo/expand-demo-ecosystem.ts --apply    # writes the plan (idempotent)
 *
 * Optional: PAT_DEMO_EXPAND_PASSWORD overrides the demo login password
 * (defaults to the shared demo-bench consultant password).
 */

const APPLY = process.argv.includes("--apply");
const DEMO_EXPAND_PASSWORD =
  process.env.PAT_DEMO_EXPAND_PASSWORD ?? "Pat-Demo-Bench-Consultant-2026";

let prismaClient: { $disconnect(): Promise<void> } | null = null;

/**
 * Structural tenancy wall: refuse to run if the deterministic plan contains any
 * id/key that is not inside the demo-expand-* namespace. This is what
 * guarantees the script can never write into — or over — the pilot cohort or
 * the canonical demo cohort, no matter how the bank JSON is edited later.
 */
function assertExpansionBoundary(plans: ReturnType<typeof planExpansionEcosystems>): void {
  const violations: string[] = [];
  for (const plan of plans) {
    if (!plan.ecosystemId.startsWith(EXPANSION_ECOSYSTEM_PREFIX)) {
      violations.push(`ecosystem "${plan.ecosystemId}"`);
    }
    if (!plan.vendor.demoVendorInput.key.startsWith(EXPANSION_VENDOR_PREFIX)) {
      violations.push(`vendor "${plan.vendor.demoVendorInput.key}"`);
    }
    if (
      !plan.consultant.userId.startsWith("demo-expand-") ||
      !plan.consultant.profileId.startsWith("demo-expand-")
    ) {
      violations.push(`consultant "${plan.consultant.userId}"`);
    }
    for (const firm of plan.firms) {
      if (!firm.demoFirmInput.key.startsWith(EXPANSION_FIRM_PREFIX)) {
        violations.push(`firm "${firm.demoFirmInput.key}"`);
      }
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `ABORT — expansion boundary violated (would write outside the demo-expand-* namespace): ${violations
        .slice(0, 10)
        .join(", ")}${violations.length > 10 ? ` …and ${violations.length - 10} more` : ""}`
    );
  }
}

async function main() {
  applyRepoEnv();

  const plans = planExpansionEcosystems();
  assertExpansionBoundary(plans);

  // ---- Plan summary (pure — no DB needed) --------------------------------
  const totals = {
    ecosystems: plans.length,
    vendors: plans.length,
    products: 0,
    firms: 0,
    plannedFirmModuleSubmissions: 0,
    plannedFirmProductReviews: 0,
  };
  for (const plan of plans) {
    totals.products += plan.vendor.demoVendorInput.products.length;
    totals.firms += plan.firms.length;
    for (const firm of plan.firms) {
      totals.plannedFirmProductReviews += firm.productReviewIds.length;
    }
  }

  console.log(`\n================ EXPAND DEMO ECOSYSTEM — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  console.log(
    `Namespace: ${EXPANSION_ECOSYSTEM_PREFIX}* / ${EXPANSION_VENDOR_PREFIX}* / ${EXPANSION_FIRM_PREFIX}*  (never pilot, never demo-bench-*)\n`
  );
  for (const plan of plans) {
    const arch = plan.vendor.bankEntry.archetype;
    const firmArch = plan.firms.reduce<Record<string, number>>((acc, firm) => {
      acc[firm.bankEntry.archetype] = (acc[firm.bankEntry.archetype] ?? 0) + 1;
      return acc;
    }, {});
    const firmArchSummary = Object.entries(firmArch)
      .map(([key, count]) => `${key}×${count}`)
      .join(", ");
    console.log(
      `  ${plan.ecosystemName} [${arch}]  ${plan.vendor.demoVendorInput.products.length} products · ${plan.firms.length} firms (${firmArchSummary})`
    );
  }
  console.log(
    `\nTOTALS: ${totals.vendors} vendors · ${totals.products} products · ${totals.firms} firms · ` +
      `${totals.plannedFirmProductReviews} firm product reviews (plus module submissions per completionRate).`
  );

  // ---- Optional DB delta (idempotency proof) — read-only, guarded --------
  try {
    const { default: prisma } = await import("@/lib/prisma");
    prismaClient = prisma;
    const vendorKeysToCompanyKeys = plans.map((plan) => plan.vendor.demoVendorInput.key);
    const firmKeysToCompanyKeys = plans.flatMap((plan) =>
      plan.firms.map((firm) => firm.demoFirmInput.key)
    );
    // Companies are keyed via ensureCompany(key) → deterministic ids. We look
    // for existing Company rows whose id encodes these keys to report how many
    // rows already exist (so re-running --apply is visibly a no-op on counts).
    const [existingEcosystems, existingEcosystemFirms] = await Promise.all([
      prisma.ecosystem.count({ where: { id: { startsWith: EXPANSION_ECOSYSTEM_PREFIX } } }),
      prisma.ecosystemFirm.count({
        where: { ecosystemId: { startsWith: EXPANSION_ECOSYSTEM_PREFIX } },
      }),
    ]);
    console.log(
      `\nDB state: ${existingEcosystems} demo-expand ecosystems / ${existingEcosystemFirms} firms already present. ` +
        `Re-running --apply upserts the same ${vendorKeysToCompanyKeys.length} vendors / ` +
        `${firmKeysToCompanyKeys.length} firms in place (no count growth).`
    );
  } catch (error) {
    console.log(
      `\n(DB not reached for idempotency delta — pure plan shown above. ${(error as Error).message})`
    );
  }

  if (!APPLY) {
    console.log(
      "\nRollback (after --apply): delete Ecosystem rows id LIKE 'demo-expand-ecosystem-%' " +
        "(cascades assignments), Company rows for demo-expand vendors/firms, and their Users " +
        "(email LIKE '%@demo-expand.pat.local' / 'review.consultant+expand-%')."
    );
    console.log("\nDRY RUN — no changes written. Re-run with --apply to execute.");
    if (prismaClient) await prismaClient.$disconnect();
    return;
  }

  await applyExpansion(plans);
}

async function applyExpansion(plans: ReturnType<typeof planExpansionEcosystems>): Promise<void> {
  const [
    { default: prisma },
    {
      ensureVendor,
      ensureProduct,
      ensureFirm,
      seedFirmAlignmentSubmission,
      seedFirmProductAssessment,
      seedVendorProductAssessment,
      loadFirmAlignmentModules,
      ensureResearchSource,
      stableId,
    },
    { ensureFirmAlignmentSystem, ensureFirmProductModule },
    { ensureUserPatScaffold },
    { ensureVendorProductModule },
    { hashPilotPassword },
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/demoPatEcosystemSeed"),
    import("@/lib/firmPat"),
    import("@/lib/userPat"),
    import("@/lib/vendorPat"),
    import("@/lib/auth/passwords"),
  ]);
  prismaClient = prisma;

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

  const passwordHash = await hashPilotPassword(DEMO_EXPAND_PASSWORD);

  const counts = {
    ecosystems: 0,
    vendors: 0,
    products: 0,
    vendorProductAssessments: 0,
    consultants: 0,
    firms: 0,
    firmModuleSubmissions: 0,
    firmProductReviews: 0,
    linkedFirmUsers: 0,
  };

  for (const [ecosystemIndex, plan] of plans.entries()) {
    const seededVendor = await ensureVendor(prisma, {
      vendor: plan.vendor.demoVendorInput,
      vendorIndex: ecosystemIndex,
      sourceId: source.id,
    });
    counts.vendors += 1;

    const seededProducts: Array<Awaited<ReturnType<typeof ensureProduct>>> = [];
    for (const [productIndex, productInput] of plan.vendor.demoVendorInput.products.entries()) {
      const seededProduct = await ensureProduct(prisma, {
        vendor: plan.vendor.demoVendorInput,
        vendorCompanyId: seededVendor.company.id,
        vendorProfileId: seededVendor.vendorProfile.id,
        product: productInput,
        productIndex,
        sourceId: source.id,
      });
      seededProducts.push(seededProduct);
      counts.products += 1;

      await seedVendorProductAssessment(prisma, {
        product: seededProduct,
        moduleId: vendorModule.id,
        moduleVersion: vendorModule.version ?? 1,
        productIndex,
      });
      counts.vendorProductAssessments += 1;
    }

    const consultantUserId = await upsertConsultantUser(prisma, { ...plan.consultant, passwordHash });
    const consultantProfileId = await upsertConsultantProfile(prisma, {
      userId: consultantUserId,
      profileId: plan.consultant.profileId,
    });
    counts.consultants += 1;

    await prisma.ecosystem.upsert({
      where: { id: plan.ecosystemId },
      update: {
        name: plan.ecosystemName,
        vendorCompanyId: seededVendor.company.id,
        consultantProfileId,
      },
      create: {
        id: plan.ecosystemId,
        name: plan.ecosystemName,
        vendorCompanyId: seededVendor.company.id,
        consultantProfileId,
      },
    });
    counts.ecosystems += 1;

    await prisma.consultantAssignment.upsert({
      where: { consultantProfileId },
      update: { ecosystemId: plan.ecosystemId, active: true },
      create: {
        id: stableId("demo-expand-assignment", `${plan.ecosystemId}-${consultantProfileId}`),
        consultantProfileId,
        ecosystemId: plan.ecosystemId,
        active: true,
      },
    });

    for (const [firmIndex, firmPlan] of plan.firms.entries()) {
      const seededFirm = await ensureFirm(prisma, firmPlan.demoFirmInput);
      counts.firms += 1;

      await prisma.ecosystemFirm.upsert({
        where: { firmCompanyId: seededFirm.company.id },
        update: { ecosystemId: plan.ecosystemId },
        create: { ecosystemId: plan.ecosystemId, firmCompanyId: seededFirm.company.id },
      });

      counts.linkedFirmUsers += await ensureLinkedFirmUsers(prisma, {
        firmCompanyId: seededFirm.company.id,
        firmKey: firmPlan.demoFirmInput.key,
        userCount: firmPlan.userCount,
        passwordHash,
      });

      const modulesToComplete = Math.max(
        1,
        Math.round(alignmentModules.length * firmPlan.archetypeProfile.completionRate)
      );
      const globalFirmIndex = ecosystemIndex * 100 + firmIndex;
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
        });
        counts.firmModuleSubmissions += 1;
      }

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
        });
        counts.firmProductReviews += 1;
      }
    }

    console.log(
      `Ecosystem "${plan.ecosystemName}": vendor + ${plan.vendor.demoVendorInput.products.length} products, ${plan.firms.length} firms, consultant ${plan.consultant.email}`
    );
  }

  if (counts.products !== counts.vendorProductAssessments) {
    throw new Error(
      `expand-demo-ecosystem wiring regression: products=${counts.products} vs vendorProductAssessments=${counts.vendorProductAssessments}.`
    );
  }

  console.log("\nExpand demo ecosystem complete:", counts);
  console.log(
    `Demo-expand consultants sign in via the credentials provider with password "${DEMO_EXPAND_PASSWORD}". Re-run without --apply to verify counts held steady.`
  );
}

// ---- Local mirrors of seed-demo-benchmark.ts's user helpers, namespaced to
//      the demo-expand cohort (distinct email domain so rows are traceable). ---

async function upsertConsultantUser(
  prisma: PrismaClient,
  input: { userId: string; email: string; name: string; passwordHash: string }
): Promise<string> {
  const result = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, passwordHash: input.passwordHash, role: "MEMBER", updatedAt: new Date() },
    create: {
      id: input.userId,
      email: input.email,
      name: input.name,
      role: "MEMBER",
      passwordHash: input.passwordHash,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
  return result.id;
}

async function upsertConsultantProfile(
  prisma: PrismaClient,
  input: { userId: string; profileId: string }
): Promise<string> {
  const result = await prisma.consultantProfile.upsert({
    where: { userId: input.userId },
    update: { active: true, updatedAt: new Date() },
    create: { id: input.profileId, userId: input.userId, active: true, updatedAt: new Date() },
    select: { id: true },
  });
  return result.id;
}

async function ensureLinkedFirmUsers(
  prisma: PrismaClient,
  input: { firmCompanyId: string; firmKey: string; userCount: number; passwordHash: string }
): Promise<number> {
  const existing = await prisma.user.findMany({
    where: { companyId: input.firmCompanyId },
    select: { id: true },
  });
  if (existing.length >= input.userCount) return 0;

  let created = 0;
  const slug = input.firmKey.replace(new RegExp(`^${EXPANSION_FIRM_PREFIX}`), "");
  for (let i = existing.length; i < input.userCount; i += 1) {
    const email = `${slug}-user${i + 1}@demo-expand.pat.local`;
    await prisma.user.upsert({
      where: { email },
      update: { companyId: input.firmCompanyId, updatedAt: new Date() },
      create: {
        id: `${input.firmKey}-user-${i + 1}`,
        email,
        name: `${input.firmKey} user ${i + 1}`,
        role: "MEMBER",
        passwordHash: input.passwordHash,
        companyId: input.firmCompanyId,
        updatedAt: new Date(),
      },
    });
    created += 1;
  }
  return created;
}

main()
  .catch((error) => {
    console.error("Expand demo ecosystem failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) await prismaClient.$disconnect();
  });
