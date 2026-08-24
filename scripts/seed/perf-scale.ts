#!/usr/bin/env node
import type { PrismaClient } from "@prisma/client";

import { applyRepoEnv } from "@/lib/env/repoEnv";
import { classifyCompanyBoundaries } from "@/lib/dataBoundaryBackfill";
import {
  DEFAULT_PERF_SCALE_FIRM_COUNT,
  PERF_SCALE_ECOSYSTEM_PREFIX,
  PERF_SCALE_CONSULTANT_EMAIL,
  PERF_SCALE_FIRM_EMAIL_DOMAIN,
  PERF_SCALE_FIRM_PREFIX,
  PERF_SCALE_VENDOR_PREFIX,
  assertPerfScaleBoundary,
  planPerfScaleEcosystem,
} from "@/lib/demo-seed/perfScale";

/**
 * PERF-SCALE seed — a synthetic single-ecosystem cohort at charter scale.
 *
 * Why this exists: the local seed's largest ecosystem is ~15 firms, and at that
 * size a per-firm fan-out and a batched query measure the same, because the
 * per-firm work dominates the fan-out overhead. Every perf question about
 * per-firm aggregation is therefore unanswerable on the current bench, not just
 * AUDIT-WS9-001's. This seed makes the firm count a parameter so those
 * questions can be asked at the scale where the answer differs.
 *
 * Boundary: writes ONLY inside the perf-scale-* namespace, asserted structurally
 * before the first row (assertPerfScaleBoundary). It never touches the pilot
 * cohort, the canonical demo-bench-* cohort, or the demo-expand-* cohort. Every
 * company it creates is classified non-production, so this data can never reach
 * a published benchmark.
 *
 * Idempotent + deterministic: all writes are upserts on stable ids derived from
 * the plan. Re-running --apply does not grow row counts.
 *
 * Usage:
 *   node --import tsx scripts/seed/perf-scale.ts                  # DRY RUN — prints the plan, writes nothing
 *   node --import tsx scripts/seed/perf-scale.ts --apply          # writes 47 firms (default)
 *   node --import tsx scripts/seed/perf-scale.ts --apply --firms=90
 *   node --import tsx scripts/seed/perf-scale.ts --teardown       # removes the perf-scale cohort
 */

const APPLY = process.argv.includes("--apply");
const TEARDOWN = process.argv.includes("--teardown");
const PERF_SCALE_PASSWORD = process.env.PAT_PERF_SCALE_PASSWORD ?? "Pat-Perf-Scale-2026";

