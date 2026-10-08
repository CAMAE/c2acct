import { readFileSync } from "node:fs";
import path from "node:path";

import { applyRepoEnv } from "@/lib/env/repoEnv";
import { readDeclaredAnchorCodes } from "@/lib/modules/qbankParser";

/**
 * enforce-core (R62, charter ruling 48): re-stamp each imported bank's anchors
 * from the bank's OWN "anchor-item candidates" line. Prints BEFORE (the codes
 * whose ModuleItem.isAnchor is true today) and AFTER (the declared codes) per
 * bank; writes only with --apply, and touches nothing but ModuleItem.isAnchor on
 * the named templates.
 *
 *   node --import tsx scripts/modules/restamp-qbank-anchors.ts            # DRY RUN
 *   node --import tsx scripts/modules/restamp-qbank-anchors.ts --apply    # writes
 *
 * PAT_QBANK_DOC_DIR overrides the directory holding the two bank docs.
 */
const APPLY = process.argv.includes("--apply");
const DOC_DIR = process.env.PAT_QBANK_DOC_DIR?.trim() || path.resolve(process.cwd(), "docs/elite-sprint");

const BANKS = [
  { label: "Governance v1", file: "PATALIGN-QBANK-GOVERNANCE-V1-2026-07-08.md", templateKey: "qbank-gov-v1" },
  { label: "Integration v1", file: "PATALIGN-QBANK-INTEGRATION-V1-2026-07-08.md", templateKey: "qbank-int-v1" },
];

function codeOf(key: string, templateKey: string): string {
  return key.startsWith(`${templateKey}-`) ? key.slice(templateKey.length + 1).toUpperCase() : key.toUpperCase();
}

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  console.log(`database: ${process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : "(unset)"}`);
  console.log(`\n================ RESTAMP QBANK ANCHORS — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  let changed = 0;
  for (const bank of BANKS) {
    const markdown = readFileSync(path.join(DOC_DIR, bank.file), "utf8");
    const declared = readDeclaredAnchorCodes(markdown);
    const template = await prisma.moduleTemplate.findUnique({ where: { key: bank.templateKey }, select: { id: true } });
    console.log(`\n───────── ${bank.label} (${bank.templateKey}) ─────────`);
    console.log(`declared: ${declared.raw ?? "(no anchor line)"}`);
    if (!template) {
      console.log("not imported in this database — skipped");
      continue;
    }
    const items = await prisma.moduleItem.findMany({
      where: { templateId: template.id },
      select: { id: true, key: true, isAnchor: true },
    });
    const before = items.filter((i) => i.isAnchor).map((i) => codeOf(i.key, bank.templateKey)).sort();
    const after = [...declared.codes].sort();
    console.log(`items: ${items.length}`);
    console.log(`BEFORE isAnchor: [${before.join(", ")}]`);
    console.log(`AFTER  isAnchor: [${after.join(", ")}]`);
    const toSet = items.filter((i) => declared.codes.has(codeOf(i.key, bank.templateKey)) && !i.isAnchor);
    const toClear = items.filter((i) => !declared.codes.has(codeOf(i.key, bank.templateKey)) && i.isAnchor);
    console.log(`would set ${toSet.length}, clear ${toClear.length}`);
    if (!APPLY) continue;
    if (toSet.length > 0) await prisma.moduleItem.updateMany({ where: { id: { in: toSet.map((i) => i.id) } }, data: { isAnchor: true } });
    if (toClear.length > 0) await prisma.moduleItem.updateMany({ where: { id: { in: toClear.map((i) => i.id) } }, data: { isAnchor: false } });
    changed += toSet.length + toClear.length;
    const now = await prisma.moduleItem.findMany({ where: { templateId: template.id, isAnchor: true }, select: { key: true } });
    console.log(`NOW    isAnchor: [${now.map((i) => codeOf(i.key, bank.templateKey)).sort().join(", ")}]`);
  }
  console.log(`\n${APPLY ? `rows changed: ${changed}` : "DRY RUN — nothing written. Re-run with --apply."}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("restamp failed:", error);
  process.exitCode = 1;
});
