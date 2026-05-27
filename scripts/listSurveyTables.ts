import "dotenv/config";
import { runWithPrisma } from "./_shared/prismaScript";

type TableRow = {
  tablename: string;
};

async function main() {
  await runWithPrisma(async (prisma) => {
    const rows = await prisma.$queryRawUnsafe<TableRow[]>(`
      select tablename
      from pg_tables
      where schemaname = 'public'
        and tablename ilike '%survey%'
      order by tablename;
    `);

    console.log(rows.map((row) => row.tablename));
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
