import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  CompanyType,
  SponsorLaunchMode,
  SponsorProductAccessMode,
  SponsorRelationshipStatus,
  ModuleAxis,
  ModuleScope,
  PrismaClient,
  QuestionInputType,
  ProductKind,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";

const prisma = new PrismaClient();

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").trim();
const AUTH_COOKIE = (process.env.AUTH_COOKIE || "").trim();

const REVIEWER_COMPANY_SLUG = "demo-reviewer-co";
const SUBJECT_COMPANY_SLUG = "demo-subject-vendor-co";
const SUBJECT_PRODUCT_SLUG = "demo-subject-vendor-product";
const REVIEW_MODULE_KEY = "product_workflow_fit_review_v1";
const REVIEW_QUESTION_KEYS = ["workflow_fit_score", "integration_clarity_score"];

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

async function ensureSponsorRelationship(vendorCompanyId, firmCompanyId) {
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
    },
    create: {
      id: randomUUID(),
      vendorCompanyId,
      firmCompanyId,
      status: SponsorRelationshipStatus.ACTIVE,
      launchMode: SponsorLaunchMode.PRIVATE_LAUNCH,
      productAccessMode: SponsorProductAccessMode.ALL_PRODUCTS,
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

async function main() {
  const reviewerCompany = await ensureReviewerCompany();
  const subjectCompany = await ensureSubjectCompany();
  const subjectProduct = await ensureSubjectProduct(subjectCompany.id);
  await ensureSponsorRelationship(subjectCompany.id, reviewerCompany.id);
  const moduleRecord = await ensureExternalReviewModule();
  const questions = await ensureExternalReviewQuestions(moduleRecord.id);

  const workflowFitQuestion = questions.find((question) => question.key === REVIEW_QUESTION_KEYS[0]);
  const integrationQuestion = questions.find((question) => question.key === REVIEW_QUESTION_KEYS[1]);

  if (!workflowFitQuestion || !integrationQuestion) {
    throw new Error("Failed to seed external review questions");
  }

  const payload = {
    moduleKey: moduleRecord.key,
    subjectCompanyId: subjectCompany.id,
    subjectProductId: subjectProduct.id,
    answers: {
      [workflowFitQuestion.id]: 4,
      [integrationQuestion.id]: 3,
    },
  };

  if (!AUTH_COOKIE) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          mode: "HTTP_SKIPPED",
          reason:
            "AUTH_COOKIE is not set. Route auth relies on interactive NextAuth session cookie and is impractical to bootstrap non-interactively here.",
          fallbackCommand: "node scripts/smoke-external-review-submit-prisma.mjs",
          payload,
          module: moduleRecord,
          reviewerCompany,
          subjectCompany,
          subjectProduct,
        },
        null,
        2
      )
    );

    const fallback = spawnSync(process.execPath, ["scripts/smoke-external-review-submit-prisma.mjs"], {
      stdio: "inherit",
      env: process.env,
    });

    if (fallback.status !== 0) {
      process.exitCode = fallback.status ?? 1;
    }

    return;
  }

  const url = `${BASE_URL}/api/external-reviews/submit`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: AUTH_COOKIE,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  console.log(JSON.stringify({ status: response.status, body }, null, 2));
}

main()
  .catch((e) => {
    console.error("SMOKE_EXTERNAL_REVIEW_SUBMIT_HTTP_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
