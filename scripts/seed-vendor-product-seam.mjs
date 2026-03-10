import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient, CompanyType, ProductKind } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const VENDOR_SLUG = "demo-vendor-co";
const PLATFORM_SLUG = "demo-vendor-platform";
const POINT_SOLUTION_SLUG = "demo-vendor-point-solution";

const EXTERNAL_SOURCE = "vendor_directory";
const EXTERNAL_ENTITY_TYPE = "PRODUCT";
const EXTERNAL_RECORD_ID = "immutable-demo-vendor-point-solution-001";

async function ensureVendorCompany() {
  const existing = await prisma.company.findFirst({
    where: { slug: VENDOR_SLUG },
    select: { id: true },
  });

  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: {
        name: "Demo Vendor Co",
        type: CompanyType.VENDOR,
        websiteUrl: "https://demo-vendor.example",
        shortDescription: "Demo vendor profile for seam validation.",
        hqCountry: "US",
        primaryMarket: "Accounting",
        profileStatus: "SEEDED",
        externalStatus: "SEEDED",
        updatedAt: new Date(),
      },
      select: { id: true, name: true, slug: true, type: true },
    });
  }

  return prisma.company.create({
    data: {
      id: randomUUID(),
      name: "Demo Vendor Co",
      slug: VENDOR_SLUG,
      type: CompanyType.VENDOR,
      websiteUrl: "https://demo-vendor.example",
      shortDescription: "Demo vendor profile for seam validation.",
      hqCountry: "US",
      primaryMarket: "Accounting",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    select: { id: true, name: true, slug: true, type: true },
  });
}

async function ensurePlatformProduct(companyId) {
  return prisma.product.upsert({
    where: {
      companyId_slug: {
        companyId,
        slug: PLATFORM_SLUG,
      },
    },
    update: {
      name: "Demo Vendor Platform",
      productKind: ProductKind.PLATFORM,
      parentProductId: null,
      shortDescription: "Seeded platform product.",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      companyId,
      name: "Demo Vendor Platform",
      slug: PLATFORM_SLUG,
      productKind: ProductKind.PLATFORM,
      parentProductId: null,
      shortDescription: "Seeded platform product.",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    select: { id: true, name: true, slug: true, productKind: true, parentProductId: true },
  });
}

async function ensurePointSolutionProduct(companyId, parentProductId) {
  return prisma.product.upsert({
    where: {
      companyId_slug: {
        companyId,
        slug: POINT_SOLUTION_SLUG,
      },
    },
    update: {
      name: "Demo Vendor Point Solution",
      productKind: ProductKind.POINT_SOLUTION,
      parentProductId,
      shortDescription: "Seeded child point solution.",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      companyId,
      name: "Demo Vendor Point Solution",
      slug: POINT_SOLUTION_SLUG,
      productKind: ProductKind.POINT_SOLUTION,
      parentProductId,
      shortDescription: "Seeded child point solution.",
      profileStatus: "SEEDED",
      externalStatus: "SEEDED",
      updatedAt: new Date(),
    },
    select: { id: true, name: true, slug: true, productKind: true, parentProductId: true },
  });
}

async function ensureExternalProfileLink(companyId, productId) {
  return prisma.externalProfileLink.upsert({
    where: {
      source_externalEntityType_externalRecordId: {
        source: EXTERNAL_SOURCE,
        externalEntityType: EXTERNAL_ENTITY_TYPE,
        externalRecordId: EXTERNAL_RECORD_ID,
      },
    },
    update: {
      companyId,
      productId,
      canonicalUrl: "https://vendor-directory.example/demo-vendor-point-solution",
      externalSlug: "demo-vendor-point-solution",
      claimStatus: "SEEDED",
      syncMode: "MANUAL",
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      source: EXTERNAL_SOURCE,
      externalEntityType: EXTERNAL_ENTITY_TYPE,
      externalRecordId: EXTERNAL_RECORD_ID,
      externalSlug: "demo-vendor-point-solution",
      canonicalUrl: "https://vendor-directory.example/demo-vendor-point-solution",
      companyId,
      productId,
      claimStatus: "SEEDED",
      syncMode: "MANUAL",
      updatedAt: new Date(),
    },
    select: {
      id: true,
      source: true,
      externalEntityType: true,
      externalRecordId: true,
      companyId: true,
      productId: true,
    },
  });
}

async function main() {
  const company = await ensureVendorCompany();
  const platform = await ensurePlatformProduct(company.id);
  const pointSolution = await ensurePointSolutionProduct(company.id, platform.id);
  const externalLink = await ensureExternalProfileLink(company.id, pointSolution.id);

  console.log("SEED_VENDOR_PRODUCT_SEAM_OK", {
    company,
    platform,
    pointSolution,
    externalLink,
  });
}

main()
  .catch((e) => {
    console.error("SEED_VENDOR_PRODUCT_SEAM_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
