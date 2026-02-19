require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.$queryRawUnsafe(`
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename ilike '%survey%'
    order by tablename;
  `);

  console.log(rows);
})().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
