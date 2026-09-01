/**
 * Profile the consultant ecosystem route's data layer (BOX 4).
 *
 * Measures BEFORE changing anything, because the recorded symptom is "the route
 * takes ~9.6s at 47-firm demo density" and a symptom is not a hot spot. This
 * instruments the actual call the page makes — getEcosystemDetailForConsultant —
 * and reports where the time goes, so the fix targets a measured cause rather
 * than the first plausible one.
 *
 *   node --import tsx scripts/perf/profile-ecosystem-route.ts [--runs 3]
 *
 * Reports per run: wall time, total queries, and the query patterns ranked by
 * cumulative duration and by count. A pattern issued once per firm is the
 * signature of an N+1, and the count column is what makes it visible.
 */
import prisma from "@/lib/prisma";
import { applyRepoEnv } from "@/lib/env/repoEnv";

applyRepoEnv();

const runs = Number(process.argv[process.argv.indexOf("--runs") + 1]) || 3;

type OpStat = { count: number; totalMs: number };

async function main() {
  const stats = new Map<string, OpStat>();
  let collecting = false;

  // Middleware on the APP SINGLETON, not a client of our own. The first version
  // of this profiler built its own PrismaClient with query logging and reported
  // "queries 0" — because lib/ecosystem.ts imports @/lib/prisma, so the
  // instrumented client was never the one doing the work. Instrumenting the
  // wrong object reports a confident zero, which is worse than no number.
  prisma.$use(async (params, next) => {
    if (!collecting) return next(params);
    const started = performance.now();
    const result = await next(params);
    const elapsed = performance.now() - started;
    const key = `${params.model ?? "raw"}.${params.action}`;
    const existing = stats.get(key) ?? { count: 0, totalMs: 0 };
    existing.count += 1;
    existing.totalMs += elapsed;
    stats.set(key, existing);
    return result;
  });

  // Profile the ecosystem with the most FIRMS.
  //
  // Two earlier versions of this got the target wrong. The first ordered by id
  // and hit a single-assignment ecosystem; the second ranked by
  // ConsultantAssignment, which links a CONSULTANT to an ecosystem and is
  // therefore ~1 everywhere — it measured a 5-firm ecosystem at 88-243ms and
  // would have "disproved" a symptom reported at 47-firm density. Firms attach
  // through EcosystemFirm, so that is what density means here.
  const grouped = await prisma.ecosystemFirm.groupBy({
    by: ["ecosystemId"],
    _count: { _all: true },
  });
  const densest = grouped.sort((a, b) => b._count._all - a._count._all)[0];
  if (!densest) {
    console.error("No active consultant assignments found — seed the demo data first.");
    process.exit(1);
  }
  const assignment = await prisma.consultantAssignment.findFirst({
    where: { ecosystemId: densest.ecosystemId, active: true },
    select: { consultantProfileId: true, ecosystemId: true },
  });
  if (!assignment) {
    console.error(
      `Densest ecosystem ${densest.ecosystemId} (${densest._count._all} firms) has no active consultant assignment.`
    );
    process.exit(1);
  }

  const { getEcosystemDetailForConsultant } = await import("@/lib/ecosystem");

  console.log(
    `profiling ecosystem=${assignment.ecosystemId} (firms: ${densest._count._all}), runs=${runs}`
  );
  console.log(
    `firm-density ranking: ${grouped
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 5)
      .map((row) => `${row.ecosystemId}=${row._count._all}`)
      .join(", ")}\n`
  );

  const wallTimes: number[] = [];
  let lastFirmCount: number | string = "n/a";
  for (let run = 0; run < runs; run += 1) {
    stats.clear();
    collecting = true;
    const started = performance.now();
    const detail = await getEcosystemDetailForConsultant(
      assignment.consultantProfileId,
      assignment.ecosystemId
    );
    const elapsed = performance.now() - started;
    collecting = false;
    wallTimes.push(elapsed);
    lastFirmCount = detail?.firmCount ?? "n/a";

    const totalQueries = [...stats.values()].reduce((sum, stat) => sum + stat.count, 0);
    const totalQueryMs = [...stats.values()].reduce((sum, stat) => sum + stat.totalMs, 0);
    console.log(
      `run ${run + 1}: wall ${elapsed.toFixed(0)}ms | prisma ops ${totalQueries} | in-prisma ${totalQueryMs.toFixed(0)}ms | firms ${lastFirmCount}`
    );
  }

  const sorted = [...wallTimes].sort((a, b) => a - b);
  console.log(
    `\nwall: min ${sorted[0].toFixed(0)}ms  median ${sorted[Math.floor(sorted.length / 2)].toFixed(0)}ms  max ${sorted[sorted.length - 1].toFixed(0)}ms`
  );

  const totalQueryMs = [...stats.values()].reduce((sum, stat) => sum + stat.totalMs, 0);
  const totalOps = [...stats.values()].reduce((sum, stat) => sum + stat.count, 0);
  console.log(`\nlast run: ${totalOps} prisma operations.`);
  // CUMULATIVE MS IS NOT ADDITIVE and is reported as a shape, not a budget.
  // Much of this work runs inside Promise.all, so per-operation timings overlap
  // and their sum routinely exceeds wall time (an earlier version printed
  // "1118% of wall" and would have been nonsense to reason from). Counts are
  // exact; the ms column ranks contention, it does not partition wall time.
  console.log(
    `cumulative in-prisma ${totalQueryMs.toFixed(0)}ms across overlapping operations ` +
      `— NOT additive against a ${sorted[sorted.length - 1].toFixed(0)}ms wall; use counts for N+1, ms for ranking.`
  );

  console.log("\n=== PRISMA OPERATIONS BY CUMULATIVE TIME (last run) ===");
  for (const [key, stat] of [...stats.entries()].sort((a, b) => b[1].totalMs - a[1].totalMs).slice(0, 15)) {
    console.log(
      `${stat.totalMs.toFixed(0).padStart(7)}ms  x${String(stat.count).padStart(4)}  ${(stat.totalMs / stat.count).toFixed(1).padStart(7)}ms avg  ${key}`
    );
  }

  console.log("\n=== BY COUNT (N+1 signature: count scaling with firms) ===");
  for (const [key, stat] of [...stats.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 15)) {
    console.log(`x${String(stat.count).padStart(4)}  ${stat.totalMs.toFixed(0).padStart(7)}ms  ${key}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
