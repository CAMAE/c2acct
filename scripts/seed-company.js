require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  let c = await p.company.findFirst({
    where: { name: "Test Company" },
    select: { id: true, name: true }
  });

  if (!c) {
    c = await p.company.create({
      data: {
        name: "Test Company",
        type: "FIRM"   // <-- REQUIRED ENUM VALUE
      },
      select: { id: true, name: true }
    });
  }

  console.log("COMPANY_ID=", c.id, "NAME=", c.name);
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await p.$disconnect(); } catch {}
  process.exit(1);
});
