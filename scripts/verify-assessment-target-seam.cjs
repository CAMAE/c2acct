require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COMPANY_ID = process.env.VERIFY_COMPANY_ID || "de43a0bb-c901-4b95-a2d7-0f4bcfca0804";
const OWNED_PRODUCT_ID = process.env.VERIFY_PRODUCT_ID || "97272c7a-9442-4e93-9e88-4654ddafb1c1";
const FOREIGN_PRODUCT_ID = process.env.VERIFY_FOREIGN_PRODUCT_ID || "";

async function resolveTarget({ companyId, requestedProductId }) {
  const normalizedCompanyId = typeof companyId === "string" ? companyId.trim() : "";
  if (!normalizedCompanyId) {
    return { ok: false, status: 403, error: "No company assigned" };
  }

  const normalizedProductId = typeof requestedProductId === "string" ? requestedProductId.trim() : "";
  if (!normalizedProductId) {
    return {
      ok: true,
      context: { companyId: normalizedCompanyId, productId: null, mode: "COMPANY" },
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: normalizedProductId },
    select: { id: true, companyId: true },
  });

  if (!product) {
    return { ok: false, status: 400, error: "Invalid productId" };
  }

  if (product.companyId !== normalizedCompanyId) {
    return { ok: false, status: 403, error: "Product does not belong to your company" };
  }

  return {
    ok: true,
    context: { companyId: normalizedCompanyId, productId: product.id, mode: "PRODUCT" },
  };
}

(async () => {
  const noProduct = await resolveTarget({ companyId: COMPANY_ID, requestedProductId: null });
  const ownedProduct = await resolveTarget({ companyId: COMPANY_ID, requestedProductId: OWNED_PRODUCT_ID });
  let foreignProduct = null;

  if (FOREIGN_PRODUCT_ID) {
    const foreignProductRecord = await prisma.product.findUnique({
      where: { id: FOREIGN_PRODUCT_ID },
      select: { id: true, companyId: true },
    });

    if (!foreignProductRecord) {
      foreignProduct = { ok: false, status: 400, error: "Invalid VERIFY_FOREIGN_PRODUCT_ID" };
    } else if (foreignProductRecord.companyId === COMPANY_ID) {
      foreignProduct = { ok: false, status: 400, error: "VERIFY_FOREIGN_PRODUCT_ID must belong to another company" };
    } else {
      foreignProduct = await resolveTarget({ companyId: COMPANY_ID, requestedProductId: FOREIGN_PRODUCT_ID });
    }
  }

  console.log(JSON.stringify({
    verifyCompanyId: COMPANY_ID,
    verifyOwnedProductId: OWNED_PRODUCT_ID,
    verifyForeignProductId: FOREIGN_PRODUCT_ID || null,
    noProduct,
    ownedProduct,
    foreignProduct,
  }, null, 2));
})()
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
