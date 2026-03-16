import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const moduleRecord = await prisma.surveyModule.findFirst({
    where: { key: "product_workflow_fit_review_v1" },
    select: { id: true, key: true }
  });

  const company = await prisma.company.findFirst({
    where: { slug: "demo-subject-vendor-co" },
    select: { id: true, slug: true, name: true }
  });

  const product = await prisma.product.findFirst({
    where: { slug: "demo-subject-vendor-product" },
    select: { id: true, slug: true, name: true, companyId: true }
  });

  const reviews = moduleRecord && company ? await prisma.externalReviewSubmission.findMany({
    where: {
      moduleId: moduleRecord.id,
      subjectCompanyId: company.id,
      ...(product ? { subjectProductId: product.id } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 10
  }) : [];

  console.log(JSON.stringify({
    module: moduleRecord,
    company,
    product,
    submissionCount: reviews.length,
    reviews
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
