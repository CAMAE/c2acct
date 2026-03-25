import { PrismaClient, CompanyType, ModuleScope, QuestionInputType, SubjectKind } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const MODULE_KEY = "firm_alignment_v1";
const MODULE_TITLE = "Firm Alignment Survey";
const TIER1_BADGE_NAME = "Tier 1 Alignment Unlocked";
const DEMO_COMPANY_NAME = "Demo Company";

const questions = [
  {
    key: "alignment_q1",
    prompt: "How clearly is your operating model documented?",
    order: 1,
  },
  {
    key: "alignment_q2",
    prompt: "How consistently do teams follow the documented process?",
    order: 2,
  },
  {
    key: "alignment_q3",
    prompt: "How effective is cross-functional communication?",
    order: 3,
  },
];

const tier1Insights = [
  {
    key: "tier1_alignment_baseline",
    title: "Alignment Baseline",
    body: "Where the firm is now, in practical operating terms.",
  },
  {
    key: "tier1_operating_system_map",
    title: "Operating System Map",
    body: "How work moves through the firm today and where operating friction concentrates.",
  },
  {
    key: "tier1_risk_control_posture",
    title: "Risk & Control Posture",
    body: "The control posture implied by the current operating discipline and score pattern.",
  },
  {
    key: "tier1_implementation_roadmap",
    title: "Implementation Roadmap",
    body: "The next practical steps to move from baseline alignment to institutional repeatability.",
  },
];

async function ensureSurveyModule() {
  const now = new Date();

  const moduleRecord = await prisma.surveyModule.upsert({
    where: { key: MODULE_KEY },
    update: {
      title: MODULE_TITLE,
      description: "Baseline institutional alignment assessment for a firm.",
      scope: ModuleScope.FIRM,
      active: true,
      version: 1,
      weight: 1,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      key: MODULE_KEY,
      title: MODULE_TITLE,
      description: "Baseline institutional alignment assessment for a firm.",
      scope: ModuleScope.FIRM,
      active: true,
      version: 1,
      weight: 1,
      updatedAt: now,
    },
  });

  for (const question of questions) {
    const existing = await prisma.surveyQuestion.findFirst({
      where: {
        moduleId: moduleRecord.id,
        key: question.key,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.surveyQuestion.update({
        where: { id: existing.id },
        data: {
          prompt: question.prompt,
          inputType: QuestionInputType.SLIDER,
          weight: 1,
          order: question.order,
          required: true,
          updatedAt: now,
        },
      });
      continue;
    }

    await prisma.surveyQuestion.create({
      data: {
        id: randomUUID(),
        moduleId: moduleRecord.id,
        key: question.key,
        prompt: question.prompt,
        inputType: QuestionInputType.SLIDER,
        weight: 1,
        order: question.order,
        required: true,
        updatedAt: now,
      },
    });
  }

  return moduleRecord;
}

async function ensureTier1Content(moduleId: string) {
  const now = new Date();

  const badge = await prisma.badge.upsert({
    where: { id: "tier1-alignment-unlocked" },
    update: {
      name: TIER1_BADGE_NAME,
      updatedAt: now,
    },
    create: {
      id: "tier1-alignment-unlocked",
      name: TIER1_BADGE_NAME,
      updatedAt: now,
    },
  });

  await prisma.badgeRule.upsert({
    where: {
      badgeId_moduleId: {
        badgeId: badge.id,
        moduleId,
      },
    },
    update: {
      minScore: 0,
      required: true,
    },
    create: {
      id: randomUUID(),
      badgeId: badge.id,
      moduleId,
      minScore: 0,
      required: true,
    },
  });

  for (const insight of tier1Insights) {
    await prisma.insight.upsert({
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
      id: randomUUID(),
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
  const moduleRecord = await ensureSurveyModule();
  const badge = await ensureTier1Content(moduleRecord.id);
  const demoCompany = await ensureDemoCompany();
  const subject = await ensureCompanySubject(demoCompany.id, demoCompany.name);
  const portal = await ensureDefaultPortal();

  const questionCount = await prisma.surveyQuestion.count({
    where: { moduleId: moduleRecord.id },
  });

  const tier1InsightCount = await prisma.insight.count({
    where: { tier: 1, active: true },
  });

  console.log("Seed complete", {
    moduleKey: moduleRecord.key,
    moduleId: moduleRecord.id,
    questionCount,
    badgeId: badge.id,
    badgeName: badge.name,
    tier1InsightCount,
    demoCompanyId: demoCompany.id,
    demoCompanyName: demoCompany.name,
    subjectId: subject.id,
    portalKey: portal.key,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
