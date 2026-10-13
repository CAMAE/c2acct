import { ModuleDifficulty, ModuleSourceLicense } from "@prisma/client";

import {
  ANCHOR_DRIVERS,
  ANCHOR_RESERVE,
  type AnchorPoolCell,
  type AnchorSlot,
  type AnchorTier,
} from "@/lib/assessmentCore";

/**
 * PAT Question Bank v1 markdown parser (Sprint 4 M2, 2026-07-08).
 *
 * The bank lives as a local-only governance doc (docs/elite-sprint/ is
 * gitignored). This pure parser turns its regular item lines into structured
 * rows the import script (scripts/modules/import-qbank.ts) upserts as ModuleItem
 * + ModuleSource records. It is exported and tested against an inline fixture so
 * the test never depends on the gitignored source doc.
 *
 * Item line shape (one item per line):
 *   **A1 (E)** <stem> a) <a> b) <b> c) <c> d) <d> — **b.** <feedback> *[<source>]*
 * Section headers set the category:
 *   ## SECTION A — Control Environment & Firm Governance (27: 8E/14M/5H)
 */

export type QbankChoice = { key: string; label: string };

export type QbankSourceRef = {
  sourceOrg: string;
  sourceDoc: string;
  licenseType: ModuleSourceLicense;
};

/**
 * One citation authority, supplied by the resolved Vertical Pack's
 * `questionBank.sourceAuthorities` (VERTICAL-READINESS-AUDIT-2026-08 §3.1, W4).
 * These used to be five hardcoded `if (has(...))` branches naming US
 * accounting/security bodies; a legal or healthcare vertical shares NIST and
 * nothing else, so the list is pack data, not parser code.
 */
export type QbankSourceAuthority = {
  /** Attribution org recorded on the ModuleSource row. */
  sourceOrg: string;
  /** Case-insensitive substrings; any hit classifies the citation. */
  match: readonly string[];
  licenseType: ModuleSourceLicense;
};

/**
 * The sourced-content bar, and deliberately NOT pack data: every vertical must
 * fail an unrecognized citation loudly rather than seed an unsourced item.
 */
export const UNCLASSIFIED_SOURCE_ORG = "UNCLASSIFIED";

export type ParsedQbankItem = {
  /** Bank code, e.g. "A1". */
  code: string;
  /** Stable seed key, e.g. "qbank-gov-v1-a1". */
  key: string;
  category: string;
  difficulty: ModuleDifficulty;
  isAnchor: boolean;
  /** anchor-pool (R66, item 2): the header cell this anchor sits in; null for a non-anchor or the untagged header form. */
  anchorCell: { driver: AnchorSlot; tier: AnchorTier } | null;
  stem: string;
  choices: QbankChoice[];
  correctKey: string;
  feedback: string;
  /** Raw bracket text, preserved verbatim for the paper trail. */
  sourceRaw: string;
  sources: QbankSourceRef[];
};

export const QBANK_TEMPLATE_KEY = "qbank-gov-v1";

/**
 * enforce-core (R62, charter ruling 48): anchors are PER BANK. Each bank declares
 * its own high-discrimination anchors on its "Bank stats" line
 * ("… anchor-item candidates: A9, B8, C8, C19, D6, D17 …"); the parser reads that
 * line and flags exactly those codes. The hardcoded Governance set that used to
 * live here stamped Governance's six onto the Integration bank (whose own six are
 * A12, B9, C13, C17, D8, D16) — both sets exist in both banks, so an anchor COUNT
 * check passed while the wrong items were anchors.
 */
export const QBANK_ANCHOR_LINE_MARKER = "anchor-item candidates";

/**
 * anchor-pool (R66, item 2): the header line is a POOL. Each entry is a bare
 * code ("A9", the six-code form that every bank carried before the pool) or a
 * tagged cell ("A2:D1:E": code, charter driver D1 to D6 or the reserve R, tier
 * E/M/H). A line is one form or the other; a code appears once; a cell (driver
 * and tier) holds at most one code; at most 18 driver cells plus 3 reserve.
 * The untagged form stays valid and reads as the served set with no driver,
 * each tier taken from the item's own tier later; the importer warns on it.
 */
