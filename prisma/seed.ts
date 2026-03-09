import { PrismaClient, CompanyType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_COMPANY_ID = "demo-firm-company";
const DEMO_OWNER_ID = "demo-firm-owner";

async function main() {
  const company = await prisma.company.upsert({
    where: { id: DEMO_COMPANY_ID },
    update: {
      name: "Demo Firm LLC",
      type: CompanyType.FIRM,
      updatedAt: new Date(),
    },
    create: {
      id: DEMO_COMPANY_ID,
      name: "Demo Firm LLC",
      type: CompanyType.FIRM,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@demofirm.com" },
    update: {
      name: "Demo Owner",
      role: UserRole.OWNER,
      companyId: company.id,
      updatedAt: new Date(),
    },
    create: {
      id: DEMO_OWNER_ID,
      email: "owner@demofirm.com",
      name: "Demo Owner",
      role: UserRole.OWNER,
      companyId: company.id,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      role: true,
      companyId: true,
    },
  });

  console.log("SEED_OK", {
    company,
    owner,
  });
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
