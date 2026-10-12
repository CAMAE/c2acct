import { applyRepoEnv } from "@/lib/env/repoEnv";
import { SCORE_BANDS } from "@/lib/bandLexicon";
import { PILLAR_BY_MODULE_KEY } from "@/lib/firmPillars";
import { resolveCurrentVertical } from "@/lib/verticals/context";
import { verticalStamp } from "@/lib/verticals/scope";

/**
 * legal-load (R64): unlock rules for the legal knowledge banks.
 *
 * lib/modules/unlock.ts opens a template for a firm only through a
 * ModuleUnlockRule whose patternSubset matches one of the firm's pattern keys
 * (`<pillar category>:<band>`) AND whose template is APPROVED. The accounting
 * banks have no rules on preview today (neither bank is imported there), so the
 * legal banks carry their own: one rule per band for the bank's OWN module
 * category (the Operating Model bank opens on any operations band, and so on),
 * quarterOffset 0, stamped with the resolved vertical. The publish gate stays:
 * a DRAFT legal template is unreachable until the approve line runs.
 *
 *   node --import tsx scripts/modules/seed-legal-unlock-rules.ts          # dry run
 *   node --import tsx scripts/modules/seed-legal-unlock-rules.ts --apply
 */
const APPLY = process.argv.includes("--apply");

// Module key → legal bank template key. lib/firmPillars (pure) maps the module key to its
// pillar; lib/firmPat is NOT imported here, because it loads lib/vendorPat, whose module-level
// catalog must stay out of the import shell's load path.
const BANK_BY_MODULE_KEY: Record<string, string> = {
  firm_alignment_operating_model_v1: "qbank-legal-operating-model-v1",
  firm_alignment_automation_ai_v1: "qbank-legal-automation-ai-v1",
  firm_alignment_data_flow_v1: "qbank-legal-data-flow-v1",
  firm_alignment_governance_v1: "qbank-legal-governance-v1",
  firm_alignment_strategy_v1: "qbank-legal-strategy-v1",
};

async function main() {
  applyRepoEnv();
  const verticalId = resolveCurrentVertical();
  const stamp = verticalStamp({ verticalId });
  if (verticalId !== "legal") {
    console.error(`ABORT: the resolved vertical is "${verticalId}", not legal. Set PAT_ENABLE_VERTICAL_PACKS=1 and PAT_DEFAULT_VERTICAL=legal in this shell.`);
    process.exitCode = 1;
    return;
  }
  const bands = Object.keys(SCORE_BANDS);
  const plan = Object.entries(BANK_BY_MODULE_KEY).map(([moduleKey, templateKey]) => {
    const category = PILLAR_BY_MODULE_KEY[moduleKey].toLowerCase();
    return { templateKey, category, subsets: bands.map((band) => `${category}:${band}`) };
  });
  console.log(`\n================ LEGAL UNLOCK RULES — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  for (const entry of plan) console.log(`  ${entry.templateKey}: ${entry.subsets.join(", ")}`);
  console.log(`  ${plan.length} templates × ${bands.length} bands = ${plan.length * bands.length} rules, quarterOffset 0, vertical ${verticalId}`);

  const { default: prisma } = await import("@/lib/prisma");
  try {
    const templates = await prisma.moduleTemplate.findMany({
      where: { key: { in: plan.map((entry) => entry.templateKey) } },
      select: { id: true, key: true, reviewStatus: true, verticalId: true },
    });
    const byKey = new Map(templates.map((template) => [template.key, template]));
    const missing = plan.filter((entry) => !byKey.has(entry.templateKey)).map((entry) => entry.templateKey);
    if (missing.length > 0) {
      console.error(`ABORT: templates not imported yet: ${missing.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    for (const template of templates) console.log(`  found ${template.key} · ${template.reviewStatus} · vertical ${template.verticalId}`);
    if (!APPLY) {
      console.log("\nDRY RUN — no rules written. Re-run with --apply.");
      return;
    }
    let written = 0;
    for (const entry of plan) {
      const template = byKey.get(entry.templateKey)!;
      for (const patternSubset of entry.subsets) {
        await prisma.moduleUnlockRule.upsert({
          where: { patternSubset_templateId: { patternSubset, templateId: template.id } },
          update: { active: true, quarterOffset: 0, ...stamp },
          create: { patternSubset, templateId: template.id, quarterOffset: 0, ...stamp },
        });
        written += 1;
      }
    }
    const count = await prisma.moduleUnlockRule.count({ where: { templateId: { in: templates.map((template) => template.id) } } });
    console.log(`\nUnlock rules upserted: ${written}; rules on the five legal templates now: ${count}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Legal unlock rules failed:", error);
  process.exitCode = 1;
});
