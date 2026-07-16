/**
 * Minimal inline-markdown tokenizer for Pat answers. The Ask-Pat model emits
 * **bold** (and occasionally *italic*) for emphasis; rendered raw it showed
 * literal asterisks in the chat panel (13h rider #2). This is a pure, XSS-safe
 * tokenizer — the caller maps tokens to <strong>/<em>/<span>, never
 * dangerouslySetInnerHTML. Newlines and any other syntax (bullets, etc.) pass
 * through as plain-text tokens; the chat wrapper keeps whitespace-pre-wrap.
 */
export type MarkdownToken = { kind: "text" | "bold" | "italic"; value: string };

export function parseInlineMarkdown(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  for (const chunk of text.split(/(\*\*[^*]+\*\*)/g)) {
    const bold = /^\*\*([^*]+)\*\*$/.exec(chunk);
    if (bold) {
      tokens.push({ kind: "bold", value: bold[1]! });
      continue;
    }
    for (const piece of chunk.split(/(\*[^*]+\*)/g)) {
      const italic = /^\*([^*]+)\*$/.exec(piece);
      if (italic) {
        tokens.push({ kind: "italic", value: italic[1]! });
      } else if (piece) {
        tokens.push({ kind: "text", value: piece });
      }
    }
  }
  return tokens;
}
