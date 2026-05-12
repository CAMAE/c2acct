import { PrismaClient, SubjectKind } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let updated = 0;

  for (const company of companies) {
    const existing = await prisma.subject.findUnique({
      where: { companyId: company.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.subject.update({
        where: { id: existing.id },
        data: {
          displayName: company.name,
          kind: SubjectKind.ORGANIZATION,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.subject.create({
      data: {
        id: randomUUID(),
        key: `company:${company.id}`,
        displayName: company.name,
        kind: SubjectKind.ORGANIZATION,
        companyId: company.id,
      },
    });
    created += 1;
  }

  await prisma.portal.upsert({
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
  });

  console.log("PAT subject backfill complete", {
    companies: companies.length,
    created,
    updated,
  });
}

main()
  .catch((error) => {
    console.error("BACKFILL_ERROR", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
