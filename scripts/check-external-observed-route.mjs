import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").trim();
const AUTH_COOKIE = (process.env.AUTH_COOKIE || "").trim();

const MODULE_KEY = (process.env.EXTERNAL_REVIEW_MODULE_KEY || "product_workflow_fit_review_v1").trim();
const SUBJECT_COMPANY_SLUG = (process.env.EXTERNAL_REVIEW_SUBJECT_COMPANY_SLUG || "demo-subject-vendor-co").trim();
const SUBJECT_PRODUCT_SLUG = (process.env.EXTERNAL_REVIEW_SUBJECT_PRODUCT_SLUG || "demo-subject-vendor-product").trim();

async function main() {
  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: MODULE_KEY },
    select: { id: true, key: true, axis: true },
  });

  if (!moduleRecord) {
    throw new Error(`Module not found for key=${MODULE_KEY}`);
  }

  const subjectCompany = await prisma.company.findFirst({
    where: { slug: SUBJECT_COMPANY_SLUG },
    select: { id: true, slug: true, name: true },
  });

  if (!subjectCompany) {
    throw new Error(`Subject company not found for slug=${SUBJECT_COMPANY_SLUG}`);
  }

  const subjectProduct = await prisma.product.findFirst({
    where: {
      companyId: subjectCompany.id,
      slug: SUBJECT_PRODUCT_SLUG,
    },
    select: { id: true, slug: true, name: true },
  });

  if (!subjectProduct) {
    throw new Error(`Subject product not found for slug=${SUBJECT_PRODUCT_SLUG}`);
  }

  const url = `${BASE_URL}/api/external-reviews/observed?moduleKey=${encodeURIComponent(moduleRecord.key)}&subjectCompanyId=${encodeURIComponent(subjectCompany.id)}&subjectProductId=${encodeURIComponent(subjectProduct.id)}`;

  console.log(`URL: ${url}`);
  console.log(`AUTH_COOKIE present: ${AUTH_COOKIE ? "yes" : "no"}`);

  if (!AUTH_COOKIE) {
    console.log(
      "Route verification requires an authenticated browser session cookie. Set AUTH_COOKIE and rerun this script."
    );
    return;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      cookie: AUTH_COOKIE,
    },
  });

  const body = await response.json().catch(() => ({}));
  console.log(JSON.stringify({ status: response.status, body }, null, 2));
}

main()
  .catch((e) => {
    console.error("CHECK_EXTERNAL_OBSERVED_ROUTE_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
