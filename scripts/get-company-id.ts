import { runWithPrisma } from "./_shared/prismaScript";

async function main() {
  await runWithPrisma(async (prisma) => {
    const company = await prisma.company.findFirst({
      select: { id: true, name: true },
    });

    console.log("company_id:", company?.id);
    console.log("company_name:", company?.name);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
