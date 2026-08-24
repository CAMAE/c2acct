#!/usr/bin/env node
// PAT eval harness. Runs every golden set and writes the scoreboard artifact.
//
//   pnpm eval              run everything, write artifacts/eval/scoreboard.{json,md}
//   pnpm eval --json-only  skip the markdown render
//
// Exit code is 1 when any judged item fails or errors, so CI goes red on a
// regression. Skips never fail the run — an unindexed corpus is a missing
// fixture, not a regression — but they are reported prominently and excluded
// from the pass rate.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDeterministic } from "@/evals/runners/deterministic";
import { runRetrieval } from "@/evals/runners/retrieval";
import { buildScoreboard, renderMarkdown } from "@/evals/report";
import prisma from "@/lib/prisma";
import { loadEnv } from "../_shared/prismaScript";
import type { ItemResult } from "@/evals/schema";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GOLDEN_DIR = path.join(REPO_ROOT, "evals", "golden");
const OUT_DIR = path.join(REPO_ROOT, "artifacts", "eval");

async function main() {
  const jsonOnly = process.argv.includes("--json-only");
  // CI passes --strict-deterministic: the exact-assert suites must be fully
  // judged. Without it, flipping an item to judge:"llm" would turn a failing
  // assertion into a silent skip and the board would stay green.
  const strictDeterministic = process.argv.includes("--strict-deterministic");

  // The retrieval suite needs DATABASE_URL. Loading it here (rather than
  // requiring the caller to export it) is what lets `pnpm eval` behave the same
  // locally and in CI; when it is genuinely absent the retrieval suite reports
  // itself skipped rather than failing the run.
  loadEnv();

  const deterministic = await runDeterministic(path.join(GOLDEN_DIR, "deterministic.v1.json"));
  const retrieval = await runRetrieval(path.join(GOLDEN_DIR, "retrieval.v1.json"));

  const results: ItemResult[] = [...deterministic.results, ...retrieval.results];
  const board = buildScoreboard({
    results,
    goldenVersions: {
      "deterministic.v1.json": deterministic.version,
      "retrieval.v1.json": retrieval.version,
    },
    notes: [...deterministic.notes, ...retrieval.notes],
    retrieval: retrieval.aggregate,
    // Stamped once so the JSON and markdown artifacts agree.
    generatedAt: new Date().toISOString(),
  });

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "scoreboard.json"), `${JSON.stringify(board, null, 2)}\n`, "utf8");
  if (!jsonOnly) {
    await fs.writeFile(path.join(OUT_DIR, "scoreboard.md"), renderMarkdown(board), "utf8");
  }

  const { passed, failed, skipped, errored, total } = board.totals;
  console.log(
    `[eval] ${passed}/${total - skipped} judged passing` +
      (skipped ? `, ${skipped} skipped` : "") +
      (failed ? `, ${failed} FAILED` : "") +
      (errored ? `, ${errored} ERRORED` : "")
  );
  for (const note of board.notes) console.log(`[eval] note: ${note}`);
  for (const problem of results.filter((r) => r.status === "fail" || r.status === "error")) {
    console.error(`[eval] ${problem.status.toUpperCase()} ${problem.id}: ${problem.detail ?? ""}`);
  }
  console.log(`[eval] scoreboard → ${path.relative(REPO_ROOT, OUT_DIR)}/scoreboard.json${jsonOnly ? "" : " + .md"}`);

  if (failed > 0 || errored > 0) {
    process.exitCode = 1;
  }

  if (strictDeterministic) {
    const dodged = results.filter((result) => result.suite !== "retrieval" && result.status === "skip");
    if (dodged.length > 0) {
      console.error(
        `[eval] --strict-deterministic: ${dodged.length} exact-assert item(s) were skipped rather than judged: ${dodged
          .map((result) => result.id)
          .join(", ")}`
      );
      process.exitCode = 1;
    }
  }

  // The retrieval suite opens a Prisma connection; without this the pool keeps
  // the event loop alive and the process never exits — which in CI is an
  // indefinite hang rather than a visible failure.
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[eval] fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
