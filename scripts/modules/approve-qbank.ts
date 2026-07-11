import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * QBANK two-signature approval (Block 8 tail, Cam's 2026-07-11 go).
 *
 * Flips DRAFT ModuleTemplates → APPROVED, recording the two-signature publish
 * gate the schema requires (methodology redline, locked 2026-07-08): a
 * CPA-certified founder signs content accuracy and a clarity reviewer signs
 * readability. APPROVED is only honest with BOTH signatures — this writes them
 * transactionally in one pass.
 *
 * A ModuleTemplate serves customers ONLY when reviewStatus = APPROVED, so this
 * is a governance action: dry-run by default; --apply writes; prod --apply is
 * Cam's-go-only. Signatory identities MUST be the real reviewers — pass them
 * explicitly, never let a placeholder become a sign-off of record.
 *
 *   Dry run:  pnpm tsx scripts/modules/approve-qbank.ts --cpa "<name>" --clarity "<name>"
 *   Apply:    pnpm tsx scripts/modules/approve-qbank.ts --cpa "<name>" --clarity "<name>" --apply
 */

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

async function main() {
  applyRepoEnv();
  const apply = process.argv.includes("--apply");
  const cpaReviewedBy = argValue("--cpa");
  const clarityReviewedBy = argValue("--clarity");

  if (!cpaReviewedBy || !clarityReviewedBy) {
    console.error(
      "Both signatories are required: --cpa \"<CPA reviewer>\" --clarity \"<clarity reviewer>\". " +
        "A two-signature approval must never record a placeholder."
    );
    process.exit(1);
  }

  const { default: prisma } = await import("@/lib/prisma");
  const drafts = await prisma.moduleTemplate.findMany({
    where: { reviewStatus: "DRAFT" },
    select: { id: true, moduleType: true, _count: { select: { ModuleItem: true } } },
  });

  if (drafts.length === 0) {
    console.log(
      "No DRAFT ModuleTemplates found. Import the qbank first " +
        "(pnpm modules:import-qbank) — this environment has none to approve."
    );
    process.exit(0);
  }

  console.log(`QBANK approval (${apply ? "APPLY" : "DRY RUN"}):`);
  for (const d of drafts) {
    console.log(`  ${d.id} · ${d.moduleType} · ${d._count.ModuleItem} items · DRAFT → APPROVED`);
  }
  console.log(`  CPA reviewer: ${cpaReviewedBy}`);
  console.log(`  Clarity reviewer: ${clarityReviewedBy}`);

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to write the two-signature approval.");
    process.exit(0);
  }

  const now = new Date();
  const result = await prisma.$transaction(
    drafts.map((d) =>
      prisma.moduleTemplate.update({
        where: { id: d.id },
        data: {
          reviewStatus: "APPROVED",
          cpaReviewedBy,
          cpaReviewedAt: now,
          clarityReviewedBy,
          clarityReviewedAt: now,
        },
      })
    )
  );
  console.log(`\nApproved ${result.length} ModuleTemplate(s) with the two-signature record.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
