import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT, formatHits, scanCustomerCopy } from "./helpers/copyScan";

/**
 * guard:retired-names (R-U): the lexicon's retired words never appear in customer
 * copy — consultant (Guide), peer-validated, pillars in copy, "five part",
 * canonical, and Q1 to Q4 standing alone (a quarter label like "Q3 2026" is a date,
 * not a band, and stays).
 */
export const RETIRED_NAME_PATTERNS: readonly RegExp[] = [
  /\bconsultants?\b/i, /\bpeer-validated\b/i, /\bpillars?\b/i, /\bfive[- ]part\b/i, /\bcanonical\b/i,
  /(?<![\w$])Q[1-4](?!\s*\d{4})(?![\w-])/,
];

/**
 * deploy-night-2 pin (R17, R-J, 2026-10-12): a nav label is one word, so the
 * whitespace rule in readerStrings never sees it and the allow below lets a bare
 * "Consultant" through. The signed-out header menu shipped `label: "Consultant"`
 * on the V7 front door that night. Every `label:` string literal in the shell nav
 * files is scanned as a word, with no allow; a label built from guideWord() is not
 * a literal and is not a hit.
 */
const SHELL_NAV_FILES = [
  "app/components/shell/SignedOutHeaderMenu.tsx",
  "app/components/shell/AppShell.tsx",
  "app/components/shell/SignedInHeaderControls.tsx",
];

describe("guard:retired-names — one name per thing", () => {
  it("zero hits across customer copy", () => {
    const hits = scanCustomerCopy(RETIRED_NAME_PATTERNS, (hit) =>
      // guideWord("consultant") / guideWord("Consultants"): the form argument is the key of the lexicon map, not copy
      /guideWord\(/.test(hit.text) || /^Consultants?$/.test(hit.text.trim())
    );
    expect(hits, `\n${formatHits(hits)}\n`).toEqual([]);
  });

  it("shell nav labels carry no retired name, one word or many (signed-out menu pinned)", () => {
    const hits: string[] = [];
    const label = /\blabel:\s*(?:"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`)/g;
    for (const rel of SHELL_NAV_FILES) {
      const source = readFileSync(path.join(ROOT, rel), "utf8");
      let match: RegExpExecArray | null;
      while ((match = label.exec(source))) {
        const text = match[1] ?? match[2] ?? match[3] ?? "";
        if (RETIRED_NAME_PATTERNS.some((pattern) => pattern.test(text))) {
          const line = source.slice(0, match.index).split("\n").length;
          hits.push(`${rel}:${line}: ${text}`);
        }
      }
    }
    expect(hits, `\n${hits.join("\n")}\n`).toEqual([]);
  });
});