export const ANCHOR_POOL_MAX_DRIVER_CELLS = 18;
const ANCHOR_TOKEN_RE = /^([A-D]\d+)(?::(D[1-6]|R):([EMH]))?$/;

export type DeclaredAnchors = {
  codes: Set<string>;
  raw: string | null;
  /** One cell per declared code, in header order; driver and tier null on the untagged form. */
  pool: AnchorPoolCell[];
  /** True when every code carries driver and tier tags. */
  tagged: boolean;
  /** The untagged form: printed by the importer, never a failure. */
  warnings: string[];
  /** A malformed line: the importer refuses it. */
  errors: string[];
};

export function readDeclaredAnchorCodes(markdown: string): DeclaredAnchors {
  const line = markdown.split(/\r?\n/).find((entry) => entry.includes(QBANK_ANCHOR_LINE_MARKER));
  if (!line) return { codes: new Set(), raw: null, pool: [], tagged: false, warnings: [], errors: [] };
  // Everything after the marker up to the trailing note in parentheses.
  const after = (line.split(`${QBANK_ANCHOR_LINE_MARKER}:`)[1] ?? "").split("(")[0] ?? "";
  const tokens = after.split(",").map((token) => token.trim()).filter((token) => token.length > 0);
  const pool: AnchorPoolCell[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenCodes = new Set<string>();
  const seenCells = new Set<string>();
  let taggedCount = 0;
  for (const token of tokens) {
    const match = ANCHOR_TOKEN_RE.exec(token);
    if (!match) {
      errors.push(`anchor line: "${token}" is not a code (A9) or a tagged cell (A2:D1:E)`);
      continue;
    }
    const code = match[1]!;
    const driver = (match[2] as AnchorSlot | undefined) ?? null;
    const tier = (match[3] as AnchorTier | undefined) ?? null;
    if (seenCodes.has(code)) errors.push(`anchor line: ${code} appears more than once`);
    seenCodes.add(code);
    if (driver && tier) {
      taggedCount += 1;
      const cell = `${driver}:${tier}`;
      if (seenCells.has(cell)) errors.push(`anchor line: cell ${cell} holds more than one code (${code})`);
      seenCells.add(cell);
    }
    pool.push({ code, driver, tier });
  }
  const tagged = pool.length > 0 && taggedCount === pool.length;
  if (taggedCount > 0 && !tagged) errors.push("anchor line mixes tagged cells and bare codes; use one form");
  if (tagged) {
    const driverCells = pool.filter((cell) => cell.driver !== ANCHOR_RESERVE).length;
    if (driverCells > ANCHOR_POOL_MAX_DRIVER_CELLS) {
      errors.push(`anchor line: ${driverCells} driver cells, the pool holds at most ${ANCHOR_POOL_MAX_DRIVER_CELLS} (${ANCHOR_DRIVERS.length} drivers by three tiers)`);
    }
  } else if (pool.length > 0) {
    warnings.push(
      `anchor line is the untagged six-code form (${pool.map((cell) => cell.code).join(", ")}): served as the set it names, driver unknown; tag cells as code:driver:tier to form a pool`
    );
  }
  return { codes: seenCodes, raw: line.trim(), pool, tagged, warnings, errors };
}

/** The pool with each untagged cell's tier filled from its item's own difficulty (the untagged form carries no tier). */
export function poolWithItemTiers(pool: readonly AnchorPoolCell[], items: ReadonlyArray<{ code: string; difficulty: ModuleDifficulty }>): AnchorPoolCell[] {
  const tierByCode = new Map(items.map((item) => [item.code, TIER_LETTER[item.difficulty]]));
  return pool.map((cell) => (cell.tier ? cell : { ...cell, tier: tierByCode.get(cell.code) ?? null }));
}

export const TIER_LETTER: Record<ModuleDifficulty, AnchorTier> = {
  [ModuleDifficulty.EASY]: "E",
  [ModuleDifficulty.MODERATE]: "M",
  [ModuleDifficulty.HARD]: "H",
};

const DIFFICULTY_MAP: Record<string, ModuleDifficulty> = {
  E: ModuleDifficulty.EASY,
  M: ModuleDifficulty.MODERATE,
  H: ModuleDifficulty.HARD,
};

const SECTION_RE = /^##\s+SECTION\s+([A-D])\s+—\s+(.+?)\s*\(\d+:/;
const ITEM_RE = /^\*\*([A-D]\d+)\s*\(([EMH])\)\*\*\s*(.+)$/;
const ANSWER_SPLIT_RE = /\s*—\s*\*\*([a-d])\.\*\*\s*/;
const OPTIONS_RE = /^(.*?)\s+a\)\s+(.*?)\s+b\)\s+(.*?)\s+c\)\s+(.*?)\s+d\)\s+(.*)$/;
const SOURCE_RE = /^(.*?)\s*\*\[(.+?)\]\*\s*$/;

