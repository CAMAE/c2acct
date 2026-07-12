import { readFileSync } from "node:fs";
import path from "node:path";

import { ModuleReviewStatus, ModuleType } from "@prisma/client";

import { applyRepoEnv } from "@/lib/env/repoEnv";
import {
  QBANK_TEMPLATE_KEY,
  parseQbank,
  type ParsedQbankItem,
} from "@/lib/modules/qbankParser";

/**
 * Import PAT Question Bank v1 (Sprint 4 M2, 2026-07-08).
 *
 * Parses the local-only governance doc (docs/elite-sprint/ is gitignored) and
 * seeds it as ONE ModuleTemplate (reviewStatus DRAFT) with 90 ModuleItems +
 * their ModuleSource rows. Nothing serves to customers until the CPA-founder
 * flips reviewStatus to APPROVED (two-signature gate) — the import is
 * deliberately DRAFT-only.
 *
 * Idempotent: template + items upsert on their unique keys; each item's sources
 * are replaced wholesale so re-running does not grow counts. Deterministic.
 *
 * Usage:
 *   node --import tsx scripts/modules/import-qbank.ts            # DRY RUN (default)
 *   node --import tsx scripts/modules/import-qbank.ts --apply    # writes (idempotent)
 *
 * Optional: PAT_QBANK_DOC overrides the source markdown path.
 */

const APPLY = process.argv.includes("--apply");
const DEFAULT_DOC = path.resolve(
  process.cwd(),
  "docs/elite-sprint/PATALIGN-QBANK-GOVERNANCE-V1-2026-07-08.md"
);
const DOC_PATH = process.env.PAT_QBANK_DOC?.trim() || DEFAULT_DOC;
const ACCESSED_AT = new Date("2026-07-08T00:00:00.000Z");

// Bank metadata is env-overridable so the SAME importer handles both banks
// (Governance = DIAGNOSTIC default; Integration = STRENGTH via PAT_QBANK_*).
const BANK_TEMPLATE_KEY = process.env.PAT_QBANK_TEMPLATE_KEY?.trim() || QBANK_TEMPLATE_KEY;
const BANK_MODULE_TYPE = ((): ModuleType => {
  const raw = process.env.PAT_QBANK_MODULE_TYPE?.trim().toUpperCase();
  if (raw === "STRENGTH") return ModuleType.STRENGTH;
  if (raw === "REMEDIATION") return ModuleType.REMEDIATION;
  return ModuleType.DIAGNOSTIC;
})();
const BANK_CATEGORY = process.env.PAT_QBANK_CATEGORY?.trim() || "Governance & Controls";
const BANK_TARGET_PATTERN = process.env.PAT_QBANK_TARGET_PATTERN?.trim() || "baseline-governance-diagnostic";
const BANK_TITLE = process.env.PAT_QBANK_TITLE?.trim() || "Governance, Controls & Vendor Risk — Diagnostic v1";

const EXPECTED_TOTAL = 90;
const EXPECTED_MIX = { EASY: 27, MODERATE: 45, HARD: 18 };

let prismaClient: { $disconnect(): Promise<void> } | null = null;

function summarize(items: ParsedQbankItem[]) {
  const byDifficulty: Record<string, number> = { EASY: 0, MODERATE: 0, HARD: 0 };
  const byCategory: Record<string, number> = {};
  let anchors = 0;
  let sourceRows = 0;
  let unsourced = 0;
  const unclassified: string[] = [];
  for (const item of items) {
    byDifficulty[item.difficulty] += 1;
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    if (item.isAnchor) anchors += 1;
    sourceRows += item.sources.length;
    if (item.sources.length === 0) unsourced += 1;
    if (item.sources.some((s) => s.sourceOrg === "UNCLASSIFIED")) unclassified.push(item.code);
  }
  return { byDifficulty, byCategory, anchors, sourceRows, unsourced, unclassified };
}

function validate(items: ParsedQbankItem[], stats: ReturnType<typeof summarize>): string[] {
  const errors: string[] = [];
  if (items.length !== EXPECTED_TOTAL) {
    errors.push(`expected ${EXPECTED_TOTAL} items, parsed ${items.length}`);
  }
  for (const [tier, want] of Object.entries(EXPECTED_MIX)) {
    if (stats.byDifficulty[tier] !== want) {
      errors.push(`difficulty ${tier}: expected ${want}, got ${stats.byDifficulty[tier]}`);
    }
  }
  if (stats.unsourced > 0) {
    errors.push(`${stats.unsourced} item(s) carry NO source row (sourced-content bar violated)`);
  }
  if (stats.unclassified.length > 0) {
    errors.push(`unclassified source on: ${stats.unclassified.join(", ")}`);
  }
  const badAnswer = items.filter((i) => !i.choices.some((c) => c.key === i.correctKey));
  if (badAnswer.length > 0) {
    errors.push(`correctKey with no matching choice on: ${badAnswer.map((i) => i.code).join(", ")}`);
  }
  return errors;
}

