try { await import("dotenv/config"); } catch {}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({
    where: { name: "Demo Company" },
    select: { id: true },
  });
  console.log(c?.id ?? "");
}

main()
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
