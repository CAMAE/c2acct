import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * 6/9 audit bug 3 cleanup: remove the stray EcosystemFirm LINK row that puts
 * the bare "demo-firm-company" entry in the Demo Accounting Ecosystem league
 * table on the prod consultant portal.
 *
 * Deletes EXACTLY one row: EcosystemFirm(ecosystemId="demo-acct-ecosystem",
 * firmCompanyId="demo-firm-company"). It NEVER touches the Company — that
 * record backs the demo-firm@patalign.test portal account (users, submissions,
 * capability scores all hang off it). EcosystemFirm is a leaf in the cascade
 * graph, so deleting the link cascades nothing.
 *
 * Dry-run by default. To execute:
 *   PAT_CLEANUP_CONFIRM=demo-firm-company DATABASE_URL=<prod> \
 *     node --import tsx scripts/cleanup-stray-ecosystem-firm.ts
 * Afterwards re-run scripts/audit-stray-ecosystem-firms.ts (expect 0 flagged).
 */

const TARGET = {
  ecosystemId: "demo-acct-ecosystem",
  firmCompanyId: "demo-firm-company",
} as const;
const EXPECTED_ECOSYSTEM_NAME = "Demo Accounting Ecosystem";
const CONFIRM_VALUE = "demo-firm-company";

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");

  const link = await prisma.ecosystemFirm.findUnique({
    where: { ecosystemId_firmCompanyId: TARGET },
    include: {
      Ecosystem: { select: { name: true } },
      FirmCompany: {
        select: {
          name: true,
          _count: { select: { User: true, SurveySubmission: true } },
        },
      },
    },
  });

  // Guard 1: the exact link row must exist in the expected ecosystem.
  if (!link) {
    console.log("Nothing to do: the target EcosystemFirm row does not exist (already cleaned?).");
    await prisma.$disconnect();
    return;
  }
  if (link.Ecosystem.name !== EXPECTED_ECOSYSTEM_NAME) {
    throw new Error(
      `Refusing: ecosystem "${link.Ecosystem.name}" != expected "${EXPECTED_ECOSYSTEM_NAME}". Wrong database?`
    );
  }

  // Guard 2: the company must still be the live demo account's company — proves
  // we are deleting the stray LINK, not cleaning up an orphan by mistake.
  if (link.FirmCompany._count.User < 1) {
    throw new Error(
      "Refusing: demo-firm-company has no users — expected the demo-firm@patalign.test account. Wrong database?"
    );
  }

  const before = await prisma.ecosystemFirm.count({ where: { ecosystemId: TARGET.ecosystemId } });
  console.log("Plan:");
  console.log(`  delete EcosystemFirm(ecosystemId=${TARGET.ecosystemId}, firmCompanyId=${TARGET.firmCompanyId})`);
  console.log(`  ecosystem: "${link.Ecosystem.name}" (${before} member firms before)`);
  console.log(
    `  company "${link.FirmCompany.name}" is NOT touched (${link.FirmCompany._count.User} user(s), ${link.FirmCompany._count.SurveySubmission} submission(s) stay intact)`
  );

  if (process.env.PAT_CLEANUP_CONFIRM !== CONFIRM_VALUE) {
    console.log(`\nDRY RUN — no changes. Set PAT_CLEANUP_CONFIRM=${CONFIRM_VALUE} to execute.`);
    await prisma.$disconnect();
    return;
  }

  await prisma.ecosystemFirm.delete({ where: { ecosystemId_firmCompanyId: TARGET } });
  const after = await prisma.ecosystemFirm.count({ where: { ecosystemId: TARGET.ecosystemId } });
  console.log(`\nDeleted. "${link.Ecosystem.name}" member firms: ${before} → ${after}.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