async function main() {
  applyRepoEnv();

  let markdown: string;
  try {
    markdown = readFileSync(DOC_PATH, "utf8");
  } catch (error) {
    console.error(`ABORT: could not read QBANK doc at ${DOC_PATH}\n  ${(error as Error).message}`);
    console.error("  (docs/elite-sprint/ is gitignored — set PAT_QBANK_DOC if the path differs.)");
    process.exitCode = 1;
    return;
  }

  const items = parseQbank(markdown, BANK_TEMPLATE_KEY);
  const stats = summarize(items);
  const errors = validate(items, stats);

  console.log(`\n================ IMPORT QBANK v1 — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  console.log(`Source: ${DOC_PATH}`);
  console.log(`Template: ${BANK_TEMPLATE_KEY} (reviewStatus DRAFT — nothing serves until CPA-approved)\n`);
  console.log(`Items parsed: ${items.length}`);
  console.log(`  Difficulty: E ${stats.byDifficulty.EASY} / M ${stats.byDifficulty.MODERATE} / H ${stats.byDifficulty.HARD}`);
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`  Category "${category}": ${count}`);
  }
  console.log(`  Anchor items: ${stats.anchors} (${items.filter((i) => i.isAnchor).map((i) => i.code).join(", ")})`);
  console.log(`  Source rows: ${stats.sourceRows} (every item >= 1)`);

  if (errors.length > 0) {
    console.error(`\nVALIDATION FAILED:`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nValidation OK: ${EXPECTED_TOTAL} items, mix ${EXPECTED_MIX.EASY}/${EXPECTED_MIX.MODERATE}/${EXPECTED_MIX.HARD}, all sourced.`);

  if (!APPLY) {
    console.log(`\nDRY RUN — no changes written. Re-run with --apply to seed (as DRAFT).`);
    console.log(`Rollback (after --apply): delete ModuleTemplate key='${BANK_TEMPLATE_KEY}' (cascades items + sources).`);
    return;
  }

  const { default: prisma } = await import("@/lib/prisma");
  prismaClient = prisma;

  console.log("\nAPPLYING…");
  const template = await prisma.moduleTemplate.upsert({
    where: { key: BANK_TEMPLATE_KEY },
    update: {
      category: BANK_CATEGORY,
      targetPattern: BANK_TARGET_PATTERN,
      moduleType: BANK_MODULE_TYPE,
      title: BANK_TITLE,
      reviewStatus: ModuleReviewStatus.DRAFT,
      updatedAt: new Date(),
    },
    create: {
      key: BANK_TEMPLATE_KEY,
      category: BANK_CATEGORY,
      targetPattern: BANK_TARGET_PATTERN,
      moduleType: BANK_MODULE_TYPE,
      title: BANK_TITLE,
      objectives: {
        note: "Measurable objectives pending CPA-founder authoring pass; bank items map to their blueprint components A–D.",
      },
      reviewStatus: ModuleReviewStatus.DRAFT,
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  let itemCount = 0;
  let sourceCount = 0;
  for (const [index, item] of items.entries()) {
    const row = await prisma.moduleItem.upsert({
      where: { key: item.key },
      update: {
        templateId: template.id,
        category: item.category,
        itemKind: "FINAL",
        difficulty: item.difficulty,
        isAnchor: item.isAnchor,
        stem: item.stem,
        choices: item.choices,
        correctKey: item.correctKey,
        feedback: { rationale: item.feedback, source: item.sourceRaw },
        order: index,
        updatedAt: new Date(),
      },
      create: {
        key: item.key,
        templateId: template.id,
        category: item.category,
        itemKind: "FINAL",
        difficulty: item.difficulty,
        isAnchor: item.isAnchor,
        stem: item.stem,
        choices: item.choices,
        correctKey: item.correctKey,
        feedback: { rationale: item.feedback, source: item.sourceRaw },
        order: index,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    itemCount += 1;

    // Replace sources wholesale → idempotent (no count growth on re-run).
    await prisma.moduleSource.deleteMany({ where: { itemId: row.id } });
    await prisma.moduleSource.createMany({
      data: item.sources.map((source) => ({
        itemId: row.id,
        sourceOrg: source.sourceOrg,
        sourceDoc: source.sourceDoc,
        sourceUrl: null,
        licenseType: source.licenseType,
        accessedAt: ACCESSED_AT,
      })),
    });
    sourceCount += item.sources.length;
  }

  console.log(`\nImport complete: template + ${itemCount} items + ${sourceCount} source rows (all DRAFT).`);
  console.log(`Nothing serves until a CPA-certified reviewer flips reviewStatus to APPROVED.`);
}

main()
  .catch((error) => {
    console.error("Import QBANK failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) await prismaClient.$disconnect();
  });
