#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { ModuleDifficulty, ModuleSourceLicense } from "@prisma/client";
import { parseQbankReport, type ParsedQbankItem } from "@/lib/modules/qbankParser";
import { loadQbankSourceAuthorities } from "@/lib/modules/qbankSourceAuthorities";
import { DIFFICULTY_MIX } from "@/lib/modules/qbankServing";
import { PERF_SCALE_FIRM_PREFIX } from "@/lib/demo-seed/perfScale";

/**
 * Block C PREFLIGHT — validate-only, ZERO database writes.
 *
 * Reads both approved banks and reports what an import WOULD do, so the content
 * countersignature happens against facts rather than assumption. It opens no
 * write path at all: there is no --apply here, and the only Prisma access is an
 * optional read to check for key collisions.
 *
 * Anchor codes are read from each bank's own "Bank stats" line rather than the
 * parser's hardcoded QBANK_ANCHOR_CODES.
 *
 * ---------------------------------------------------------------------------
 * MANDATORY BLOCK C SCOPE (Mythos ruling, 2026-08-25) — recorded here so it
 * cannot be lost between sessions:
 *
 *   QBANK_ANCHOR_CODES (lib/modules/qbankParser.ts) is hardcoded to the
 *   GOVERNANCE bank's anchors — A9, B8, C8, C19, D6, D17 — and is the only
 *   anchor source the importer has. The Integration bank declares a different
 *   six: A12, B9, C13, C17, D8, D16.
 *
 *   The failure is worse than "no anchors". Both sets of codes EXIST in both
 *   banks, so importing Integration with the hardcoded set still flags exactly
 *   six items — an anchor COUNT check passes — while the six flagged are the
 *   wrong ones and Integration's real high-discrimination anchors go unmarked.
 *   Anchors are the cross-firm benchmark thread, so the wrong six silently
 *   corrupts score comparability.
 *
 *   Block C must therefore: (1) read each bank's declared anchors from that
 *   bank's own stats line, as this preflight does — no hardcoded set, and an
 *   anchor count must never be the only check; and (2) ship a contract test
 *   asserting, per bank, that the FLAGGED anchor codes equal the DECLARED
 *   anchor codes, run against both real banks in dry-run.
 *
 *   Block C does not get a GO without that fix and that test in its report.
 * ---------------------------------------------------------------------------
 *
 *   node --import tsx scripts/modules/qbank-preflight.ts
 *   node --import tsx scripts/modules/qbank-preflight.ts --check-collisions
 */

const CHECK_COLLISIONS = process.argv.includes("--check-collisions");

/** Block B's fixture namespace — an import must not collide with it. */
const BLOCK_B_FIXTURE_PREFIX = "blockb-fixture";

type BankSpec = { label: string; path: string; keyPrefix: string };

const BANKS: BankSpec[] = [
  {
    label: "Governance v1",
    path: "docs/elite-sprint/PATALIGN-QBANK-GOVERNANCE-V1-2026-07-08.md",
    keyPrefix: "qbank-gov-v1",
  },
  {
    label: "Integration v1",
    path: "docs/elite-sprint/PATALIGN-QBANK-INTEGRATION-V1-2026-07-08.md",
    keyPrefix: "qbank-int-v1",
  },
];

/** Anchor codes the bank itself declares on its stats line. */
function declaredAnchors(markdown: string): { codes: Set<string>; raw: string | null } {
  const line = markdown.split(/\r?\n/).find((entry) => entry.includes("anchor-item candidates"));
  if (!line) return { codes: new Set(), raw: null };
  const after = line.split("anchor-item candidates:")[1] ?? "";
  const codes = (after.match(/\b[A-D]\d+\b/g) ?? []).map((code) => code.trim());
  return { codes: new Set(codes), raw: line.trim() };
}

/** Declared difficulty counts from the stats line, e.g. "27 E / 45 M / 18 H". */
function declaredMix(markdown: string): { easy: number; moderate: number; hard: number } | null {
  const line = markdown.split(/\r?\n/).find((entry) => entry.includes("Bank stats"));
  const match = line?.match(/(\d+)\s*E\s*\/\s*(\d+)\s*M\s*\/\s*(\d+)\s*H/);
  if (!match) return null;
  return { easy: Number(match[1]), moderate: Number(match[2]), hard: Number(match[3]) };
}

function pct(part: number, total: number): string {
  return total === 0 ? "—" : `${((part / total) * 100).toFixed(1)}%`;
}