function parseFirmCount(): number {
  const flag = process.argv.find((arg) => arg.startsWith("--firms="));
  if (!flag) return DEFAULT_PERF_SCALE_FIRM_COUNT;
  const value = Number.parseInt(flag.split("=")[1] ?? "", 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--firms must be a positive integer (got "${flag}")`);
  }
  return value;
}

let prismaClient: { $disconnect(): Promise<void> } | null = null;

async function main() {
  applyRepoEnv();

  if (TEARDOWN) {
    await teardown();
    return;
  }

  const firmCount = parseFirmCount();
  const plan = planPerfScaleEcosystem(firmCount);
  assertPerfScaleBoundary(plan);

  const plannedReviews = plan.firms.reduce((sum, firm) => sum + firm.productReviewIds.length, 0);
  const archetypeMix = plan.firms.reduce<Record<string, number>>((acc, firm) => {
    acc[firm.bankEntry.archetype] = (acc[firm.bankEntry.archetype] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n================ PERF-SCALE SEED — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  console.log(
    `Namespace: ${PERF_SCALE_ECOSYSTEM_PREFIX}* / ${PERF_SCALE_VENDOR_PREFIX}* / ${PERF_SCALE_FIRM_PREFIX}*  (never pilot, never demo-bench-*, never demo-expand-*)`
  );
  console.log(`\n  ${plan.ecosystemName}`);
  console.log(`    vendor:   ${plan.vendor.demoVendorInput.displayName} (${plan.vendor.demoVendorInput.products.length} products)`);
  console.log(`    firms:    ${plan.firms.length}`);
  console.log(
    `    mix:      ${Object.entries(archetypeMix).map(([key, count]) => `${key}×${count}`).join(", ")}`
  );
  console.log(`    reviews:  ${plannedReviews} planned firm product reviews`);

  if (!APPLY) {
    console.log("\nDRY RUN — no changes written. Re-run with --apply to execute.");
    console.log("Teardown (after --apply): node --import tsx scripts/seed/perf-scale.ts --teardown");
    return;
  }

  await applyPlan(plan);
}

async function applyPlan(plan: ReturnType<typeof planPerfScaleEcosystem>): Promise<void> {
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
  const startedAt = Date.now();
  await ensureUserPatScaffold();
  const [vendorModule, _firmModules, firmProductModule, alignmentModules, source] = await Promise.all([
    ensureVendorProductModule(),
    ensureFirmAlignmentSystem(),
    ensureFirmProductModule(),
    loadFirmAlignmentModules(prisma),
    ensureResearchSource(prisma),
  ]);
  void _firmModules;

  const passwordHash = await hashPilotPassword(PERF_SCALE_PASSWORD);
  const counts = {
    vendors: 0,
    products: 0,
    vendorProductAssessments: 0,
    firms: 0,
    firmModuleSubmissions: 0,
    firmProductReviews: 0,
    linkedFirmUsers: 0,
  };

  const seededVendor = await ensureVendor(prisma, {
    vendor: plan.vendor.demoVendorInput,
    vendorIndex: 0,
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

  await prisma.ecosystem.upsert({
    where: { id: plan.ecosystemId },
    update: { name: plan.ecosystemName, vendorCompanyId: seededVendor.company.id, consultantProfileId },
    create: {
      id: plan.ecosystemId,
      name: plan.ecosystemName,
      vendorCompanyId: seededVendor.company.id,
      consultantProfileId,
    },
  });

  await prisma.consultantAssignment.upsert({
    where: { consultantProfileId },
    update: { ecosystemId: plan.ecosystemId, active: true },
    create: {
      id: stableId("perf-scale-assignment", `${plan.ecosystemId}-${consultantProfileId}`),
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
    for (let moduleIndex = 0; moduleIndex < modulesToComplete; moduleIndex += 1) {
      const moduleEntry = alignmentModules[moduleIndex];
      if (!moduleEntry) break;
      await seedFirmAlignmentSubmission(prisma, {
        firm: firmPlan.demoFirmInput,
        companyId: seededFirm.company.id,
        subjectId: seededFirm.subject.id,
        module: moduleEntry,
        moduleIndex,
        firmIndex,
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
        relationshipIndex: firmIndex * 13 + reviewIndex,
      });
      counts.firmProductReviews += 1;
    }

    if ((firmIndex + 1) % 10 === 0) {
      console.log(`  …${firmIndex + 1}/${plan.firms.length} firms seeded`);
    }
  }

  // Data-integrity wall: mark every perf-scale company non-production so this
  // synthetic cohort is excluded from every published benchmark.
  const boundaryClassified = await classifyCompanyBoundaries(prisma);

  console.log("\nPerf-scale seed complete:", {
    ...counts,
    boundaryClassified,
    elapsedMs: Date.now() - startedAt,
  });
  console.log(`Ecosystem id: ${plan.ecosystemId}`);
  console.log(`Consultant:   ${plan.consultant.email} / ${PERF_SCALE_PASSWORD}`);
}

/** Remove the perf-scale cohort. Scoped strictly to the perf-scale-* namespace. */
async function teardown(): Promise<void> {
  const { default: prisma } = await import("@/lib/prisma");
  prismaClient = prisma;

  const ecosystems = await prisma.ecosystem.findMany({
    where: { id: { startsWith: PERF_SCALE_ECOSYSTEM_PREFIX } },
    select: { id: true },
  });
  // Company ids are derived from the seed key via stableId(), so the
  // perf-scale-* namespace shows up as an id PREFIX — Company has no `key`
  // column to match on directly.
  const firms = await prisma.company.findMany({
    where: { id: { startsWith: `demo-firm-company-${PERF_SCALE_FIRM_PREFIX}` } },
    select: { id: true },
  });
  const vendors = await prisma.company.findMany({
    where: { id: { startsWith: `demo-vendor-company-${PERF_SCALE_VENDOR_PREFIX}` } },
    select: { id: true },
  });
  const companyIds = [...firms, ...vendors].map((row) => row.id);

  console.log(
    `\nPERF-SCALE TEARDOWN — ${ecosystems.length} ecosystem(s), ${firms.length} firm(s), ${vendors.length} vendor(s).`
  );

  // Users first (FK to Company), then the ecosystem (cascades assignments and
  // membership), then the companies themselves.
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { endsWith: `@${PERF_SCALE_FIRM_EMAIL_DOMAIN}` } },
        { email: PERF_SCALE_CONSULTANT_EMAIL },
        ...(companyIds.length > 0 ? [{ companyId: { in: companyIds } }] : []),
      ],
    },
  });
  const deletedEcosystems = await prisma.ecosystem.deleteMany({
    where: { id: { startsWith: PERF_SCALE_ECOSYSTEM_PREFIX } },
  });
  const deletedCompanies =
    companyIds.length > 0
      ? await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
      : { count: 0 };

  console.log("Teardown complete:", {
    users: deletedUsers.count,
    ecosystems: deletedEcosystems.count,
    companies: deletedCompanies.count,
  });
}

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
  const slug = input.firmKey.replace(new RegExp(`^${PERF_SCALE_FIRM_PREFIX}`), "");
  for (let i = existing.length; i < input.userCount; i += 1) {
    const email = `${slug}-user${i + 1}@${PERF_SCALE_FIRM_EMAIL_DOMAIN}`;
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
    console.error("Perf-scale seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) await prismaClient.$disconnect();
  });
