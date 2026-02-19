const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const c = await prisma.company.findFirst({ select: { id: true, name: true } });
  console.log("company_id:", c?.id);
  console.log("company_name:", c?.name);
})().catch(e => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