/**
 * Classify a raw source string into one or more tiered source refs, against the
 * authority list the resolved Vertical Pack declares.
 *
 * `authorities` is required and has no default on purpose. A default would be a
 * second copy of the accounting list living in code, free to drift from the
 * pack — which is exactly the coupling W4 exists to remove. Callers resolve it
 * once via `loadQbankSourceAuthorities()`.
 *
 * ORDER IS SIGNIFICANT: refs come out in authority order, so a citation naming
 * both GAO and COSO yields [GAO, COSO] iff the manifest lists GAO first.
 */
export function classifyQbankSources(
  raw: string,
  authorities: readonly QbankSourceAuthority[]
): QbankSourceRef[] {
  const refs: QbankSourceRef[] = [];
  const haystack = raw.toLowerCase();

  for (const authority of authorities) {
    if (authority.match.some((needle) => haystack.includes(needle.toLowerCase()))) {
      refs.push({ sourceOrg: authority.sourceOrg, sourceDoc: raw, licenseType: authority.licenseType });
    }
  }

  // Every item must carry at least one source (the sourced-content bar). If the
  // classifier recognized nothing, surface it as a CITED "unclassified" ref so
  // the import fails loudly rather than seeding an unsourced item.
  if (refs.length === 0) {
    refs.push({
      sourceOrg: UNCLASSIFIED_SOURCE_ORG,
      sourceDoc: raw,
      licenseType: ModuleSourceLicense.CITED,
    });
  }
  return refs;
}

export type QbankParseIssue = { code: string | null; message: string };

export type QbankParseReport = {
  items: ParsedQbankItem[];
  /** One entry per item block that could not be parsed. */
  issues: QbankParseIssue[];
  /** Item blocks detected in the source, parsed or not. */
  blocksSeen: number;
};

/**
 * VALIDATE-ONLY parse. Never writes, never throws on a malformed item: it
 * isolates each item block so one broken marker cannot hide the state of every
 * item after it.
 *
 * parseQbank() throws on the first bad block, which is right for an import (a
 * partially-parsed bank must not seed) and wrong for a preflight, where the
 * whole point is to see every defect in one pass before anyone signs off.
 */
export function parseQbankReport(
  markdown: string,
  keyPrefix: string,
  anchorCodes: ReadonlySet<string> | null,
  authorities: readonly QbankSourceAuthority[]
): QbankParseReport {
  const anchors = anchorPoolFor(markdown, anchorCodes);
  const items: ParsedQbankItem[] = [];
  const issues: QbankParseIssue[] = [];
  let blocksSeen = 0;
  let currentCategory: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const block = buffer.join(" ");
    buffer = [];
    blocksSeen += 1;
    const code = ITEM_RE.exec(block)?.[1] ?? null;
    try {
      parseItemBlock(block, currentCategory, items, keyPrefix, authorities, anchors);
    } catch (error) {
      issues.push({ code, message: error instanceof Error ? error.message : String(error) });
    }
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    const sectionMatch = SECTION_RE.exec(line);
    if (sectionMatch) {
      flush();
      currentCategory = sectionMatch[2]!.trim();
      continue;
    }
    if (ITEM_RE.test(line)) {
      flush();
      buffer = [line];
      continue;
    }
    if (buffer.length > 0) buffer.push(line);
  }
  flush();

  return { items, issues, blocksSeen };
}

