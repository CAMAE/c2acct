import { describe, expect, it } from "vitest";
import { parseInlineMarkdown } from "@/lib/patMarkdown";

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
