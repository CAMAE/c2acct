/**
 * Row census: how many rows, and how many bytes of `answers` JSON, each query
 * shape returns to the ecosystem route in one request.
 *
 *   node --import tsx scripts/perf/row-census.ts
 *
 * Why this exists: after the query COUNT had been cut 80%, the route was still
 * CPU-bound, and the CPU profile put half the time in Prisma result decoding and
 * GC. Those scale with rows, not queries. This census found one shape returning
 * 165,205 rows / 413 MB of answers JSON per request across 95 calls with only 2
 * distinct argument sets — the same 1,739 rows decoded 94 times. Query counts
 * find N+1s; this finds N x (same result).
 *
 * `distinctArgs` is the tell: many calls with few distinct argument sets are
 * repeated work, and the fix is to compute once and pass down.
 */
import { createHash } from "node:crypto";

import prisma from "@/lib/prisma";
import { applyRepoEnv } from "@/lib/env/repoEnv";

import { resolvePerfScaleTarget } from "./_perfScaleTarget";

applyRepoEnv();

type Census = { calls: number; rows: number; answerBytes: number; distinctArgs: Set<string> };

async function main() {
  const census = new Map<string, Census>();
  let collecting = false;

  prisma.$use(async (params, next) => {
    const result: unknown = await next(params);
    if (!collecting) return result;
    const where = (params.args?.where ?? {}) as Record<string, unknown>;
    const key = `${params.model ?? "raw"}.${params.action} where{${Object.keys(where).sort().join(",")}}${
      params.args?.include ? " +include" : ""
    }`;
    const entry = census.get(key) ?? { calls: 0, rows: 0, answerBytes: 0, distinctArgs: new Set() };
    entry.calls += 1;
    entry.distinctArgs.add(createHash("sha1").update(JSON.stringify(params.args ?? null)).digest("hex"));
    const rows = Array.isArray(result) ? result : result ? [result] : [];
    entry.rows += rows.length;
    for (const row of rows) {
      if (row && typeof row === "object" && "answers" in row) {
        entry.answerBytes += JSON.stringify((row as { answers: unknown }).answers ?? null).length;
      }
    }
    census.set(key, entry);
    return result;
  });

  const target = await resolvePerfScaleTarget(prisma);
  const { getEcosystemDetailForConsultant } = await import("@/lib/ecosystem");
  await getEcosystemDetailForConsultant(target.consultantProfileId, target.ecosystemId); // warm

  collecting = true;
  await getEcosystemDetailForConsultant(target.consultantProfileId, target.ecosystemId);
  collecting = false;

  let totalRows = 0;
  let totalBytes = 0;
  for (const entry of census.values()) {
    totalRows += entry.rows;
    totalBytes += entry.answerBytes;
  }
  console.log(`top-level rows returned ${totalRows}; answers JSON ${(totalBytes / 1e6).toFixed(1)} MB`);
  console.log("calls    rows  answersMB  distinctArgs  shape");
  for (const [key, entry] of [...census.entries()].sort((a, b) => b[1].rows - a[1].rows).slice(0, 15)) {
    console.log(
      `${String(entry.calls).padStart(5)} ${String(entry.rows).padStart(7)} ${(entry.answerBytes / 1e6)
        .toFixed(1)
        .padStart(10)} ${String(entry.distinctArgs.size).padStart(12)}  ${key}`
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
