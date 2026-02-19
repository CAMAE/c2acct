const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({
    select: { id: true, name: true, type: true }
  });
  console.log(c);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
