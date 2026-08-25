#!/usr/bin/env node
import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * Block B local-dev fixture: one APPROVED module template with ~10 SOURCED
 * items, plus the unlock rule that opens it for a firm's scoring pattern.
 *
 * This is a stand-in for the real banks (Block C). It exists so the firm-portal
 * module surface can be exercised locally without importing licensed content,
 * and it deliberately satisfies both hard serving rules so nothing is bypassed
 * in dev that would be enforced in production:
 *   - reviewStatus = APPROVED (two-signature publish gate)
 *   - every item carries >= 1 ModuleSource ("Tier C does not exist")
 *
 * A DRAFT companion template is also seeded, with a matching unlock rule, so the
 * publish wall is visible in the running app: it must never appear on a card
 * surface even though its rule matches.
 *
 * Namespaced `blockb-fixture-*`, idempotent, and removable with --teardown.
 *
 *   node --import tsx scripts/modules/seed-block-b-fixture.ts            # dry run
 *   node --import tsx scripts/modules/seed-block-b-fixture.ts --apply
 *   node --import tsx scripts/modules/seed-block-b-fixture.ts --teardown
 */

const APPLY = process.argv.includes("--apply");
const TEARDOWN = process.argv.includes("--teardown");
const NS = "blockb-fixture";

/** Ten items across the difficulty mix, each with a real public-domain source. */
const ITEMS = [
  { n: 1, difficulty: "EASY", anchor: true, stem: "A firm documents who signs off on a client deliverable before it is released. What control objective does that primarily serve?", choices: ["Segregation of duties", "Review and approval", "Physical safeguarding", "Reconciliation"], correct: "b" },
  { n: 2, difficulty: "EASY", anchor: false, stem: "Which of these is the clearest evidence that a review actually happened, rather than being asserted?", choices: ["A policy stating reviews occur", "A signed and dated reviewer note tied to the deliverable", "A calendar invite for a review meeting", "A verbal confirmation from the preparer"], correct: "b" },
  { n: 3, difficulty: "EASY", anchor: false, stem: "A workflow step has no named owner. What is the most immediate operational risk?", choices: ["Increased software cost", "The step is skipped or duplicated", "Longer client onboarding", "Higher staff turnover"], correct: "b" },
  { n: 4, difficulty: "MODERATE", anchor: true, stem: "A firm's close checklist is complete but every item is marked done by the same person who prepared it. Which control weakness is present?", choices: ["Lack of segregation between preparation and review", "Insufficient documentation retention", "Inadequate physical security", "Untimely bank reconciliation"], correct: "a" },
  { n: 5, difficulty: "MODERATE", anchor: false, stem: "Two systems hold client contact data and disagree. Which practice most directly prevents the disagreement recurring?", choices: ["Exporting both to spreadsheets monthly", "Designating one system of record and syncing from it", "Training staff to check both", "Archiving the older system"], correct: "b" },
  { n: 6, difficulty: "MODERATE", anchor: false, stem: "A handoff between two teams routinely stalls. Which measurement best diagnoses where it stalls?", choices: ["Total engagement hours", "Cycle time measured at each handoff step", "Client satisfaction score", "Headcount per team"], correct: "b" },
  { n: 7, difficulty: "MODERATE", anchor: false, stem: "Which statement best describes the purpose of a documented escalation path?", choices: ["It assigns blame after an error", "It defines who decides when the normal path is blocked", "It replaces the need for review", "It satisfies an insurance requirement"], correct: "b" },
  { n: 8, difficulty: "MODERATE", anchor: false, stem: "A firm automates a recurring reconciliation. What must remain in place for the control to stay effective?", choices: ["Nothing — automation removes the control need", "A monitoring step that detects when the automation fails", "A second automation as backup", "Quarterly staff retraining"], correct: "b" },
  { n: 9, difficulty: "HARD", anchor: false, stem: "An automated posting rule silently stopped firing three weeks ago and nobody noticed. Which design flaw most directly allowed the gap to persist?", choices: ["The rule lacked a documented owner", "There was no exception or heartbeat alert when the rule produced no output", "The rule was written by a third party", "The rule was not version controlled"], correct: "b" },
  { n: 10, difficulty: "HARD", anchor: false, stem: "A firm wants to claim its data flow is 'integrated'. Which evidence would most defensibly support that claim?", choices: ["Both systems are from the same vendor", "Staff report the systems feel connected", "A traced record shows a single entry propagating end to end without rekeying", "The firm holds licences for an integration platform"], correct: "c" },
] as const;

let prismaClient: { $disconnect(): Promise<void> } | null = null;

