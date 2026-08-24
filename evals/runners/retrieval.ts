import { promises as fs } from "node:fs";
import prisma from "@/lib/prisma";
import { retrieve, type RetrievableKind } from "@/lib/agents/internal-knowledge/retrieve";
import type { GoldenFile, ItemResult, RetrievalItem, Scoreboard } from "../schema";

/**
 * Retrieval runner. Calls the REAL retrieve() through its mandatory kind +
 * roleAccess walls (S6) — the eval exercises the shipped, walled entry point,
 * not a bypass that would grade a path production never takes.
 *
 * Pass criterion is recall-shaped and wall-shaped:
 *   - every `mustRetrieve` ref appears in the top-k, AND
 *   - no `mustNotRetrieve` ref appears at any rank.
 * Precision is REPORTED but does not gate. A query that returns the right
 * answer plus three other plausibly-relevant help docs is doing its job; failing
 * it for that would train the corpus toward brittle single-hit queries.
 *
 * When the corpus is not indexed, items are SKIPPED with a loud note rather
 * than failed — an empty database is a missing fixture, not a regression.
 */

/** "<sourcePath>#<chunkIdx>" — stable across re-index; cuids are not. */
function refOf(chunk: { sourcePath: string; chunkIdx: number }): string {
  return `${chunk.sourcePath}#${chunk.chunkIdx}`;
}

export async function runRetrieval(file: string): Promise<{
  results: ItemResult[];
  version: string;
  notes: string[];
  aggregate?: Scoreboard["retrieval"];
}> {
  const golden = JSON.parse(await fs.readFile(file, "utf8")) as GoldenFile<RetrievalItem>;
  const results: ItemResult[] = [];
  const notes: string[] = [];

  let corpusChunks = 0;
  let corpusError: string | null = null;
  try {
    corpusChunks = await prisma.knowledgeChunk.count();
  } catch (error) {
    corpusError = error instanceof Error ? error.message : String(error);
  }

  const corpusReady = corpusError === null && corpusChunks > 0;
  if (!corpusReady) {
    notes.push(
      corpusError
        ? `Retrieval suite skipped — the knowledge corpus is unreachable (${corpusError.split("\n")[0] || "no DATABASE_URL / database not running"}). Run \`pnpm db:up\` and \`pnpm agent:index-knowledge\`.`
        : "Retrieval suite skipped — the knowledge corpus is empty. Run `pnpm agent:index-knowledge` to populate it."
    );
  } else {
    notes.push(`Retrieval ran against ${corpusChunks} indexed chunk(s).`);
  }

  const precisions: number[] = [];
  const recalls: number[] = [];
  const topOneHits: boolean[] = [];
  const kValues = new Set<number>();

  for (const item of golden.items) {
    const startedAt = performance.now();
    const base = { id: item.id, suite: "retrieval" as const, judge: item.judge, question: item.question };

    if (!corpusReady) {
      results.push({ ...base, status: "skip", detail: "knowledge corpus unavailable", durationMs: performance.now() - startedAt });
      continue;
    }
    if (item.judge !== "exact") {
      results.push({ ...base, status: "skip", detail: `judge "${item.judge}" is not configured`, durationMs: performance.now() - startedAt });
      continue;
    }

    try {
      const chunks = await retrieve(item.query, item.k, {
        kinds: item.kinds as RetrievableKind[],
        roleAccess: item.roleAccess,
      });
      const retrieved = chunks.map(refOf);
      const hits = item.mustRetrieve.filter((ref) => retrieved.includes(ref));
      const leaks = (item.mustNotRetrieve ?? []).filter((ref) => retrieved.includes(ref));

      const recall = item.mustRetrieve.length === 0 ? null : hits.length / item.mustRetrieve.length;
      const precision = retrieved.length === 0 ? null : hits.length / retrieved.length;
      // Top-1 is the number that actually answers "did it find the right doc?".
      const topOneHit =
        item.mustRetrieve.length === 0 ? null : retrieved.length > 0 && item.mustRetrieve.includes(retrieved[0]);
      if (recall !== null) recalls.push(recall);
      if (precision !== null && item.mustRetrieve.length > 0) precisions.push(precision);
      if (topOneHit !== null) {
        topOneHits.push(topOneHit);
        kValues.add(item.k);
      }

      const missing = item.mustRetrieve.filter((ref) => !retrieved.includes(ref));
      const ok = missing.length === 0 && leaks.length === 0;
      const detail = ok
        ? undefined
        : [
            missing.length > 0 ? `missing: ${missing.join(", ")}` : null,
            leaks.length > 0 ? `WALL BREACH — leaked: ${leaks.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join("; ");

      results.push({
        ...base,
        status: ok ? "pass" : "fail",
        detail,
        expected: ok ? undefined : { mustRetrieve: item.mustRetrieve, mustNotRetrieve: item.mustNotRetrieve ?? [] },
        actual: ok ? undefined : retrieved,
        precision: precision ?? undefined,
        recall: recall ?? undefined,
        topOneHit: topOneHit ?? undefined,
        durationMs: performance.now() - startedAt,
      });
    } catch (error) {
      results.push({
        ...base,
        status: "error",
        detail: error instanceof Error ? error.message : String(error),
        durationMs: performance.now() - startedAt,
      });
    }
  }

  const aggregate =
    recalls.length > 0
      ? {
          topOneAccuracy: topOneHits.filter(Boolean).length / topOneHits.length,
          macroRecall: recalls.reduce((a, b) => a + b, 0) / recalls.length,
          macroPrecisionAtK: precisions.length ? precisions.reduce((a, b) => a + b, 0) / precisions.length : 0,
          k: kValues.size === 1 ? [...kValues][0] : 0,
          itemsScored: recalls.length,
        }
      : undefined;

  return { results, version: golden.version, notes, aggregate };
}
