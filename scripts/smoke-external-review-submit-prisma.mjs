import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  CompanyType,
  ExternalReviewStatus,
  ModuleAxis,
  ModuleScope,
  PrismaClient,
  QuestionInputType,
  ProductKind,
  SponsorLaunchMode,
  SponsorProductAccessMode,
  SponsorRelationshipStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const REVIEWER_COMPANY_SLUG = "demo-reviewer-co";
const SUBJECT_COMPANY_SLUG = "demo-subject-vendor-co";
const SUBJECT_PRODUCT_SLUG = "demo-subject-vendor-product";
const REVIEW_MODULE_KEY = "product_workflow_fit_review_v1";
const REVIEW_QUESTION_KEYS = ["workflow_fit_score", "integration_clarity_score"];
const SCORE_VERSION = 1;
const SCALE_MIN = 1;
const SCALE_MAX = 5;

async function ensureReviewerCompany() {
  const existing = await prisma.company.findFirst({
    where: { slug: REVIEWER_COMPANY_SLUG },
    select: { id: true },
  });

  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: {
        name: "Demo Reviewer Co",
        type: CompanyType.FIRM,
        websiteUrl: "https://demo-reviewer.example",
        shortDescription: "Demo reviewer company for external-review smoke tests.",
        profileStatus: "SEEDED",
        externalStatus: "SEEDED",
        updatedAt: new Date(),
      },
      select: { id: true, slug: true, type: true, name: true },
    });
  }

  return prisma.company.create({
    data: {
      id: randomUUID(),
      name: "Demo Reviewer Co",
      slug: REVIEWER_COMPANY_SLUG,
      type: CompanyType.FIRM,
      websiteUrl: "https://demo-reviewer.example",
      shortDescription: "Demo reviewer company for external-review smoke tests.",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    select: { id: true, slug: true, type: true, name: true },
  });
}

async function ensureReviewerUser(companyId) {
  const email = "external-reviewer@demo-reviewer.example";
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: "External Reviewer",
        companyId,
        updatedAt: new Date(),
      },
      select: { id: true, email: true, companyId: true },
    });
  }

  return prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      name: "External Reviewer",
      companyId,
      updatedAt: new Date(),
    },
    select: { id: true, email: true, companyId: true },
  });
}

async function ensureSubjectCompany() {
  const existing = await prisma.company.findFirst({
    where: { slug: SUBJECT_COMPANY_SLUG },
    select: { id: true },
  });

  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: {
        name: "Demo Subject Vendor Co",
        type: CompanyType.VENDOR,
        websiteUrl: "https://demo-subject-vendor.example",
        shortDescription: "Demo subject vendor for external-review smoke tests.",
        profileStatus: "SEEDED",
        externalStatus: "SEEDED",
        updatedAt: new Date(),
      },
      select: { id: true, slug: true, type: true, name: true },
    });
  }

  return prisma.company.create({
    data: {
      id: randomUUID(),
      name: "Demo Subject Vendor Co",
      slug: SUBJECT_COMPANY_SLUG,
      type: CompanyType.VENDOR,
      websiteUrl: "https://demo-subject-vendor.example",
      shortDescription: "Demo subject vendor for external-review smoke tests.",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    select: { id: true, slug: true, type: true, name: true },
  });
}

