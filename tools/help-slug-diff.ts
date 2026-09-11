/**
 * Help corpus slug diff (box 1b item 6, register E4): the slugs the help panels and "Read" links
 * point at, versus the /help/<slug> files served flag-on, versus the corpus the deploy-night
 * reseed writes (help_doc rows). A link whose target is missing after reseed is P1.
 *   DATABASE_URL=<branch direct url> node --import tsx tools/help-slug-diff.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import prisma from "@/lib/prisma";
import { allHelpArticles } from "@/scripts/index-help";
async function main() {
// Slugs the help panels link to (lib/helpArticleLinks.ts HELP_ARTICLE_BY_CARD), read from source so the
  // tool does not depend on the module's export shape.
  const linkSource = readFileSync(path.join(process.cwd(), "lib", "helpArticleLinks.ts"), "utf8");
  const linked = new Set([...linkSource.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]));
  const publicFiles = new Set(readdirSync(path.join(process.cwd(), "help", "public")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")));
  const corpus = allHelpArticles();
  const corpusPaths = new Set(corpus.map((a) => a.path));
  const corpusPublicSlugs = new Set(corpus.map((a) => a.path).filter((p) => p.startsWith("help/public/")).map((p) => p.replace(/^help\/public\//, "").replace(/\.md$/, "")));
  const rows = await prisma.$queryRawUnsafe<Array<{ path: string }>>(`select distinct path from "KnowledgeSource" where kind = 'help_doc' order by 1`).catch(() => [] as Array<{ path: string }>);
  const dbPaths = new Set(rows.map((r) => r.path));
  console.log(`# Help slug diff · ${new Date().toISOString()}\n`);
  console.log(`linked slugs (HELP_ARTICLE_BY_CARD): ${linked.size}; help/public files: ${publicFiles.size}; corpus articles the reseed writes: ${corpus.length} (public: ${corpusPublicSlugs.size}); KnowledgeSource help_doc rows on the target DB: ${dbPaths.size}\n`);
  const missingFile = [...linked].filter((s) => !publicFiles.has(s));
  const missingCorpus = [...linked].filter((s) => !corpusPublicSlugs.has(s));
  const missingDb = [...linked].filter((s) => dbPaths.size > 0 && !dbPaths.has(`help/public/${s}.md`));
  console.log(`## Linked slugs with no help/public file (the /help/<slug> page would 404): ${missingFile.length}${missingFile.length ? "\n- " + missingFile.join("\n- ") : ""}\n`);
  console.log(`## Linked slugs not in the reseed corpus: ${missingCorpus.length}${missingCorpus.length ? "\n- " + missingCorpus.join("\n- ") : ""}\n`);
  console.log(`## Linked slugs with no help_doc KnowledgeSource row on the target DB (Ask Pat cannot cite them): ${missingDb.length}${missingDb.length ? "\n- " + missingDb.join("\n- ") : ""}\n`);
  console.log(`## Corpus paths not present as KnowledgeSource help_doc rows on the target DB: ${[...corpusPaths].filter((p) => dbPaths.size > 0 && !dbPaths.has(p)).length}`);
  console.log(`## help_doc KnowledgeSource rows not in the corpus (stale after reseed): ${[...dbPaths].filter((p) => !corpusPaths.has(p)).length}${[...dbPaths].filter((p) => !corpusPaths.has(p)).slice(0, 10).map((p) => "\n- " + p).join("")}`);
  await prisma.$disconnect();
  
}
main().catch((e) => { console.error(e); process.exit(1); });
