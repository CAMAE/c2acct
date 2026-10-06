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
];

describe("guard:reader-words — builder vocabulary never reaches a reader", () => {
  it("zero hits across customer copy", () => {
    const hits = scanCustomerCopy(READER_WORD_PATTERNS);
    expect(hits, `\n${formatHits(hits)}\n`).toEqual([]);
  });
});
