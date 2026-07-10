import { applyRepoEnv } from "@/lib/env/repoEnv";
import { HELP_ARTICLES, indexHelpDocs, planHelpDocs } from "@/scripts/index-help";

/**
 * Seed the customer-facing Pat help_doc corpus to a target (prod) database.
 * DRY-RUN BY DEFAULT.
 *
 *   Dry run (default):  pnpm dotenv -e .env.prod -- node --import tsx scripts/seed-help-prod.ts
 *   Apply:              ... scripts/seed-help-prod.ts --apply
 *
 * Dry run reads only — it prints which of the ~36 articles would be (re)indexed
 * vs. left unchanged (idempotent by contentHash), and writes nothing. --apply runs
 * the same idempotent upsert the local `pnpm index:help` uses. The corpus is the
 * source of truth: Ask Pat answers only from these help_doc rows (lexical FTS), so
 * this is how new help content reaches production between deploys.
 */

async function main() {
  applyRepoEnv();
  const apply = process.argv.includes("--apply");
  const { default: prisma } = await import("@/lib/prisma");

  const target = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
      return "(unknown)";
    }
  })();

  console.log(`\n=== Pat help corpus seed · ${HELP_ARTICLES.length} articles · target ${target} ===`);

  const plan = await planHelpDocs(prisma);
  console.log(`Would index/update: ${plan.toIndex.length}`);
  for (const path of plan.toIndex) console.log(`  + ${path}`);
  console.log(`Unchanged: ${plan.unchanged.length}`);

  if (!apply) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to index into ${target}.`);
    return;
  }

  const result = await indexHelpDocs(prisma);
  console.log(`\nAPPLIED — ${result.indexed} indexed, ${result.skipped} unchanged, ${result.total} total.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