/** Upsert a template's items, each with at least one ModuleSource. */
async function seedItems(
  prisma: Awaited<typeof import("@/lib/prisma")>["default"],
  templateId: string,
  slug: string,
  category: string,
  specs: ReadonlyArray<(typeof ITEMS)[number]>
) {
  for (const spec of specs) {
    const key = `${NS}-${slug}-item-${String(spec.n).padStart(2, "0")}`;
    const item = await prisma.moduleItem.upsert({
      where: { key },
      update: {},
      create: {
        key,
        templateId,
        category,
        itemKind: spec.n <= 3 ? "ENTRY" : spec.n <= 8 ? "REVIEW" : "FINAL",
        difficulty: spec.difficulty,
        isAnchor: spec.anchor,
        stem: spec.stem,
        choices: spec.choices.map((label, index) => ({ key: "abcd"[index], label })),
        correctKey: spec.correct,
        discriminationSeed: 0.25 + spec.n * 0.05,
        order: spec.n,
      },
    });
    // The sourced-content bar: every item carries at least one source.
    const existing = await prisma.moduleSource.count({ where: { itemId: item.id } });
    if (existing === 0) {
      await prisma.moduleSource.create({
        data: {
          itemId: item.id,
          sourceOrg: "AICPA",
          sourceDoc: "Statements on Quality Management Standards (fixture citation)",
          sourceUrl: null,
          licenseType: "PUBLIC_DOMAIN",
          accessedAt: new Date("2026-07-08T00:00:00Z"),
        },
      });
    }
  }
}

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  prismaClient = prisma;

  if (TEARDOWN) {
    // Responses/sittings first — the RESTRICT edges refuse the other order.
    const sittings = await prisma.moduleSitting.findMany({
      where: { ModuleTemplate: { key: { startsWith: NS } } },
      select: { id: true },
    });
    const sittingIds = sittings.map((row) => row.id);
    const responses = sittingIds.length
      ? await prisma.itemResponse.deleteMany({ where: { sittingId: { in: sittingIds } } })
      : { count: 0 };
    const removedSittings = sittingIds.length
      ? await prisma.moduleSitting.deleteMany({ where: { id: { in: sittingIds } } })
      : { count: 0 };
    const rules = await prisma.moduleUnlockRule.deleteMany({
      where: { ModuleTemplate: { key: { startsWith: NS } } },
    });
    const sources = await prisma.moduleSource.deleteMany({
      where: { ModuleItem: { key: { startsWith: NS } } },
    });
    const items = await prisma.moduleItem.deleteMany({ where: { key: { startsWith: NS } } });
    const templates = await prisma.moduleTemplate.deleteMany({ where: { key: { startsWith: NS } } });
    console.log("Block B fixture teardown:", {
      responses: responses.count,
      sittings: removedSittings.count,
      rules: rules.count,
      sources: sources.count,
      items: items.count,
      templates: templates.count,
    });
    return;
  }

  console.log(`\n===== BLOCK B FIXTURE — ${APPLY ? "APPLY" : "DRY RUN"} =====`);
  console.log(`Namespace: ${NS}-*`);
  console.log(`  APPROVED template "Operating Model Diagnostic" with ${ITEMS.length} sourced items`);
  console.log(`  DRAFT template "Governance Remediation (unpublished)" — must NEVER surface`);
  console.log(`  Unlock rules on operations:* and governance:* so any band matches locally`);

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply.");
    return;
  }

  // --- APPROVED templates ---------------------------------------------------
  // Three, so the card surface can show mixed sitting statuses in one view.
  const APPROVED_SPECS = [
    { slug: "operating-model-diagnostic", title: "Operating Model Diagnostic", type: "DIAGNOSTIC", category: "operations", items: ITEMS },
    { slug: "review-discipline-strength", title: "Review Discipline Strength", type: "STRENGTH", category: "operations", items: ITEMS.slice(0, 6) },
    { slug: "handoff-remediation", title: "Handoff Remediation", type: "REMEDIATION", category: "operations", items: ITEMS.slice(0, 6) },
  ] as const;

  const approvedTemplates: Array<{ id: string; slug: string }> = [];
  for (const spec of APPROVED_SPECS) {
    const template = await prisma.moduleTemplate.upsert({
      where: { key: `${NS}-${spec.slug}` },
      update: { reviewStatus: "APPROVED", active: true },
      create: {
        key: `${NS}-${spec.slug}`,
        category: spec.category,
        targetPattern: "operations:developing",
        moduleType: spec.type,
        title: spec.title,
        objectives: ["Identify review and approval gaps", "Trace ownership through a handoff"],
        reviewStatus: "APPROVED",
        cpaReviewedBy: "fixture:cpa",
        cpaReviewedAt: new Date(),
        clarityReviewedBy: "fixture:clarity",
        clarityReviewedAt: new Date(),
      },
    });
    approvedTemplates.push({ id: template.id, slug: spec.slug });
    await seedItems(prisma, template.id, spec.slug, spec.category, spec.items);
  }
  const approved = { id: approvedTemplates[0]!.id };

  // --- DRAFT companion (the publish wall, made visible) --------------------
  const draft = await prisma.moduleTemplate.upsert({
    where: { key: `${NS}-governance-remediation-draft` },
    update: { reviewStatus: "DRAFT" },
    create: {
      key: `${NS}-governance-remediation-draft`,
      category: "governance",
      targetPattern: "governance:early",
      moduleType: "REMEDIATION",
      title: "Governance Remediation (unpublished)",
      reviewStatus: "DRAFT",
    },
  });

  // --- Unlock rules: one per band so any local firm pattern matches ---------
  const bands = ["early", "developing", "building", "established", "leading"];
  let ruleCount = 0;
  for (const band of bands) {
    const targets: Array<[string, string]> = [
      ...approvedTemplates.map((entry) => ["operations", entry.id] as [string, string]),
      ["governance", draft.id],
    ];
    for (const [category, templateId] of targets) {
      await prisma.moduleUnlockRule.upsert({
        where: { patternSubset_templateId: { patternSubset: `${category}:${band}`, templateId } },
        update: { active: true },
        create: { patternSubset: `${category}:${band}`, templateId, quarterOffset: 0 },
      });
      ruleCount += 1;
    }
  }

  console.log(`\nSeeded: ${approvedTemplates.length} APPROVED templates, 1 DRAFT template, ${ruleCount} unlock rules.`);
  console.log(`Approved templateId: ${approved.id}`);
}

main()
  .catch((error) => {
    console.error("Block B fixture failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) await prismaClient.$disconnect();
  });
