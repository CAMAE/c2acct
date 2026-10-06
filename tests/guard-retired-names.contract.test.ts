import { describe, expect, it } from "vitest";
import { formatHits, scanCustomerCopy } from "./helpers/copyScan";

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

describe("guard:retired-names — one name per thing", () => {
  it("zero hits across customer copy", () => {
    const hits = scanCustomerCopy(RETIRED_NAME_PATTERNS, (hit) =>
      // guideWord("consultant") / guideWord("Consultants"): the form argument is the key of the lexicon map, not copy
      /guideWord\(/.test(hit.text) || /^Consultants?$/.test(hit.text.trim())
    );
    expect(hits, `\n${formatHits(hits)}\n`).toEqual([]);
  });
});
