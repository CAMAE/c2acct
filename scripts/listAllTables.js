require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.$queryRawUnsafe(`
    select tablename
    from pg_tables
    where schemaname='public'
    order by tablename;
  `);
  console.log(rows.map(r => r.tablename));
})().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
