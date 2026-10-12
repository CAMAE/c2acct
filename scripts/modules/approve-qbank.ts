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
 *
 * legal-load (R64, delta 3): see the note mode below (--note, scoped by --vertical or --template).
 */

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

/**
 * legal-load (R64, delta 3; Cam's 2026-10-06 ruling): the two-signature gate is
 * superseded for a channel whose banks Cam approved after a domain read. The
 * approve line records an APPROVAL NOTE on the template (objectives.approval) and
 * flips DRAFT → APPROVED; no signature fields are written. Scope the line to one
 * vertical (--vertical legal) or one template (--template <key>) so an accounting
 * DRAFT is never swept up by a legal approval.
 *
 *   Dry run:  node --import tsx scripts/modules/approve-qbank.ts --vertical legal --note "approved by Cam after domain read, 2026-10-06, attorney review"
 *   Apply:    … --apply
 */
async function main() {
  applyRepoEnv();
  const apply = process.argv.includes("--apply");
  const cpaReviewedBy = argValue("--cpa");
  const clarityReviewedBy = argValue("--clarity");
  const note = argValue("--note");
  const vertical = argValue("--vertical");
  const templateKey = argValue("--template");

  if (!note && (!cpaReviewedBy || !clarityReviewedBy)) {
    console.error(
      "Either an approval note (--note \"<who approved, when, on what read>\", scoped with --vertical or --template) " +
        "or both signatories (--cpa \"<CPA reviewer>\" --clarity \"<clarity reviewer>\") are required. " +
        "An approval must never record a placeholder."
    );
    process.exit(1);
  }
  if (note && !vertical && !templateKey) {
    console.error("An approval note needs a scope: --vertical <id> or --template <key>.");
    process.exit(1);
  }

  const { default: prisma } = await import("@/lib/prisma");
  const drafts = await prisma.moduleTemplate.findMany({
    where: {
      reviewStatus: "DRAFT",
      ...(vertical ? { verticalId: vertical } : {}),
      ...(templateKey ? { key: templateKey } : {}),
    },
    select: { id: true, key: true, verticalId: true, moduleType: true, objectives: true, _count: { select: { ModuleItem: true } } },
  });

  if (drafts.length === 0) {
    console.log(
      "No DRAFT ModuleTemplates found. Import the qbank first " +
        "(pnpm modules:import-qbank) — this environment has none to approve."
    );
    process.exit(0);
  }

  console.log(`QBANK approval (${apply ? "APPLY" : "DRY RUN"})${vertical ? ` · vertical ${vertical}` : ""}${templateKey ? ` · template ${templateKey}` : ""}:`);
  for (const d of drafts) {
    console.log(`  ${d.key} · ${d.verticalId} · ${d.moduleType} · ${d._count.ModuleItem} items · DRAFT → APPROVED`);
  }
  if (note) {
    console.log(`  Approval note: ${note}`);
  } else {
    console.log(`  CPA reviewer: ${cpaReviewedBy}`);
    console.log(`  Clarity reviewer: ${clarityReviewedBy}`);
  }

  if (!apply) {
    console.log(`\nDry run only. Re-run with --apply to write the ${note ? "approval note" : "two-signature approval"}.`);
    process.exit(0);
  }

  const now = new Date();
  const result = await prisma.$transaction(
    drafts.map((d) =>
      prisma.moduleTemplate.update({
        where: { id: d.id },
        data: note
          ? {
              reviewStatus: "APPROVED",
              objectives: {
                ...(d.objectives && typeof d.objectives === "object" && !Array.isArray(d.objectives) ? (d.objectives as Record<string, unknown>) : {}),
                approval: { note, approvedAt: now.toISOString(), gate: "domain-read" },
              },
            }
          : {
              reviewStatus: "APPROVED",
              cpaReviewedBy,
              cpaReviewedAt: now,
              clarityReviewedBy,
              clarityReviewedAt: now,
            },
      })
    )
  );
  console.log(`\nApproved ${result.length} ModuleTemplate(s) with the ${note ? "approval note" : "two-signature record"}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
