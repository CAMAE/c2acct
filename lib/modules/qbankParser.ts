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

/** Classify a raw source string into one or more tiered source refs. */
export function classifyQbankSources(raw: string): QbankSourceRef[] {
  const refs: QbankSourceRef[] = [];
  const has = (needle: string) => raw.toLowerCase().includes(needle.toLowerCase());

  // Primary public-domain government sources (free to use outright).
  if (has("Green Book") || has("Yellow Book") || has("GAGAS") || has("GAO")) {
    refs.push({ sourceOrg: "GAO", sourceDoc: raw, licenseType: ModuleSourceLicense.PUBLIC_DOMAIN });
  }
  if (has("Circular 230") || has("IRS")) {
    refs.push({ sourceOrg: "IRS", sourceDoc: raw, licenseType: ModuleSourceLicense.PUBLIC_DOMAIN });
  }
  if (has("NIST")) {
    refs.push({ sourceOrg: "NIST", sourceDoc: raw, licenseType: ModuleSourceLicense.PUBLIC_DOMAIN });
  }
  // FTC Safeguards Rule (16 CFR Part 314, GLBA implementing reg) — federal
  // regulation, public domain. Used across the Integration & Data Flow bank.
  if (has("FTC") || has("Safeguards Rule") || has("16 CFR") || has("GLBA")) {
    refs.push({ sourceOrg: "FTC", sourceDoc: raw, licenseType: ModuleSourceLicense.PUBLIC_DOMAIN });
  }
  // Copyrighted-but-citable tier: summarized + attributed, never reproduced.
  if (has("COSO")) {
    refs.push({ sourceOrg: "COSO", sourceDoc: raw, licenseType: ModuleSourceLicense.CITED });
  }

  // Every item must carry at least one source (the sourced-content bar). If the
  // classifier recognized nothing, surface it as a CITED "unclassified" ref so
  // the import fails loudly rather than seeding an unsourced item.
  if (refs.length === 0) {
    refs.push({ sourceOrg: "UNCLASSIFIED", sourceDoc: raw, licenseType: ModuleSourceLicense.CITED });
  }
  return refs;
}

export function parseQbank(
  markdown: string,
  keyPrefix: string = QBANK_TEMPLATE_KEY
): ParsedQbankItem[] {
  const items: ParsedQbankItem[] = [];
  let currentCategory: string | null = null;

  // Items span 1-2 physical lines in the doc (a bolded stem line, then the
  // "a) … — **x.** … *[source]*" line), separated from the next item by a blank
  // line. Buffer each item block and parse the joined text as one logical line.
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    parseItemBlock(buffer.join(" "), currentCategory, items, keyPrefix);
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
  keyPrefix: string
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
      sources: classifyQbankSources(sourceRaw),
    });
}
