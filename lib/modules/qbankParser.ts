import { ModuleDifficulty, ModuleSourceLicense } from "@prisma/client";

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
  stem: string;
  choices: QbankChoice[];
  correctKey: string;
  feedback: string;
  /** Raw bracket text, preserved verbatim for the paper trail. */
  sourceRaw: string;
  sources: QbankSourceRef[];
};

/** High-discrimination anchor candidates called out in the bank stats line. */
export const QBANK_ANCHOR_CODES = new Set(["A9", "B8", "C8", "C19", "D6", "D17"]);

export const QBANK_TEMPLATE_KEY = "qbank-gov-v1";

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
  anchorCodes: ReadonlySet<string>,
  authorities: readonly QbankSourceAuthority[]
): QbankParseReport {
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
      const parsed: ParsedQbankItem[] = [];
      parseItemBlock(block, currentCategory, parsed, keyPrefix, authorities);
      for (const item of parsed) {
        items.push({ ...item, isAnchor: anchorCodes.has(item.code) });
      }
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
  authorities: readonly QbankSourceAuthority[]
): ParsedQbankItem[] {
  const items: ParsedQbankItem[] = [];
  let currentCategory: string | null = null;

  // Items span 1-2 physical lines in the doc (a bolded stem line, then the
  // "a) … — **x.** … *[source]*" line), separated from the next item by a blank
  // line. Buffer each item block and parse the joined text as one logical line.
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    parseItemBlock(buffer.join(" "), currentCategory, items, keyPrefix, authorities);
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

function parseItemBlock(
  block: string,
  currentCategory: string | null,
  items: ParsedQbankItem[],
  keyPrefix: string,
  authorities: readonly QbankSourceAuthority[]
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
      isAnchor: QBANK_ANCHOR_CODES.has(code),
      stem,
      choices,
      correctKey,
      feedback,
      sourceRaw,
      sources: classifyQbankSources(sourceRaw, authorities),
    });
}
