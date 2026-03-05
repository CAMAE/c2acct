import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.company.findFirst({ where: { name: "Demo Company" }, select: { id: true } });
  console.log(c?.id ?? "");
}
main().finally(async()=>{ await prisma.$disconnect(); });
