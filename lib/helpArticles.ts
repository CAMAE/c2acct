import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "@/lib/corpus/articleFiles";

/**
 * Depth box 6 (2026-09-09): the public help library (help/public/*.md) as
 * readable pages. Slug = file name without .md. Rendering is a small,
 * deliberate markdown subset (## headings, paragraphs, - lists, **bold**) —
 * no markdown dependency in the app.
 */
const PUBLIC_DIR = path.join(process.cwd(), "help", "public");

export type HelpArticle = { slug: string; title: string; words: number | null; body: string };

export function listHelpArticleSlugs(): string[] {
  return readdirSync(PUBLIC_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""))
    .sort();
}

export function readHelpArticle(slug: string): HelpArticle | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const file = path.join(PUBLIC_DIR, `${slug}.md`);
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const { frontmatter, body } = parseFrontmatter(`help/public/${slug}.md`, raw);
  const words = Number(frontmatter.words);
  return { slug, title: String(frontmatter.title ?? slug), words: Number.isFinite(words) ? words : null, body };
}

export type HelpBlock =
  | { kind: "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

/** Markdown subset → blocks. Inline **bold** is kept as text markers for the renderer. */
export function toHelpBlocks(body: string): HelpBlock[] {
  const blocks: HelpBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
    if (list) blocks.push({ kind: "ul", items: list });
    list = null;
  };
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flush();
      blocks.push({ kind: "h3", text: trimmed.slice(4) });
    } else if (trimmed.startsWith("## ")) {
      flush();
      blocks.push({ kind: "h2", text: trimmed.slice(3) });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (paragraph.length) {
        blocks.push({ kind: "p", text: paragraph.join(" ") });
        paragraph = [];
      }
      list = list ?? [];
      list.push(trimmed.slice(2));
    } else {
      if (list) {
        blocks.push({ kind: "ul", items: list });
        list = null;
      }
      paragraph.push(trimmed);
    }
  }
  flush();
  return blocks;
}

/** "**bold**" → segments. */
export function inlineSegments(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => (part.startsWith("**") && part.endsWith("**") ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }));
}
