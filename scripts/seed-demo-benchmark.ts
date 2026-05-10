import type { PrismaClient } from "@prisma/client";

import { applyRepoEnv } from "@/lib/env/repoEnv";

let prismaClient: { $disconnect(): Promise<void> } | null = null;

const DEMO_BENCH_PASSWORD =
  process.env.PAT_DEMO_BENCH_PASSWORD ?? "Pat-Demo-Bench-Consultant-2026";

async function main() {
  applyRepoEnv();

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
    { planEcosystems },
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/demoPatEcosystemSeed"),
    import("@/lib/firmPat"),
    import("@/lib/userPat"),
    import("@/lib/vendorPat"),
    import("@/lib/auth/passwords"),
    import("@/lib/demo-seed/combinator"),
  ]);

  prismaClient = prisma;

  // Ensure module catalogs exist (idempotent).
  await ensureUserPatScaffold();
  const [vendorModule, _firmModules, firmProductModule, alignmentModules, source] = await Promise.all([
    ensureVendorProductModule(),
    ensureFirmAlignmentSystem(),
    ensureFirmProductModule(),
    loadFirmAlignmentModules(prisma),
    ensureResearchSource(prisma),
  ]);
  void _firmModules;

  const passwordHash = await hashPilotPassword(DEMO_BENCH_PASSWORD);
  const plans = planEcosystems();

  const counts = {
    ecosystems: 0,
    vendors: 0,
    products: 0,
    consultants: 0,
    firms: 0,
    firmModuleSubmissions: 0,
    firmProductReviews: 0,
    linkedFirmUsers: 0,
  };

  for (const [ecosystemIndex, plan] of plans.entries()) {
    // 1) Vendor + products + vendor self-assessment.
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
    }

    // 2) Consultant User + ConsultantProfile (uses scrypt-hashed password so
    //    the credentials provider's verifyPilotPassword path can authenticate).
    const consultantUserId = await upsertConsultantUser(prisma, {
      ...plan.consultant,
      passwordHash,
    });
    const consultantProfileId = await upsertConsultantProfile(prisma, {
      userId: consultantUserId,
      profileId: plan.consultant.profileId,
    });
    counts.consultants += 1;

    // 3) Ecosystem (with vendorCompanyId + consultantProfileId set) + ConsultantAssignment.
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
      update: {
        ecosystemId: plan.ecosystemId,
        active: true,
      },
      create: {
        id: stableId("demo-bench-assignment", `${plan.ecosystemId}-${consultantProfileId}`),
        consultantProfileId,
        ecosystemId: plan.ecosystemId,
        active: true,
      },
    });

    // 4) Firms (Company + Subject + Membership + EcosystemFirm + linked Users + module submissions + product reviews).
    for (const [firmIndex, firmPlan] of plan.firms.entries()) {
      const seededFirm = await ensureFirm(prisma, firmPlan.demoFirmInput);
      counts.firms += 1;

      await prisma.ecosystemFirm.upsert({
        where: { firmCompanyId: seededFirm.company.id },
        update: { ecosystemId: plan.ecosystemId },
        create: {
          ecosystemId: plan.ecosystemId,
          firmCompanyId: seededFirm.company.id,
        },
      });

      const linkedUsers = await ensureLinkedFirmUsers(prisma, {
        firmCompanyId: seededFirm.company.id,
        firmKey: firmPlan.demoFirmInput.key,
        userCount: firmPlan.userCount,
        passwordHash,
      });
      counts.linkedFirmUsers += linkedUsers;

      // Module submissions: respect archetype completionRate (so sample-thin
      // firms ship 1-2 of 5 modules complete instead of all 5).
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

      // Firm product reviews against the subset selected by the combinator.
      // productReviewIds reference the JSON-bank id (catalog slug); the
      // SeededProduct stores the original DemoProductInput on `.input` whose
      // `.key` matches.
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

  console.log("\nDemo benchmark seed complete:", counts);
  console.log(
    `Demo consultants signed in via the credentials provider with scrypt-hashed password "${DEMO_BENCH_PASSWORD}".`
  );
}

async function upsertConsultantUser(
  prisma: PrismaClient,
  input: { userId: string; email: string; name: string; passwordHash: string }
): Promise<string> {
  const result = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      passwordHash: input.passwordHash,
      role: "MEMBER",
      updatedAt: new Date(),
    },
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
    create: {
      id: input.profileId,
      userId: input.userId,
      active: true,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
  return result.id;
}

async function ensureLinkedFirmUsers(
  prisma: PrismaClient,
  input: {
    firmCompanyId: string;
    firmKey: string;
    userCount: number;
    passwordHash: string;
  }
): Promise<number> {
  const existing = await prisma.user.findMany({
    where: { companyId: input.firmCompanyId },
    select: { id: true },
  });
  const target = input.userCount;
  if (existing.length >= target) return 0;

  let created = 0;
  for (let i = existing.length; i < target; i += 1) {
    const userId = `${input.firmKey}-user-${i + 1}`;
    const slug = input.firmKey.replace(/^demo-bench-firm-/, "");
    const email = `${slug}-user${i + 1}@demo-bench.pat.local`;
    await prisma.user.upsert({
      where: { email },
      update: {
        companyId: input.firmCompanyId,
        updatedAt: new Date(),
      },
      create: {
        id: userId,
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
    console.error("Demo benchmark seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
  });
