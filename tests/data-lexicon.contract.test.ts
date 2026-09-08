import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * "data" lexicon (A2, 2026-09-08). Customer-facing copy should say what the
 * thing is — answers, scores, results, responses — and keep "data" only where it
 * is the technical term. This is a WARN, not a failure: the count is reported so
 * it can be worked down; the allowlist covers the module that is literally named
 * "Integration and Data Flow" and the methodology / security surfaces where the
 * word is the technical term. Leslie's help articles are NOT scanned here — they
 * are listed for her decision in help/lexicon-data-occurrences.md.
 */
const ROOT = process.cwd();

const ALLOWLISTED_FILES = [
  "app/(public)/methodology/page.tsx",
  "app/(public)/security/page.tsx",
  "app/(public)/security/page.tsx",
  "lib/methodology.ts",
];
const ALLOWLISTED_PHRASES = [/integration and data flow/i, /\bdata flow\b/i, /\bdatabase\b/i, /\bdata[- ]handling\b/i, /\bdata[- ]retention\b/i];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!/node_modules|\.next|dev$/.test(full)) walk(full, out);
    } else if (/\.tsx$/.test(full)) out.push(full);
  }
  return out;
}

/** Rendered copy only: JSX text and string literals, not identifiers or comments. */
function copySegments(source: string): string[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const jsxText = [...withoutComments.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]);
  const strings = [...withoutComments.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]);
  return [...jsxText, ...strings].filter((segment) => /\bdata\b/i.test(segment));
}

function scan() {
  const files = [...walk(path.join(ROOT, "app")), path.join(ROOT, "lib/locale.ts"), path.join(ROOT, "lib/trustContent.ts")];
  const hits: { file: string; segment: string }[] = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (ALLOWLISTED_FILES.includes(rel)) continue;
    for (const segment of copySegments(readFileSync(file, "utf8"))) {
      if (ALLOWLISTED_PHRASES.some((phrase) => phrase.test(segment))) continue;
      if (/\bdata-[a-z]/i.test(segment) && !/\bdata\b(?!-)/i.test(segment)) continue; // data-testid etc.
      hits.push({ file: rel, segment: segment.trim().slice(0, 120) });
    }
  }
  return hits;
}

describe('"data" lexicon — WARN on customer copy, allowlist for the technical term', () => {
  it("reports every plain-language 'data' in rendered copy (warning only)", () => {
    const hits = scan();
    if (hits.length > 0) {
      console.warn(
        `[data-lexicon] ${hits.length} plain-language "data" segment(s) in customer copy (prefer answers / scores / results / responses):\n` +
          hits.map((hit) => `  ${hit.file}: ${hit.segment}`).join("\n")
      );
    }
    expect(Array.isArray(hits)).toBe(true);
  });

  it("Pat's grounding rules carry the lexicon instruction", () => {
    const model = readFileSync(path.join(ROOT, "lib/patAssistant/model.ts"), "utf8");
    expect(model).toMatch(/Do not use the word "data" unless it is the technical term[\s\S]{0,200}"answers", "scores", "results", or "responses"/);
  });

  it("Leslie's articles are listed, not edited", () => {
    const listing = readFileSync(path.join(ROOT, "help/lexicon-data-occurrences.md"), "utf8");
    expect(listing).toContain("Nothing under `help/` was edited");
    expect(listing).toMatch(/Lines containing the whole word `data` \(any case\): \*\*\d+\*\*/);
  });
});
