require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const company = await p.company.findFirst({
    where: { slug: "demo-vendor-co" },
    select: { id: true, name: true, slug: true, type: true, websiteUrl: true, verticalKey: true }
  });

  const platform = await p.product.findFirst({
    where: { slug: "demo-vendor-platform" },
    select: { id: true, name: true, slug: true, productKind: true, parentProductId: true, companyId: true }
  });

  const point = await p.product.findFirst({
    where: { slug: "demo-vendor-point-solution" },
    select: { id: true, name: true, slug: true, productKind: true, parentProductId: true, companyId: true }
  });

  const link = await p.externalProfileLink.findFirst({
    where: {
      source: "vendor_directory",
      externalRecordId: "immutable-demo-vendor-point-solution-001"
    },
    select: {
      id: true,
      source: true,
      externalEntityType: true,
      externalRecordId: true,
      companyId: true,
      productId: true
    }
  });

  console.log(JSON.stringify({ company, platform, point, link }, null, 2));
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await p.$disconnect(); } catch {}
  process.exit(1);
});
