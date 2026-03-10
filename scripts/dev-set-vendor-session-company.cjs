require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const TEST_USER_EMAIL = (process.env.TEST_USER_EMAIL || "").trim().toLowerCase();
const TARGET_COMPANY_SLUG = (process.env.TARGET_COMPANY_SLUG || "demo-vendor-co").trim();
const BACKUP_FILE = process.env.USER_COMPANY_BACKUP_FILE || path.join("scripts", ".tmp-user-company-backup.json");

(async () => {
  if (!TEST_USER_EMAIL) {
    throw new Error("TEST_USER_EMAIL is required");
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: TEST_USER_EMAIL, mode: "insensitive" } },
    select: { id: true, email: true, companyId: true },
  });

  if (!user) {
    throw new Error(`User not found for TEST_USER_EMAIL=${TEST_USER_EMAIL}`);
  }

  const company = await prisma.company.findFirst({
    where: { slug: TARGET_COMPANY_SLUG, type: "VENDOR" },
    select: { id: true, slug: true, name: true, type: true },
  });

  if (!company) {
    throw new Error(`Vendor company not found for slug=${TARGET_COMPANY_SLUG}`);
  }

  const firstProduct = await prisma.product.findFirst({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const backupPayload = {
    at: new Date().toISOString(),
    userId: user.id,
    userEmail: user.email,
    previousCompanyId: user.companyId,
    nextCompanyId: company.id,
    nextCompanySlug: company.slug,
  };

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupPayload, null, 2));

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { companyId: company.id },
    select: { id: true, email: true, companyId: true },
  });

  const browserVerification = {
    reason:
      "Auth.js JWT may still hold the old companyId until browser session is refreshed.",
    steps: [
      "Sign out in the browser session used for local verification.",
      "Sign back in with the same TEST_USER_EMAIL account.",
      "If unauthorized still appears, clear auth cookies for localhost and sign in again.",
      "Then open /survey, choose Product Context, and submit vendor_product_fit_v1.",
      "Verify /results?productId=<id> and /outputs?productId=<id>.",
    ],
    expectedUrls: firstProduct
      ? {
          survey: `/survey/vendor_product_fit_v1?productId=${firstProduct.id}`,
          results: `/results?productId=${firstProduct.id}`,
          outputs: `/outputs?productId=${firstProduct.id}`,
        }
      : null,
  };

  console.log(JSON.stringify({
    ok: true,
    backupFile: BACKUP_FILE,
    user: updated,
    vendorCompany: company,
    firstVendorProduct: firstProduct,
    browserVerification,
  }, null, 2));
})()
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
