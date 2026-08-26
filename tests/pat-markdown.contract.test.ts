import { describe, expect, it } from "vitest";
import { parseInlineMarkdown, parseMarkdownBlocks } from "@/lib/patMarkdown";

describe("parseInlineMarkdown (Ask-Pat chat, 13h rider #2)", () => {
  it("turns **bold** into a bold token with the asterisks stripped", () => {
    expect(parseInlineMarkdown("**Yes** you can")).toEqual([
      { kind: "bold", value: "Yes" },
      { kind: "text", value: " you can" },
    ]);
  });

  it("handles *italic* emphasis", () => {
    expect(parseInlineMarkdown("go to *Insights*")).toEqual([
      { kind: "text", value: "go to " },
      { kind: "italic", value: "Insights" },
    ]);
  });

  it("mixes bold, italic, and plain text in order", () => {
    expect(parseInlineMarkdown("**A** then *b* then c")).toEqual([
      { kind: "bold", value: "A" },
      { kind: "text", value: " then " },
      { kind: "italic", value: "b" },
      { kind: "text", value: " then c" },
    ]);
  });

  it("leaves plain text (and newlines) untouched, no stray asterisks", () => {
    const tokens = parseInlineMarkdown("line one\nline two");
    expect(tokens).toEqual([{ kind: "text", value: "line one\nline two" }]);
    expect(tokens.every((t) => !t.value.includes("*"))).toBe(true);
  });

  it("passes non-emphasis syntax (bullets) through as plain text", () => {
    const tokens = parseInlineMarkdown("- first\n- second");
    expect(tokens).toEqual([{ kind: "text", value: "- first\n- second" }]);
  });

  it("never emits residual ** markers for well-formed bold", () => {
    for (const token of parseInlineMarkdown("**one** and **two**")) {
      expect(token.value).not.toContain("*");
    }
  });
});

describe("parseInlineMarkdown — underscores, code, and safety", () => {
  it("handles __bold__ and _italic_ underscore emphasis", () => {
    expect(parseInlineMarkdown("__Yes__ and _maybe_")).toEqual([
      { kind: "bold", value: "Yes" },
      { kind: "text", value: " and " },
      { kind: "italic", value: "maybe" },
    ]);
  });

  it("does NOT italicise inside a word", () => {
    // snake_case identifiers and file names are far more common in Pat's
    // answers than intra-word italics; italicising half an identifier would
    // corrupt the very thing being quoted.
    expect(parseInlineMarkdown("see scripts/seed_pat_runtime.ts")).toEqual([
      { kind: "text", value: "see scripts/seed_pat_runtime.ts" },
    ]);
    expect(parseInlineMarkdown("PAT_ENABLE_ADAPTIVE_MODULES is off")).toEqual([
      { kind: "text", value: "PAT_ENABLE_ADAPTIVE_MODULES is off" },
    ]);
  });

  it("renders `inline code` as a code token", () => {
    expect(parseInlineMarkdown("run `pnpm eval` first")).toEqual([
      { kind: "text", value: "run " },
      { kind: "code", value: "pnpm eval" },
      { kind: "text", value: " first" },
    ]);
  });

  it("does not apply emphasis inside a code span", () => {
    // Code is resolved first, so markup inside it stays literal.
    expect(parseInlineMarkdown("`**not bold**`")).toEqual([
      { kind: "code", value: "**not bold**" },
    ]);
  });

  it("passes HTML through as TEXT — never as markup", () => {
    // The tokenizer emits structure, never HTML. A script tag in a model reply
    // must reach React as a text child (escaped on render), which is what makes
    // dangerouslySetInnerHTML unnecessary here.
    const tokens = parseInlineMarkdown('<script>alert("x")</script>');
    expect(tokens).toEqual([{ kind: "text", value: '<script>alert("x")</script>' }]);
    expect(tokens.every((token) => ["text", "bold", "italic", "code"].includes(token.kind))).toBe(true);
  });

  it("leaves unmatched markers alone", () => {
    expect(parseInlineMarkdown("2 * 3 = 6")).toEqual([{ kind: "text", value: "2 * 3 = 6" }]);
  });
});

describe("parseMarkdownBlocks (lists)", () => {
  it("groups consecutive bullet lines into one unordered list", () => {
    const blocks = parseMarkdownBlocks("Here:\n- first\n- second\n");
    expect(blocks).toEqual([
      { kind: "paragraph", inline: [{ kind: "text", value: "Here:" }] },
      {
        kind: "list",
        ordered: false,
        items: [[{ kind: "text", value: "first" }], [{ kind: "text", value: "second" }]],
      },
    ]);
  });

  it("recognises ordered lists", () => {
    const blocks = parseMarkdownBlocks("1. one\n2. two");
    expect(blocks).toEqual([
      {
        kind: "list",
        ordered: true,
        items: [[{ kind: "text", value: "one" }], [{ kind: "text", value: "two" }]],
      },
    ]);
  });

  it("starts a new list when the marker kind changes", () => {
    const blocks = parseMarkdownBlocks("- bullet\n1. numbered");
    expect(blocks.map((b) => (b.kind === "list" ? b.ordered : b.kind))).toEqual([false, true]);
  });

  it("applies inline emphasis inside list items", () => {
    const blocks = parseMarkdownBlocks("- **Pro** tier\n- run `pnpm eval`");
    expect(blocks).toEqual([
      {
        kind: "list",
        ordered: false,
        items: [
          [{ kind: "bold", value: "Pro" }, { kind: "text", value: " tier" }],
          [{ kind: "text", value: "run " }, { kind: "code", value: "pnpm eval" }],
        ],
      },
    ]);
  });

  it("keeps a plain answer as a single paragraph", () => {
    const blocks = parseMarkdownBlocks("Just one sentence.");
    expect(blocks).toEqual([
      { kind: "paragraph", inline: [{ kind: "text", value: "Just one sentence." }] },
    ]);
  });
});
