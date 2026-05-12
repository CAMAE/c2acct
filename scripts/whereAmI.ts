import { loadEnv, runWithPrisma } from "./_shared/prismaScript";

loadEnv();

type ConnectionRow = {
  db: string;
  schema: string;
  user: string;
};

async function main() {
  await runWithPrisma(async (prisma) => {
    console.log("cwd:", process.cwd());
    console.log("DATABASE_URL_set:", Boolean(process.env.DATABASE_URL));
    console.log("DATABASE_URL_present:", Boolean(process.env.DATABASE_URL));

    const rows = await prisma.$queryRaw<ConnectionRow[]>`
      select
        current_database() as db,
        current_schema() as schema,
        current_user as "user"
    `;
    console.log("db:", rows);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
