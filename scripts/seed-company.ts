import "dotenv/config";
import { randomUUID } from "node:crypto";
import { CompanyType } from "@prisma/client";
import { runWithPrisma } from "./_shared/prismaScript";

async function main() {
  await runWithPrisma(async (prisma) => {
    let company = await prisma.company.findFirst({
      where: { name: "Test Company" },
      select: { id: true, name: true },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          id: randomUUID(),
          name: "Test Company",
          type: CompanyType.FIRM,
          updatedAt: new Date(),
        },
        select: { id: true, name: true },
      });
    }

    console.log("COMPANY_ID=", company.id, "NAME=", company.name);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
