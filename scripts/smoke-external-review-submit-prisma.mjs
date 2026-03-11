import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  CompanyType,
  ExternalReviewStatus,
  ModuleAxis,
  ModuleScope,
  PrismaClient,
  ProductKind,
} from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const REVIEWER_COMPANY_SLUG = "demo-reviewer-co";
const SUBJECT_COMPANY_SLUG = "demo-subject-vendor-co";
const SUBJECT_PRODUCT_SLUG = "demo-subject-vendor-product";
const REVIEW_MODULE_KEY = "product_workflow_fit_review_v1";

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

async function main() {
  const reviewerCompany = await ensureReviewerCompany();
  const subjectCompany = await ensureSubjectCompany();
  const subjectProduct = await ensureSubjectProduct(subjectCompany.id);
  const moduleRecord = await ensureExternalReviewModule();

  const answers = {
    workflow_fit_score: 4,
    integration_clarity_score: 3,
    notes: "Smoke test external review submission.",
  };

  const created = await prisma.externalReviewSubmission.create({
    data: {
      id: randomUUID(),
      moduleId: moduleRecord.id,
      reviewerCompanyId: reviewerCompany.id,
      subjectCompanyId: subjectCompany.id,
      subjectProductId: subjectProduct.id,
      answers,
      reviewStatus: ExternalReviewStatus.SUBMITTED,
    },
    select: {
      id: true,
      moduleId: true,
      reviewerCompanyId: true,
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