export function parseQbank(
  markdown: string,
  keyPrefix: string,
  authorities: readonly QbankSourceAuthority[],
  /** legal-load (R64, 1b): an operator-named set (PAT_QBANK_ANCHORS) overrides the bank's header line. */
  anchorCodes: ReadonlySet<string> | null = null
): ParsedQbankItem[] {
  const items: ParsedQbankItem[] = [];
  // The bank's OWN anchors, from its stats line (never a hardcoded set), unless the operator named them.
  const anchors = anchorPoolFor(markdown, anchorCodes);
  let currentCategory: string | null = null;

  // Items span 1-2 physical lines in the doc (a bolded stem line, then the
  // "a) … — **x.** … *[source]*" line), separated from the next item by a blank
  // line. Buffer each item block and parse the joined text as one logical line.
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    parseItemBlock(buffer.join(" "), currentCategory, items, keyPrefix, authorities, anchors);
    buffer = [];
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    const sectionMatch = SECTION_RE.exec(line);
    if (sectionMatch) {
      flush();
      currentCategory = sectionMatch[2]!.trim();
      continue;
    }

    if (ITEM_RE.test(line)) {
      flush();
      buffer = [line];
      continue;
    }

    // Continuation of the current item block (only while one is open).
    if (buffer.length > 0) buffer.push(line);
  }
  flush();

  return items;
}

/** The pool the parser flags from: the operator's bare set (no cells), else the header line's. */
function anchorPoolFor(markdown: string, anchorCodes: ReadonlySet<string> | null): ReadonlyMap<string, AnchorPoolCell> {
  const cells = anchorCodes
    ? [...anchorCodes].map((code): AnchorPoolCell => ({ code, driver: null, tier: null }))
    : readDeclaredAnchorCodes(markdown).pool;
  return new Map(cells.map((cell) => [cell.code, cell]));
}

function parseItemBlock(
  block: string,
  currentCategory: string | null,
  items: ParsedQbankItem[],
  keyPrefix: string,
  authorities: readonly QbankSourceAuthority[],
  anchorPool: ReadonlyMap<string, AnchorPoolCell>
): void {
  const itemMatch = ITEM_RE.exec(block);
  if (!itemMatch) return;

  const code = itemMatch[1]!;
  const difficulty = DIFFICULTY_MAP[itemMatch[2]!];
  const rest = itemMatch[3]!;
  if (!difficulty) throw new Error(`qbank ${code}: unknown difficulty "${itemMatch[2]}"`);
  if (!currentCategory) throw new Error(`qbank ${code}: item appeared before any SECTION header`);

  const answerParts = rest.split(ANSWER_SPLIT_RE);
    if (answerParts.length !== 3) {
      throw new Error(`qbank ${code}: could not locate a single "— **x.**" answer marker`);
    }
    const [optionsPart, correctKey, afterAnswer] = answerParts as [string, string, string];

    const optMatch = OPTIONS_RE.exec(optionsPart);
    if (!optMatch) throw new Error(`qbank ${code}: could not parse a) b) c) d) options`);
    const stem = optMatch[1]!.trim();
    const choices: QbankChoice[] = [
      { key: "a", label: optMatch[2]!.trim() },
      { key: "b", label: optMatch[3]!.trim() },
      { key: "c", label: optMatch[4]!.trim() },
      { key: "d", label: optMatch[5]!.trim() },
    ];

    const srcMatch = SOURCE_RE.exec(afterAnswer);
    if (!srcMatch) throw new Error(`qbank ${code}: missing *[source]* citation`);
    const feedback = srcMatch[1]!.trim();
    const sourceRaw = srcMatch[2]!.trim();

    items.push({
      code,
      key: `${keyPrefix}-${code.toLowerCase()}`,
      category: currentCategory,
      difficulty,
      isAnchor: anchorPool.has(code),
      anchorCell: anchorCell(anchorPool.get(code)),
      stem,
      choices,
      correctKey,
      feedback,
      sourceRaw,
      sources: classifyQbankSources(sourceRaw, authorities),
    });
}

function anchorCell(cell: AnchorPoolCell | undefined): ParsedQbankItem["anchorCell"] {
  if (!cell || !cell.driver || !cell.tier) return null;
  return { driver: cell.driver, tier: cell.tier };
}
