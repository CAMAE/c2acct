import fs from "node:fs";
import path from "node:path";
import { DEFAULT_VERTICAL_ID, GLOBAL_VERTICAL_ID } from "@/lib/verticals/context";
import { PUBLIC_AUDIENCE } from "@/lib/patAssistant/audienceTokens";
import { DEPTH_TIERS, type CorpusDepthTier } from "@/lib/patAssistant/corpusAccess";

/**
 * File-backed corpus articles (corpus program, B1).
 *
 * The B1 shelf is 30 articles of ~3,000 words each. That does not belong inline
 * in a TypeScript array like the original HELP_ARTICLES — the text is authored
 * and reviewed as prose, so it lives as prose, at the same path it is cited by.
 *
 * ## Tags come from FRONTMATTER, never from the path
 *
 * `help/glossary/` currently holds signed-in articles and `help/public/` holds
 * public ones, and it would be easy to infer audience from the directory. That
 * inference must not exist: the next batch of glossary entries lands in the same
 * directory with the same signed-in audience, and the moment a public-safe
 * glossary twin is authored beside them the directory would be lying. Path is
 * the citation identity and the shelf; audience is a property of the article.
 *
 * The loader therefore REQUIRES every tag in frontmatter and refuses a file that
 * omits one, rather than defaulting. A default here would silently publish an
 * article at the wrong audience, which is the failure this whole layer exists to
 * prevent.
 */

export const CORPUS_ROOT = "help";

/** Frontmatter audience values, and what each maps to in roleAccess terms. */
export const AUDIENCE_PUBLIC = "public";
export const AUDIENCE_ALL_SIGNED_IN = "all-signed-in";

export type CorpusArticleFile = {
  /** Frontmatter id (P01, G07, ...). Stable across renames of title or slug. */
  id: string;
  title: string;
  /** Citation identity AND the on-disk path, deliberately the same string. */
  path: string;
  /**
   * Audiences allowed to retrieve. `[]` means every authenticated audience
   * (the existing global-signed-in representation); `["public"]` is the
   * unauthenticated public shelf.
   */
  roleAccess: string[];
  depthTier: CorpusDepthTier;
  verticalId: string;
  body: string;
};

export class CorpusFrontmatterError extends Error {
  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = "CorpusFrontmatterError";
  }
}

type Frontmatter = Record<string, string>;

/** Split `---\n...\n---\n<body>`. Throws when the block is absent. */
export function parseFrontmatter(file: string, raw: string): { frontmatter: Frontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new CorpusFrontmatterError(file, "missing a leading --- frontmatter block");
  }
  const frontmatter: Frontmatter = {};
  for (const line of match[1]!.split("\n")) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    frontmatter[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { frontmatter, body: match[2]! };
}

function requireTag(file: string, frontmatter: Frontmatter, key: string): string {
  const value = frontmatter[key];
  if (!value) {
    throw new CorpusFrontmatterError(file, `frontmatter is missing "${key}"`);
  }
  return value;
}

/** Map a frontmatter `audience` to roleAccess. Unknown values are refused. */
export function roleAccessForAudience(file: string, audience: string): string[] {
  if (audience === AUDIENCE_PUBLIC) return [PUBLIC_AUDIENCE];
  if (audience === AUDIENCE_ALL_SIGNED_IN) return [];
  throw new CorpusFrontmatterError(
    file,
    `unknown audience "${audience}" (expected "${AUDIENCE_PUBLIC}" or "${AUDIENCE_ALL_SIGNED_IN}")`
  );
}

/** Map a frontmatter `vertical`. "global" is the vertical-neutral sentinel. */
export function verticalForTag(file: string, vertical: string): string {
  if (vertical === "global") return GLOBAL_VERTICAL_ID;
  if (vertical === DEFAULT_VERTICAL_ID) return DEFAULT_VERTICAL_ID;
  throw new CorpusFrontmatterError(
    file,
    `unknown vertical "${vertical}" (expected "global" or "${DEFAULT_VERTICAL_ID}")`
  );
}

export function depthForTag(file: string, depth: string): CorpusDepthTier {
  if ((DEPTH_TIERS as readonly string[]).includes(depth)) {
    return depth as CorpusDepthTier;
  }
  throw new CorpusFrontmatterError(file, `unknown depth "${depth}" (expected ${DEPTH_TIERS.join(" or ")})`);
}

/** One article from its file contents. Pure, so the mapping is testable. */
export function toCorpusArticle(relativePath: string, raw: string): CorpusArticleFile {
  const { frontmatter, body } = parseFrontmatter(relativePath, raw);
  const trimmed = body.trim();
  if (!trimmed) {
    throw new CorpusFrontmatterError(relativePath, "has frontmatter but no body");
  }
  return {
    id: requireTag(relativePath, frontmatter, "id"),
    title: requireTag(relativePath, frontmatter, "title"),
    path: relativePath,
    roleAccess: roleAccessForAudience(relativePath, requireTag(relativePath, frontmatter, "audience")),
    depthTier: depthForTag(relativePath, requireTag(relativePath, frontmatter, "depth")),
    verticalId: verticalForTag(relativePath, requireTag(relativePath, frontmatter, "vertical")),
    body: trimmed,
  };
}

/** Every `help/**\/*.md` article, sorted by path for deterministic imports. */
export function loadCorpusArticleFiles(root = process.cwd()): CorpusArticleFile[] {
  const base = path.join(root, CORPUS_ROOT);
  if (!fs.existsSync(base)) return [];

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) files.push(full);
    }
  };
  walk(base);

  return files.map((full) =>
    toCorpusArticle(path.relative(root, full).split(path.sep).join("/"), fs.readFileSync(full, "utf8"))
  );
}
