/**
 * Minimal markdown renderer for Pat answers.
 *
 * The Ask-Pat model emits markdown for emphasis, bullets, and code; rendered raw
 * it showed literal asterisks, underscores and backticks in the chat panel.
 * This is a pure tokenizer: it returns STRUCTURE, never HTML. The caller maps
 * tokens to React elements, so every value is escaped by React on render and
 * dangerouslySetInnerHTML is never involved — raw HTML in a model reply cannot
 * become live markup, it renders as the text it is.
 *
 * Supported: **bold** / __bold__, *italic* / _italic_, `inline code`, and
 * unordered (-, *, +) and ordered (1.) lists. Everything else passes through as
 * text; the chat wrapper keeps whitespace-pre-wrap so newlines survive.
 */

export type MarkdownToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string };

export type MarkdownBlock =
  | { kind: "paragraph"; inline: MarkdownToken[] }
  | { kind: "list"; ordered: boolean; items: MarkdownToken[][] };

const CODE_SPLIT = /(`[^`\n]+`)/g;
const BOLD_SPLIT = /(\*\*[^*\n]+\*\*|__[^_\n]+__)/g;
const ITALIC_SPLIT = /(\*[^*\n]+\*|_[^_\n]+_)/g;

const UNORDERED_ITEM = /^[-*+]\s+(.*)$/;
const ORDERED_ITEM = /^\d+[.)]\s+(.*)$/;

/**
 * Underscore emphasis must not fire inside a word: snake_case_identifiers and
 * file_names are far more common in Pat's answers than intra-word italics, and
 * silently italicising half an identifier corrupts the thing being quoted.
 * Asterisk emphasis has no such ambiguity.
 */
function isIntraWordUnderscore(chunk: string, whole: string, index: number): boolean {
  if (!chunk.startsWith("_")) return false;
  const before = whole[index - 1];
  const after = whole[index + chunk.length];
  return Boolean((before && /\w/.test(before)) || (after && /\w/.test(after)));
}

/** Inline tokens for one line of text. Code is resolved first so `**x**` inside it stays literal. */
export function parseInlineMarkdown(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];

  const pushEmphasis = (segment: string) => {
    let cursor = 0;
    for (const chunk of segment.split(BOLD_SPLIT)) {
      if (!chunk) continue;
      const index = segment.indexOf(chunk, cursor);
      cursor = index + chunk.length;

      const bold = /^(?:\*\*([^*\n]+)\*\*|__([^_\n]+)__)$/.exec(chunk);
      if (bold && !isIntraWordUnderscore(chunk, segment, index)) {
        tokens.push({ kind: "bold", value: bold[1] ?? bold[2]! });
        continue;
      }

      let innerCursor = 0;
      for (const piece of chunk.split(ITALIC_SPLIT)) {
        if (!piece) continue;
        const pieceIndex = chunk.indexOf(piece, innerCursor);
        innerCursor = pieceIndex + piece.length;

        const italic = /^(?:\*([^*\n]+)\*|_([^_\n]+)_)$/.exec(piece);
        if (italic && !isIntraWordUnderscore(piece, chunk, pieceIndex)) {
          tokens.push({ kind: "italic", value: italic[1] ?? italic[2]! });
        } else {
          tokens.push({ kind: "text", value: piece });
        }
      }
    }
  };

  for (const segment of text.split(CODE_SPLIT)) {
    if (!segment) continue;
    const code = /^`([^`\n]+)`$/.exec(segment);
    if (code) {
      tokens.push({ kind: "code", value: code[1]! });
      continue;
    }
    pushEmphasis(segment);
  }

  return coalesceText(tokens);
}

/**
 * Merge adjacent text tokens. Splitting on emphasis markers fragments a plain
 * string whenever a marker is rejected (an intra-word underscore, an unmatched
 * asterisk), and emitting those fragments separately would both read oddly in
 * the token stream and render as a pile of sibling spans.
 */
function coalesceText(tokens: MarkdownToken[]): MarkdownToken[] {
  const merged: MarkdownToken[] = [];
  for (const token of tokens) {
    const previous = merged[merged.length - 1];
    if (token.kind === "text" && previous?.kind === "text") {
      previous.value += token.value;
      continue;
    }
    merged.push({ ...token });
  }
  return merged;
}

/**
 * Split an answer into paragraph and list blocks. Consecutive list lines of the
 * same kind group into one list; anything else accumulates into a paragraph so
 * the existing whitespace-pre-wrap behaviour is unchanged for plain answers.
 */
export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", inline: parseInlineMarkdown(paragraph.join("\n")) });
    paragraph = [];
  };
  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({
      kind: "list",
      ordered: listOrdered,
      items: listItems.map((item) => parseInlineMarkdown(item)),
    });
    listItems = [];
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const unordered = UNORDERED_ITEM.exec(line);
    const ordered = ORDERED_ITEM.exec(line);

    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      // A change of list kind starts a new list rather than mixing markers.
      if (listItems.length > 0 && isOrdered !== listOrdered) {
        flushList();
      }
      flushParagraph();
      listOrdered = isOrdered;
      listItems.push((ordered ?? unordered)![1]!);
      continue;
    }

    flushList();
    if (line === "") {
      flushParagraph();
      continue;
    }
    paragraph.push(rawLine);
  }

  flushList();
  flushParagraph();
  return blocks;
}
