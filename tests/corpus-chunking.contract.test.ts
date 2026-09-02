import { describe, expect, it } from "vitest";
import { estimateTokens, splitIntoSections } from "@/lib/corpus/chunking";
import { GLOBAL_VERTICAL_ID, DEFAULT_VERTICAL_ID, FROZEN_VERTICAL_IDS } from "@/lib/verticals/context";

/**
 * Section-level chunking (Box 1 ranking fix) + the vertical-neutral sentinel pin.
 */

describe("splitIntoSections", () => {
  it("keeps a no-H2 article as ONE chunk, byte-identical to the old indexer", () => {
    // Every legacy help doc is a single paragraph. Re-indexing them must be a
    // no-op for content, or their `path#0` eval refs would move for no reason.
    const chunks = splitIntoSections("Firm Alignment Assessment", "The five-module system.");
    expect(chunks).toEqual([
      {
        chunkIdx: 0,
        text: "Firm Alignment Assessment\n\nThe five-module system.",
        tokens: estimateTokens("Firm Alignment Assessment\n\nThe five-module system."),
      },
    ]);
  });

  it("puts the answer-first opening at chunkIdx 0", () => {
    // Chunk 0 must stay "the top of this article": it is the highest-value chunk
    // in an answer-first article, and existing citations mean exactly that.
    const chunks = splitIntoSections("T", "Opening answer.\n\n## First section\n\nBody one.");
    expect(chunks[0]!.chunkIdx).toBe(0);
    expect(chunks[0]!.text).toBe("T\n\nOpening answer.");
  });

  it("makes one chunk per H2, numbered contiguously", () => {
    const chunks = splitIntoSections(
      "Alignment Delta",
      "Opening.\n\n## How it is computed\n\nMath here.\n\n## A worked example\n\nNumbers here."
    );
    expect(chunks.map((c) => c.chunkIdx)).toEqual([0, 1, 2]);
    expect(chunks[1]!.text).toBe("Alignment Delta — How it is computed\n\nMath here.");
    expect(chunks[2]!.text).toBe("Alignment Delta — A worked example\n\nNumbers here.");
  });

  it("carries the article title into every section chunk", () => {
    // A section retrieved alone must still say what it belongs to; without it a
    // chunk reading "It is computed from the five module scores" reaches the
    // model with nothing to anchor it.
    const chunks = splitIntoSections("Pillar", "Intro.\n\n## What a pillar is not\n\nNot a module.");
    expect(chunks.every((c) => c.text.startsWith("Pillar"))).toBe(true);
  });

  it("handles an article that opens directly on an H2", () => {
    const chunks = splitIntoSections("T", "## Only section\n\nBody.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.chunkIdx).toBe(0);
    expect(chunks[0]!.text).toBe("T — Only section\n\nBody.");
  });

  it("skips empty sections rather than indexing blanks", () => {
    const chunks = splitIntoSections("T", "Intro.\n\n## Empty\n\n## Real\n\nBody.");
    expect(chunks).toHaveLength(2);
    expect(chunks[1]!.text).toBe("T — Real\n\nBody.");
  });

  it("never returns zero chunks, so an article cannot vanish from the corpus", () => {
    const chunks = splitIntoSections("T", "## Heading with no body");
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("ignores H3 and deeper — only H2 is a section boundary", () => {
    // The skeleton law is about H2s. Splitting deeper would fragment answers.
    const chunks = splitIntoSections("T", "Intro.\n\n## Section\n\n### Sub\n\nBody.");
    expect(chunks).toHaveLength(2);
    expect(chunks[1]!.text).toContain("### Sub");
  });

  it("does not treat a mid-line ## as a heading", () => {
    const chunks = splitIntoSections("T", "Intro mentioning ## in prose.\n\nMore.");
    expect(chunks).toHaveLength(1);
  });
});

/**
 * §5.4 applies to this sentinel exactly as it applies to a pack id: 30 stored
 * KnowledgeSource rows now carry the literal string "global" in verticalId.
 * Renaming the constant would leave every one of them pointing at a scope marker
 * nothing recognises — and nothing would fail loudly, because the column would
 * still hold a valid-looking string.
 *
 * FROZEN_VERTICAL_IDS is the wrong home for it (every id there must resolve to
 * an installed pack, and this one deliberately resolves to none), so the literal
 * is pinned here instead. A rename is a data migration, never a constant edit.
 */
describe("GLOBAL_VERTICAL_ID is pinned to its stored literal", () => {
  it("is exactly \"global\"", () => {
    expect(GLOBAL_VERTICAL_ID).toBe("global");
  });

  it("is NOT a frozen pack id, and is not the default vertical", () => {
    expect(FROZEN_VERTICAL_IDS).not.toContain(GLOBAL_VERTICAL_ID);
    expect(GLOBAL_VERTICAL_ID).not.toBe(DEFAULT_VERTICAL_ID);
  });

  it("has no pack directory, because it is a scope marker and not a vertical", async () => {
    const { loadVerticalPack } = await import("@/lib/verticals/loader");
    await expect(loadVerticalPack(GLOBAL_VERTICAL_ID)).rejects.toThrow(/not found/i);
  });
});
