require("dotenv").config({ path: require("path").join(process.cwd(), ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("cwd:", process.cwd());
  console.log("DATABASE_URL_set:", !!process.env.DATABASE_URL);
  console.log("DATABASE_URL_preview:", (process.env.DATABASE_URL || "").slice(0, 35) + "...");

  const row = await prisma.$queryRaw`
    select
      current_database() as db,
      current_schema() as schema,
      current_user as "user"
  `;
  console.log("db:", row);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