async function ensureSubjectProduct(companyId) {
  return prisma.product.upsert({
    where: {
      companyId_slug: {
        companyId,
        slug: SUBJECT_PRODUCT_SLUG,
      },
    },
    update: {
      name: "Demo Subject Vendor Product",
      productKind: ProductKind.POINT_SOLUTION,
      shortDescription: "Subject product for external-review smoke tests.",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      companyId,
      name: "Demo Subject Vendor Product",
      slug: SUBJECT_PRODUCT_SLUG,
      productKind: ProductKind.POINT_SOLUTION,
      shortDescription: "Subject product for external-review smoke tests.",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    select: { id: true, slug: true, companyId: true, name: true },
  });
}

async function ensureExternalReviewModule() {
  return prisma.surveyModule.upsert({
    where: { key: REVIEW_MODULE_KEY },
    update: {
      title: "Product Workflow Fit External Review",
      description: "Demo external-review module for product workflow fit.",
      axis: ModuleAxis.EXTERNAL_REVIEW,
      scope: ModuleScope.PRODUCT,
      active: true,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      key: REVIEW_MODULE_KEY,
      title: "Product Workflow Fit External Review",
      description: "Demo external-review module for product workflow fit.",
      axis: ModuleAxis.EXTERNAL_REVIEW,
      scope: ModuleScope.PRODUCT,
      version: 1,
      active: true,
      updatedAt: new Date(),
    },
    select: { id: true, key: true, axis: true, scope: true, active: true },
  });
}

async function ensureSponsorRelationship(vendorCompanyId, firmCompanyId, createdByUserId) {
  return prisma.sponsorRelationship.upsert({
    where: {
      vendorCompanyId_firmCompanyId: {
        vendorCompanyId,
        firmCompanyId,
      },
    },
    update: {
      status: SponsorRelationshipStatus.ACTIVE,
      launchMode: SponsorLaunchMode.PRIVATE_LAUNCH,
      productAccessMode: SponsorProductAccessMode.ALL_PRODUCTS,
      createdByUserId,
    },
    create: {
      id: randomUUID(),
      vendorCompanyId,
      firmCompanyId,
      status: SponsorRelationshipStatus.ACTIVE,
      launchMode: SponsorLaunchMode.PRIVATE_LAUNCH,
      productAccessMode: SponsorProductAccessMode.ALL_PRODUCTS,
      createdByUserId,
    },
    select: { id: true },
  });
}

async function ensureExternalReviewQuestions(moduleId) {
  const desired = [
    {
      key: REVIEW_QUESTION_KEYS[0],
      prompt: "How well does the product fit the target workflow?",
      order: 1,
    },
    {
      key: REVIEW_QUESTION_KEYS[1],
      prompt: "How clear are the product integrations?",
      order: 2,
    },
  ];

  const existing = await prisma.surveyQuestion.findMany({
    where: { moduleId, key: { in: REVIEW_QUESTION_KEYS } },
    select: { id: true, key: true },
  });

  const existingByKey = new Map(existing.map((question) => [question.key, question]));

  for (const question of desired) {
    const existingQuestion = existingByKey.get(question.key);
    if (existingQuestion) {
      await prisma.surveyQuestion.update({
        where: { id: existingQuestion.id },
        data: {
          prompt: question.prompt,
          inputType: QuestionInputType.SLIDER,
          order: question.order,
          required: true,
          weight: 1,
          updatedAt: new Date(),
        },
      });
      continue;
    }

    await prisma.surveyQuestion.create({
      data: {
        id: randomUUID(),
        moduleId,
        key: question.key,
        prompt: question.prompt,
        inputType: QuestionInputType.SLIDER,
        order: question.order,
        required: true,
        weight: 1,
        updatedAt: new Date(),
      },
    });
  }

  return prisma.surveyQuestion.findMany({
    where: { moduleId, key: { in: REVIEW_QUESTION_KEYS } },
    select: { id: true, key: true },
    orderBy: { order: "asc" },
  });
}

function computeScore(answers) {
  const values = Object.values(answers).filter((value) => Number.isFinite(value));
  const answeredCount = values.length;
  if (answeredCount === 0) {
    return { score: 0, weightedAvg: null };
  }

  const weightedAvg = values.reduce((sum, value) => sum + value, 0) / answeredCount;
  return {
    score: Math.round(((weightedAvg - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100),
    weightedAvg,
  };
}

function evaluateSignalIntegrity(answers, expectedQuestionCount) {
  const answeredCount = Object.keys(answers).length;
  const coverage = expectedQuestionCount > 0 ? answeredCount / expectedQuestionCount : 1;
  const flags = [];

  if (coverage < 0.6) {
    flags.push("LOW_COVERAGE");
  } else if (coverage < 0.8) {
    flags.push("MED_COVERAGE");
  }

  if (answeredCount > 0 && answeredCount < 6) {
    flags.push("LOW_NUMERIC_SAMPLE");
  }

  let score = 1;
  if (flags.includes("LOW_COVERAGE")) score -= 0.35;
  if (flags.includes("MED_COVERAGE")) score -= 0.18;
  if (flags.includes("LOW_NUMERIC_SAMPLE")) score -= 0.1;

  return {
    score: Math.max(0, Math.min(1, Math.round(score * 1000) / 1000)),
    flags,
  };
}

async function main() {
  const reviewerCompany = await ensureReviewerCompany();
  const reviewerUser = await ensureReviewerUser(reviewerCompany.id);
  const subjectCompany = await ensureSubjectCompany();
  const subjectProduct = await ensureSubjectProduct(subjectCompany.id);
  await ensureSponsorRelationship(subjectCompany.id, reviewerCompany.id, reviewerUser.id);
  const moduleRecord = await ensureExternalReviewModule();
  const questions = await ensureExternalReviewQuestions(moduleRecord.id);

  const workflowFitQuestion = questions.find((question) => question.key === REVIEW_QUESTION_KEYS[0]);
  const integrationQuestion = questions.find((question) => question.key === REVIEW_QUESTION_KEYS[1]);

  if (!workflowFitQuestion || !integrationQuestion) {
    throw new Error("Failed to seed external review questions");
  }

  const answers = {
    [workflowFitQuestion.id]: 4,
    [integrationQuestion.id]: 3,
  };
  const scoring = computeScore(answers);
  const integrity = evaluateSignalIntegrity(answers, questions.length);

  const created = await prisma.externalReviewSubmission.create({
    data: {
      id: randomUUID(),
      moduleId: moduleRecord.id,
      reviewerCompanyId: reviewerCompany.id,
      reviewerUserId: reviewerUser.id,
      subjectCompanyId: subjectCompany.id,
      subjectProductId: subjectProduct.id,
      answers,
      normalizedDimensions: {
        workflow_fit_score: 75,
        integration_clarity_score: 50,
      },
      score: scoring.score,
      weightedAvg: scoring.weightedAvg,
      scoreVersion: SCORE_VERSION,
      signalIntegrityScore: integrity.score,
      integrityFlags: integrity.flags,
      reviewStatus: ExternalReviewStatus.FINALIZED,
    },
    select: {
      id: true,
      moduleId: true,
      reviewerCompanyId: true,
      reviewerUserId: true,
      subjectCompanyId: true,
      subjectProductId: true,
      reviewStatus: true,
      createdAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "PRISMA_FALLBACK",
        reason:
          "HTTP route auth requires an interactive NextAuth browser session cookie; fallback writes directly for local lane verification.",
        module: moduleRecord,
        reviewerCompany,
        reviewerUser,
        subjectCompany,
        subjectProduct,
        created,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error("SMOKE_EXTERNAL_REVIEW_SUBMIT_PRISMA_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
