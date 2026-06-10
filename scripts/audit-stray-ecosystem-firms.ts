import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * 6/9 audit bug 3: the prod consultant ecosystem page shows a bare
 * ".../firm/demo-firm-company" link alongside the named demo firms. Local
 * link generation is verified correct (all rows render full slugs), so the
 * stray is a data row in the target database. This read-only script lists
 * every EcosystemFirm row and flags placeholder-looking companies so the
 * stray can be identified and removed deliberately.
 *
 * Run against prod:  DATABASE_URL=<prod-url> node --import tsx scripts/audit-stray-ecosystem-firms.ts
 * Run against local: node --import tsx scripts/audit-stray-ecosystem-firms.ts
 */
async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");

  const rows = await prisma.ecosystemFirm.findMany({
    select: {
      ecosystemId: true,
      Ecosystem: { select: { name: true } },
      FirmCompany: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ ecosystemId: "asc" }],
  });

  let strayCount = 0;
  for (const row of rows) {
    const firm = row.FirmCompany;
    const looksStray =
      !firm ||
      firm.name === firm.id ||
      /^demo-firm-company$/.test(firm.id) ||
      /^[a-z0-9-]+$/.test(firm.name ?? "");
    if (looksStray) strayCount += 1;
    console.log(
      `${looksStray ? "STRAY?" : "ok    "} ecosystem=${row.Ecosystem?.name ?? row.ecosystemId} firmId=${firm?.id ?? "?"} name=${JSON.stringify(firm?.name ?? null)} type=${firm?.type ?? "?"}`
    );
  }
  console.log(`\n${rows.length} ecosystem-firm rows checked, ${strayCount} flagged.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
