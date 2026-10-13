import { describe, expect, it } from "vitest";
import { formatHits, scanCustomerCopy } from "./helpers/copyScan";

/**
 * guard:reader-words (R-P): no customer-visible string contains builder vocabulary.
 * The list is the audit's; a hit is a defect, never an allowlist entry.
 */
export const READER_WORD_PATTERNS: readonly RegExp[] = [
  /\bcanonical\b/i, /\blegacy\b/i, /\bscaffold(?:s|ing|ed)?\b/i, /\bstaged\b/i, /\bunlock chain\b/i,
  /\bfollow-up session\b/i, /\bpersistence\b/i, /\bruntime\b/i, /\bplumbing\b/i, /\bplaceholder\b/i,
  /\broute(?:s)?\b/i, /\bC2Core\b/, /\bdemo-seeded\b/i,
  // scoring-core (R63, walk leftover 7d): "insight groups" is builder vocabulary.
  /\binsight groups\b/i,
  // box-c (R65, item 6): the em dash never appears in rendered copy; a period, a comma or a colon by sense.
  /\u2014/,
];

/**
 * anchor-pool (R66, item 1): a comma splice is a WARNING, not a failure. Box C's em dash
 * rule turned "clause — clause" into "clause, clause" wherever the dash joined two
 * independent clauses; the sweep split the known ones. The pattern below is the sweep's
 * grep (a comma, then a subject pronoun, a count, or "the <noun>", then a verb); it also
 * matches an introductory phrase ("For a firm, it means"), so a hit is a line to read,
 * not a defect. Hits print to the console and go in the box report.
 */
export const COMMA_SPLICE_PATTERN =
  /, (?:it|you|we|they|this|that|there|progress|firms|the \w+|\d+ \w+(?: \w+)?) (?:is|are|was|were|has|have|had|can|will|would|do|does|did|stand|stands|show|shows|track|tracks|read|reads|run|runs|need|needs|stay|stays|currently)\b/i;

describe("guard:reader-words — builder vocabulary never reaches a reader", () => {
  it("zero hits across customer copy", () => {
    const hits = scanCustomerCopy(READER_WORD_PATTERNS);
    expect(hits, `\n${formatHits(hits)}\n`).toEqual([]);
  });

  it("comma splice candidates are listed as a warning (anchor-pool, R66 item 1)", () => {
    const hits = scanCustomerCopy([COMMA_SPLICE_PATTERN]);
    if (hits.length > 0) {
      // process.stderr, not console: vitest keeps a passing test's console quiet.
      process.stderr.write(`guard:reader-words WARNING: ${hits.length} comma splice candidate(s) to read (not a failure):\n${formatHits(hits)}\n`);
    }
    expect(Array.isArray(hits)).toBe(true);
  });
});