/** An item fails the sourcing gate when nothing classified it. */
function failsSourcingGate(item: ParsedQbankItem): boolean {
  return item.sources.every((source) => source.sourceOrg === "UNCLASSIFIED");
}

async function main() {
  console.log("\n================ BLOCK C PREFLIGHT — VALIDATE ONLY, NO WRITES ================");

  const allKeys = new Map<string, string[]>();
  let anyBlocking = false;

  // Citation authorities come from the resolved Vertical Pack. Flag off, the
  // resolver short-circuits to the "accounting" constant, so this is that
  // pack's list — which must classify both banks exactly as the old hardcoded
  // branches did. Nothing is logged about it on purpose: this script's stdout
  // is the diff artifact that proves W4 changed no classification.
  const authorities = await loadQbankSourceAuthorities();

  for (const bank of BANKS) {
    const markdown = readFileSync(bank.path, "utf8");
    const anchors = declaredAnchors(markdown);
    const report = parseQbankReport(markdown, bank.keyPrefix, anchors.codes, authorities);
    const { items, issues, blocksSeen } = report;

    console.log(`\n───────── ${bank.label} ─────────`);
    console.log(`source: ${bank.path}`);
    console.log(`key prefix: ${bank.keyPrefix}-*`);

    // 1. Items parsed + a)-d) marker integrity.
    console.log(`\nITEMS`);
    console.log(`  item blocks detected : ${blocksSeen}`);
    console.log(`  parsed successfully  : ${items.length}`);
    console.log(`  failed to parse      : ${issues.length}`);
    if (issues.length > 0) {
      anyBlocking = true;
      for (const issue of issues) {
        console.log(`    ✗ ${issue.code ?? "(no code)"}: ${issue.message}`);
      }
    } else {
      console.log(`  a)–d) marker integrity: OK — every block yielded 4 choices and one answer marker`);
    }

    // Answer-key sanity: correctKey must be one of the four choice keys.
    const badAnswer = items.filter((item) => !item.choices.some((c) => c.key === item.correctKey));
    if (badAnswer.length > 0) {
      anyBlocking = true;
      console.log(`  ✗ answer key outside a–d: ${badAnswer.map((i) => i.code).join(", ")}`);
    }

    // 2. Source classification per item.
    const byLicense = new Map<string, number>();
    const byOrg = new Map<string, number>();
    for (const item of items) {
      for (const source of item.sources) {
        byLicense.set(source.licenseType, (byLicense.get(source.licenseType) ?? 0) + 1);
        byOrg.set(source.sourceOrg, (byOrg.get(source.sourceOrg) ?? 0) + 1);
      }
    }
    console.log(`\nSOURCING`);
    console.log(
      `  by org     : ${[...byOrg.entries()].sort().map(([org, n]) => `${org}=${n}`).join("  ")}`
    );
    console.log(
      `  by licence : ${[...byLicense.entries()].sort().map(([lic, n]) => `${lic}=${n}`).join("  ")}`
    );
    const unsourced = items.filter(failsSourcingGate);
    if (unsourced.length === 0) {
      console.log(`  ✓ sourcing gate: all ${items.length} items carry a classified source`);
    } else {
      anyBlocking = true;
      console.log(`  ✗ sourcing gate FAILURES (${unsourced.length}) — would seed as UNCLASSIFIED:`);
      for (const item of unsourced) {
        console.log(`      ${item.code}  ${item.sourceRaw}`);
      }
    }
    void ModuleSourceLicense;

    // 3. Anchors — must be 6.
    console.log(`\nANCHORS`);
    console.log(`  declared on stats line : ${anchors.raw ? [...anchors.codes].join(", ") : "(none found)"}`);
    const anchorItems = items.filter((item) => item.isAnchor);
    const missing = [...anchors.codes].filter((code) => !items.some((item) => item.code === code));
    console.log(`  matched in parsed items: ${anchorItems.length} (${anchorItems.map((i) => i.code).join(", ")})`);
    if (anchorItems.length !== 6) {
      anyBlocking = true;
      console.log(`  ✗ anchor count is ${anchorItems.length}, must be 6`);
    } else {
      console.log(`  ✓ anchor count is 6`);
    }
    if (missing.length > 0) {
      anyBlocking = true;
      console.log(`  ✗ declared anchor codes with no matching item: ${missing.join(", ")}`);
    }

    // 4. Difficulty mix vs the 30/50/20 serve target.
    const counts = {
      [ModuleDifficulty.EASY]: items.filter((i) => i.difficulty === ModuleDifficulty.EASY).length,
      [ModuleDifficulty.MODERATE]: items.filter((i) => i.difficulty === ModuleDifficulty.MODERATE).length,
      [ModuleDifficulty.HARD]: items.filter((i) => i.difficulty === ModuleDifficulty.HARD).length,
    };
    const declared = declaredMix(markdown);
    console.log(`\nDIFFICULTY MIX  (bank composition vs the ${Math.round(DIFFICULTY_MIX.EASY * 100)}/${Math.round(DIFFICULTY_MIX.MODERATE * 100)}/${Math.round(DIFFICULTY_MIX.HARD * 100)} SERVE target)`);
    for (const [tier, target] of [
      [ModuleDifficulty.EASY, DIFFICULTY_MIX.EASY],
      [ModuleDifficulty.MODERATE, DIFFICULTY_MIX.MODERATE],
      [ModuleDifficulty.HARD, DIFFICULTY_MIX.HARD],
    ] as const) {
      const n = counts[tier];
      console.log(
        `  ${tier.padEnd(8)} ${String(n).padStart(3)}  ${pct(n, items.length).padStart(6)}   target ${(target * 100).toFixed(0)}%`
      );
    }
    if (declared) {
      const matches =
        declared.easy === counts.EASY && declared.moderate === counts.MODERATE && declared.hard === counts.HARD;
      console.log(
        `  declared on stats line: ${declared.easy} E / ${declared.moderate} M / ${declared.hard} H — ${matches ? "✓ matches parsed" : "✗ DOES NOT match parsed"}`
      );
      if (!matches) anyBlocking = true;
    }

    // 5. Duplicate keys + namespace collisions.
    console.log(`\nKEYS`);
    const dupes = new Map<string, number>();
    for (const item of items) {
      dupes.set(item.key, (dupes.get(item.key) ?? 0) + 1);
      if (!allKeys.has(item.key)) allKeys.set(item.key, []);
      allKeys.get(item.key)!.push(bank.label);
    }
    const dupeKeys = [...dupes.entries()].filter(([, n]) => n > 1);
    if (dupeKeys.length === 0) {
      console.log(`  ✓ no duplicate keys within the bank (${dupes.size} unique)`);
    } else {
      anyBlocking = true;
      console.log(`  ✗ duplicate keys: ${dupeKeys.map(([k, n]) => `${k}×${n}`).join(", ")}`);
    }
    const fixtureCollisions = items.filter(
      (item) => item.key.startsWith(BLOCK_B_FIXTURE_PREFIX) || item.key.startsWith(PERF_SCALE_FIRM_PREFIX)
    );
    console.log(
      fixtureCollisions.length === 0
        ? `  ✓ no collision with the ${BLOCK_B_FIXTURE_PREFIX}-* or ${PERF_SCALE_FIRM_PREFIX}* namespaces`
        : `  ✗ fixture-namespace collision: ${fixtureCollisions.map((i) => i.key).join(", ")}`
    );
    if (fixtureCollisions.length > 0) anyBlocking = true;
  }

  // Cross-bank key collision.
  console.log(`\n───────── CROSS-BANK ─────────`);
  const crossBank = [...allKeys.entries()].filter(([, banks]) => new Set(banks).size > 1);
  console.log(
    crossBank.length === 0
      ? `  ✓ no key collides across the two banks (${allKeys.size} keys total)`
      : `  ✗ keys present in both banks: ${crossBank.map(([k]) => k).join(", ")}`
  );
  if (crossBank.length > 0) anyBlocking = true;

  if (CHECK_COLLISIONS) {
    // READ-ONLY. The only database access in this script.
    const { applyRepoEnv } = await import("@/lib/env/repoEnv");
    applyRepoEnv();
    const prisma = (await import("@/lib/prisma")).default;
    const existing = await prisma.moduleItem.findMany({
      where: { key: { in: [...allKeys.keys()] } },
      select: { key: true },
    });
    console.log(
      existing.length === 0
        ? `  ✓ no bank key already exists in the database`
        : `  ✗ already present in DB: ${existing.map((row) => row.key).join(", ")}`
    );
    if (existing.length > 0) anyBlocking = true;
    await prisma.$disconnect();
  }

  console.log(
    `\nPREFLIGHT VERDICT: ${anyBlocking ? "BLOCKING ISSUES PRESENT — do not import" : "clean"}`
  );
  console.log("No database writes were performed. The import remains gated on countersignature.\n");
}

main().catch((error) => {
  console.error("qbank preflight failed:", error);
  process.exit(1);
});
