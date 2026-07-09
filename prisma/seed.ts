import { PrismaClient, CompanyType, SubjectKind } from "@prisma/client";
import { randomUUID } from "crypto";
import path from "node:path";
import {
  importAccountingTaxonomy,
  loadAccountingTaxonomyArtifact,
} from "../lib/research/accountingTaxonomy";
import { applyRepoEnv } from "../lib/env/repoEnv";
import {
  TIER1_ALIGNMENT_BADGE_ID,
  TIER1_ALIGNMENT_BADGE_NAME,
  TIER1_INSIGHTS,
} from "../lib/patUnlocks";
import { ensureLocalReviewUsers } from "../lib/auth/localReview";
import { FIRM_CAPABILITY_DEFINITIONS } from "../lib/firmCapabilities";
import { classifyCompanyBoundaries } from "../lib/dataBoundaryBackfill";

applyRepoEnv();

const prisma = new PrismaClient();

const DEMO_COMPANY_NAME = "Demo Company";
const DEMO_COMPANY_ID = "demo-firm-company-demo-company";

async function ensureTier1Content(moduleIds: string[]) {
  const now = new Date();

  const badge = await prisma.badge.upsert({
    where: { id: TIER1_ALIGNMENT_BADGE_ID },
    update: {
      name: TIER1_ALIGNMENT_BADGE_NAME,
      updatedAt: now,
    },
    create: {
      id: TIER1_ALIGNMENT_BADGE_ID,
      name: TIER1_ALIGNMENT_BADGE_NAME,
      updatedAt: now,
    },
  });

  await prisma.badgeRule.upsert({
    where: {
      badgeId_moduleId: {
        badgeId: badge.id,
        moduleId: moduleIds[0],
      },
    },
    update: {
      minScore: 0,
      required: false,
    },
    create: {
      id: randomUUID(),
      badgeId: badge.id,
      moduleId: moduleIds[0],
      minScore: 0,
      required: false,
    },
  });

  // Compatibility-only tier-1 cards still exist in the dashboard layer.
  // The five-module PAT firm system remains the canonical assessment model.
  for (const insight of TIER1_INSIGHTS) {
    const persistedInsight = await prisma.insight.upsert({
      where: { key: insight.key },
      update: {
        title: insight.title,
        body: insight.body,
        tier: 1,
        active: true,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: insight.key,
        title: insight.title,
        body: insight.body,
        tier: 1,
        active: true,
        updatedAt: now,
      },
    });

    await prisma.insightUnlockRule.upsert({
      where: {
        insightId_badgeId: {
          insightId: persistedInsight.id,
          badgeId: badge.id,
        },
      },
      update: {
        required: true,
      },
      create: {
        id: randomUUID(),
        insightId: persistedInsight.id,
        badgeId: badge.id,
        required: true,
      },
    });
  }

  return badge;
}

async function ensureDemoCompany() {
  const existing = await prisma.company.findFirst({
    where: { name: DEMO_COMPANY_NAME },
    select: { id: true, name: true, type: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.company.create({
    data: {
      id: DEMO_COMPANY_ID,
      name: DEMO_COMPANY_NAME,
      type: CompanyType.FIRM,
      updatedAt: new Date(),
    },
    select: { id: true, name: true, type: true },
  });
}

async function ensureCompanySubject(companyId: string, companyName: string) {
  return prisma.subject.upsert({
    where: { companyId },
    update: {
      displayName: companyName,
      kind: SubjectKind.ORGANIZATION,
    },
    create: {
      id: randomUUID(),
      key: `company:${companyId}`,
      displayName: companyName,
      kind: SubjectKind.ORGANIZATION,
      companyId,
    },
    select: { id: true, key: true, companyId: true, kind: true },
  });
}

async function ensureDefaultPortal() {
  return prisma.portal.upsert({
    where: { key: "pat-assessment" },
    update: {
      title: "PAT Assessment",
      subjectKind: SubjectKind.ORGANIZATION,
      active: true,
    },
    create: {
      id: "pat-assessment",
      key: "pat-assessment",
      title: "PAT Assessment",
      subjectKind: SubjectKind.ORGANIZATION,
      active: true,
    },
    select: { id: true, key: true },
  });
}

async function main() {
  const { ensureFirmAlignmentSystem, FIRM_MODULE_DEFINITIONS } = await import("../lib/firmPat");
  const modules = await ensureFirmAlignmentSystem();
  const badge = await ensureTier1Content(modules.map((module) => module.id));
  const demoCompany = await ensureDemoCompany();
  const subject = await ensureCompanySubject(demoCompany.id, demoCompany.name);
  const portal = await ensureDefaultPortal();
  const localReviewSeed = await ensureLocalReviewUsers(prisma);
  const taxonomyArtifact = await loadAccountingTaxonomyArtifact(
    path.join(process.cwd(), "data/research/accounting-software-taxonomy-v1.json")
  );
  const taxonomySummary = await importAccountingTaxonomy({
    prisma,
    artifact: taxonomyArtifact,
    apply: true,
  });

  // Data-integrity wall (CLASS 1): classify demo/pilot companies so a reseed
  // never leaves synthetic rows defaulting to PRODUCTION.
  const boundaryClassification = await classifyCompanyBoundaries(prisma);

  const questionCounts = await Promise.all(
    modules.map(async (module) => ({
      key: module.key,
      questionCount: await prisma.surveyQuestion.count({
        where: { moduleId: module.id },
      }),
      sectionCount: await prisma.surveySection.count({
        where: { moduleId: module.id },
      }),
      moduleCapabilityCount: await prisma.moduleCapability.count({
        where: { moduleId: module.id },
      }),
    }))
  );

  const firmQuestionMappings = await prisma.surveyQuestionCapability.count({
    where: {
      SurveyQuestion: {
        moduleId: {
          in: modules.map((module) => module.id),
        },
      },
    },
  });

  const tier1InsightCount = await prisma.insight.count({
    where: { tier: 1, active: true },
  });

  console.log("Seed complete", {
    firmModuleKeys: modules.map((module) => module.key),
    firmModuleCount: modules.length,
    expectedFirmModuleCount: FIRM_MODULE_DEFINITIONS.length,
    totalFirmQuestionCount: questionCounts.reduce((total, module) => total + module.questionCount, 0),
    firmCapabilityNodeCount: FIRM_CAPABILITY_DEFINITIONS.length,
    totalFirmQuestionCapabilityMappings: firmQuestionMappings,
    questionCounts,
    badgeId: badge.id,
    badgeName: badge.name,
    tier1InsightCount,
    demoCompanyId: demoCompany.id,
    demoCompanyName: demoCompany.name,
    subjectId: subject.id,
    portalKey: portal.key,
    localReviewAuthSeeded: localReviewSeed.seeded,
    localReviewUserEmails: localReviewSeed.userEmails,
    taxonomyBuckets: taxonomySummary.taxonomyBuckets,
    taxonomyProducts: taxonomySummary.products,
    boundaryClassified: boundaryClassification,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
