import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * pattern box B (R61, R-P, R-U): the customer-copy scan behind guard:reader-words
 * and guard:retired-names. It walks the files a customer reads, pulls the strings a
 * reader can see (sentence-like string literals and JSX text in .ts/.tsx; whole
 * lines in help markdown) and returns every hit of a pattern. Admin and dev pages,
 * API routes, auth, release, agents and seed internals are outside the scan.
 */
export const ROOT = path.resolve(__dirname, "..", "..");

const SCAN_DIRS = ["app/(app)", "app/(public)", "app/components", "help"];
const SCAN_FILES = [
  "lib/locale.ts", "lib/trustContent.ts", "lib/membershipContent.ts", "lib/insightContent.ts", "lib/firmPat.ts",
  "lib/firmInsightEngine.ts", "lib/vendorAlignmentInsightEngine.ts", "lib/vendorProductInsightEngine.ts",
  "lib/adminBriefingEngine.ts", "lib/eliteInsightsV2.ts", "lib/battleCard.ts", "lib/briefs.ts", "lib/firmBriefs.ts",
  "lib/patNavigation.ts", "lib/portalVisibility.ts", "lib/publicOnboarding.ts", "lib/pilotSurfaces.ts",
  "lib/platformRollout.ts", "lib/patUnlocks.ts", "lib/helpArticleLinks.ts", "lib/methodology.ts",
  "lib/notifications/nudge.ts", "lib/notifications/staleness/plan.ts", "lib/notifications/staleness/generators.ts",
  "lib/notifications/patPingCopy.ts", "lib/firmBriefs/template-bank.ts", "lib/briefs/executive-summary-templates.ts",
  "lib/vendorProductAssessmentPlan.ts", "lib/gapMapDrilldown.ts",
  // enforce-core (11a): the briefing board is shared by the Guide and Enterprise briefings; its strings are customer copy.
  "app/components/admin/briefings/BriefingBoard.tsx",
  // legal-load (R64, delta 8): the legal channel's firm module words and option sets are customer copy;
  // the reader-words and retired-names guards run over them as they run over accounting's.
  "lib/verticals/packs/legalFirmModules.ts",
  "lib/assessment/legalFirmFollowUpOptions.ts",
];
const EXCLUDE = [/\/admin(\/|$)/, /\/dev(\/|$)/, /\/dev-preview(\/|$)/, /\/api(\/|$)/, /\.test\./, /lexicon-data-occurrences\.md$/, /\/_components\/.*Admin/, /app\/components\/agents\//];

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|md)$/.test(entry)) out.push(full);
  }
}

export function customerCopyFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), files);
  for (const file of SCAN_FILES) files.push(path.join(ROOT, file));
  const explicit = new Set(SCAN_FILES);
  return files
    .map((file) => path.relative(ROOT, file))
    // EXCLUDE prunes the walked directories; a file named in SCAN_FILES is in the set on purpose.
    .filter((rel) => explicit.has(rel) || !EXCLUDE.some((re) => re.test(`/${rel}`)))
    .filter((rel, index, all) => all.indexOf(rel) === index)
    .sort();
}

export type CopyHit = { file: string; line: number; text: string };

/** Reader-visible strings: literals with a space (sentences, labels), JSX text, help lines. Code-only tokens are skipped. */
function readerStrings(rel: string, source: string): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = [];
  if (rel.endsWith(".md")) {
    source.split("\n").forEach((raw, index) => {
      // link targets and code spans are slugs and keys, not copy
      const text = raw.replace(/\]\([^)]*\)/g, "]()").replace(/`[^`]*`/g, "`");
      if (text.trim()) out.push({ line: index + 1, text });
    });
    return out;
  }
  const literal = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let match: RegExpExecArray | null;
  while ((match = literal.exec(source))) {
    const text = match[1] ?? match[2] ?? match[3] ?? "";
    if (!/\s/.test(text.trim())) continue; // a key, a flag, a class list without words
    if (/^(?:\/|https?:)/.test(text)) continue; // a path or a URL, not copy
    if (/^[\w\s/-]*\bclass(?:Name)?\b/.test(text) || /^(?:[a-z0-9-]+:)?[a-z0-9-]+(?:\s+[a-z0-9-]+(?:\[|:)[^\s]*)*$/.test(text)) continue; // tailwind-looking lists
    const line = source.slice(0, match.index).split("\n").length;
    out.push({ line, text });
  }
  if (rel.endsWith(".tsx")) {
    // JSX text, with {expressions} blanked so a sentence that mixes words and values is still scanned
    const jsx = />((?:[^<>{}]|\{[^{}]*\})*[A-Za-z](?:[^<>{}]|\{[^{}]*\})*)</g;
    while ((match = jsx.exec(source))) {
      const text = match[1].replace(/\{[^{}]*\}/g, " ").trim();
      if (!text || !/\s/.test(text)) continue;
      if (/[;=]|\(\)|\)\)|=>/.test(text)) continue; // code caught between tags, not copy
      const line = source.slice(0, match.index).split("\n").length;
      out.push({ line, text });
    }
  }
  return out;
}

export function scanCustomerCopy(patterns: readonly RegExp[], allow: (hit: CopyHit) => boolean = () => false): CopyHit[] {
  const hits: CopyHit[] = [];
  for (const rel of customerCopyFiles()) {
    const source = readFileSync(path.join(ROOT, rel), "utf8");
    for (const entry of readerStrings(rel, source)) {
      for (const pattern of patterns) {
        if (pattern.test(entry.text)) {
          const hit = { file: rel, line: entry.line, text: entry.text.slice(0, 160) };
          if (!allow(hit)) hits.push(hit);
          break;
        }
      }
    }
  }
  return hits;
}

export function formatHits(hits: CopyHit[]): string {
  return hits.map((hit) => `${hit.file}:${hit.line}: ${hit.text}`).join("\n");
}
