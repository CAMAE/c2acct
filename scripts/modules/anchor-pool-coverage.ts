import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { ANCHOR_TIERS, SERVED_ANCHOR_TIER_MIX, type AnchorTier } from "@/lib/assessmentCore";
import { anchorPoolGrid, untaggedPoolFrom } from "@/lib/modules/anchorPool";
import { QBANK_ANCHOR_LINE_MARKER, parseQbankReport, readDeclaredAnchorCodes, TIER_LETTER } from "@/lib/modules/qbankParser";

/**
 * anchor-pool (R66, item 5): the authoring worklist. For every bank doc under
 * docs/elite-sprint that carries an anchor line, print the 6 by 3 grid (plus
 * the reserve row) with the code in each filled cell, the empty cells, the tier
 * count of the set the rule serves against the charter's 2/3/1, and how many
 * non-anchor items the bank holds per tier (the pool Mythos can tag from before
 * writing new items). Reads the markdown only: no database, no writes but the
 * two coverage files.
 *
 *   node --import tsx scripts/modules/anchor-pool-coverage.ts
 *
 * Writes ~/work/inbox-from-mythos/ANCHOR-POOL-COVERAGE.md (Mythos's copy) and
 * docs/elite-sprint/ANCHOR-POOL-COVERAGE.md (the committed copy).
 */

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs", "elite-sprint");
const INBOX_OUT = path.join(os.homedir(), "work", "inbox-from-mythos", "ANCHOR-POOL-COVERAGE.md");
const REPO_OUT = path.join(DOCS, "ANCHOR-POOL-COVERAGE.md");
const TIER_WORD: Record<AnchorTier, string> = { E: "Easy", M: "Moderate", H: "Hard" };

function bankDocs(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".md") && entry !== "ANCHOR-POOL-COVERAGE.md" && readFileSync(full, "utf8").includes(QBANK_ANCHOR_LINE_MARKER)) out.push(full);
    }
  };
  walk(DOCS);
  return out.sort();
}

function bankLabel(file: string): string {
  const base = path.basename(file).replace(/^PATALIGN-QBANK-/, "").replace(/-V1-\d{4}-\d{2}-\d{2}(?:-IMPORT)?\.md$/, "");
  return base.startsWith("LEGAL-") ? `legal ${base.slice(6).toLowerCase()}` : `accounting ${base.toLowerCase()}`;
}

function main() {
  const lines: string[] = [];
  const say = (line = "") => lines.push(line);
  say("# Anchor pool coverage (R66, item 5): the authoring worklist");
  say();
  say(`Generated ${new Date().toISOString().slice(0, 10)} by scripts/modules/anchor-pool-coverage.ts from the bank docs under docs/elite-sprint. Six drivers by three tiers per bank; six serve per sitting at ${SERVED_ANCHOR_TIER_MIX.E} Easy, ${SERVED_ANCHOR_TIER_MIX.M} Moderate, ${SERVED_ANCHOR_TIER_MIX.H} Hard. An empty cell is an item to author or an existing item to tag.`);
  say();
  const summary: string[] = [];
  for (const file of bankDocs()) {
    const markdown = readFileSync(file, "utf8");
    const declared = readDeclaredAnchorCodes(markdown);
    const report = parseQbankReport(markdown, "coverage", null, []);
    const items = report.items;
    const anchors = items.filter((item) => item.isAnchor).map((item) => ({ code: item.code, difficulty: item.difficulty }));
    const pool = declared.tagged ? declared.pool : untaggedPoolFrom(anchors);
    const grid = anchorPoolGrid(pool);
    const nonAnchorByTier: Record<AnchorTier, number> = { E: 0, M: 0, H: 0 };
    for (const item of items) if (!item.isAnchor) nonAnchorByTier[TIER_LETTER[item.difficulty]] += 1;
    const label = bankLabel(file);
    say(`## ${label}`);
    say();
    say(`Source: ${path.relative(ROOT, file)} · ${items.length} items parsed${report.issues.length ? ` (${report.issues.length} unparsed)` : ""} · header ${declared.tagged ? "tagged" : "untagged"}${declared.errors.length ? ` · ERRORS: ${declared.errors.join("; ")}` : ""}`);
    say();
    say(`| Driver | ${ANCHOR_TIERS.map((tier) => TIER_WORD[tier]).join(" | ")} |`);
    say(`|---|${ANCHOR_TIERS.map(() => "---").join("|")}|`);
    for (const row of grid.rows) {
      say(`| ${row.slot === "R" ? "Reserve" : row.slot} | ${ANCHOR_TIERS.map((tier) => row.cells[tier] ?? (row.slot === "R" ? "·" : "**empty**")).join(" | ")} |`);
    }
    say();
    say(`Filled: ${grid.filledCells} of 18 driver cells. Empty: ${grid.emptyCells.length ? grid.emptyCells.join(", ") : "none"}.`);
    const served = grid.served;
    say(`Served by rule (seed "coverage"): ${served.served.map((cell) => `${cell.code}${cell.driver ? `:${cell.driver}` : ""}`).join(", ") || "none"} · tier count E ${served.tierCount.E} / M ${served.tierCount.M} / H ${served.tierCount.H} against ${SERVED_ANCHOR_TIER_MIX.E}/${SERVED_ANCHOR_TIER_MIX.M}/${SERVED_ANCHOR_TIER_MIX.H} · shortfall E ${served.shortfall.E} / M ${served.shortfall.M} / H ${served.shortfall.H} · drivers not covered: ${served.uncoveredDrivers.join(", ") || "none"}.`);
    say(`Non-anchor items to tag from: Easy ${nonAnchorByTier.E}, Moderate ${nonAnchorByTier.M}, Hard ${nonAnchorByTier.H}.`);
    say();
    summary.push(`${label}: ${grid.filledCells} filled, ${grid.emptyCells.length} empty${grid.tagged ? "" : " (untagged)"}; served E${served.tierCount.E} M${served.tierCount.M} H${served.tierCount.H}`);
  }
  say("## Summary");
  say();
  for (const line of summary) say(`- ${line}`);
  say();
  say("NOT-CLOSED: the empty cells are Mythos's authoring list; Cam approves after a domain read.");
  const text = lines.join("\n") + "\n";
  mkdirSync(path.dirname(INBOX_OUT), { recursive: true });
  writeFileSync(INBOX_OUT, text);
  writeFileSync(REPO_OUT, text);
  process.stdout.write(text);
  console.log(`\nwritten: ${INBOX_OUT}\nwritten: ${path.relative(ROOT, REPO_OUT)}`);
}

main();
