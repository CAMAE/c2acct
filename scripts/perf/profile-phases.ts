/**
 * Is the ecosystem route waiting on the database, or is it burning CPU?
 *
 *   node --import tsx scripts/perf/profile-phases.ts
 *
 * Reports, for the whole route and then for each branch run ON ITS OWN:
 *   wall            elapsed
 *   cpu             process CPU over the same interval, as % of wall — near or
 *                   above 100% means the main thread is saturated and fewer
 *                   queries will not help; look at rows and at the CPU profile
 *   sql stmts       SQL statements the engine executed (a Prisma `include` is
 *                   several statements behind one operation)
 *   sql engine-ms   the engine's own per-statement durations, summed — NOT a
 *                   partition of wall: statements overlap under Promise.all and
 *                   this includes pool queue time, so it ranks contention only
 *   loop-delay      event-loop stall percentiles; large stalls are synchronous
 *                   JS (decode, build), not I/O
 *
 * The SQL counters need a query-logging client, which the app singleton is not.
 * lib/prisma.ts reuses globalThis.__prisma when set, so this installs a logging
 * client there BEFORE importing anything from lib/. An earlier profiler built a
 * second client of its own and reported a confident "queries 0".
 */
import { monitorEventLoopDelay } from "node:perf_hooks";

import { PrismaClient } from "@prisma/client";

import { applyRepoEnv } from "@/lib/env/repoEnv";

import { resolvePerfScaleTarget } from "./_perfScaleTarget";

applyRepoEnv();

const logging = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
globalThis.__prisma = logging;
let sqlCount = 0;
let sqlMs = 0;
logging.$on("query", (event) => {
  sqlCount += 1;
  sqlMs += event.duration;
});

const ms = (value: number) => `${value.toFixed(0)}ms`;

async function timed<T>(label: string, run: () => Promise<T>): Promise<T> {
  sqlCount = 0;
  sqlMs = 0;
  const cpuStart = process.cpuUsage();
  const started = performance.now();
  const loop = monitorEventLoopDelay({ resolution: 5 });
  loop.enable();
  const result = await run();
  loop.disable();
  const wall = performance.now() - started;
  const cpu = process.cpuUsage(cpuStart);
  const cpuMs = (cpu.user + cpu.system) / 1000;
  console.log(
    `${label.padEnd(36)} wall ${ms(wall).padStart(8)}  cpu ${ms(cpuMs).padStart(8)} (${((100 * cpuMs) / wall).toFixed(0)}% of wall)` +
      `  sql stmts ${String(sqlCount).padStart(6)}  sql engine-ms ${ms(sqlMs).padStart(8)}` +
      `  loop-delay p99 ${(loop.percentile(99) / 1e6).toFixed(0)}ms max ${(loop.max / 1e6).toFixed(0)}ms`
  );
  return result;
}

async function main() {
  const prisma = (await import("@/lib/prisma")).default;
  if (prisma !== logging) throw new Error("lib/prisma did not adopt the logging client");
  const target = await resolvePerfScaleTarget(prisma);
  const { getEcosystemDetailForConsultant } = await import("@/lib/ecosystem");
  const briefing = await import("@/lib/adminBriefingEngine");
  const { getVendorScopedFirms } = await import("@/lib/tenancy");
  const { getVendorProductInsightCatalog } = await import("@/lib/vendorProductInsightEngine");
  const { getFirmAssessmentProgress, getFirmProductCatalog } = await import("@/lib/firmPat");

  const route = () => getEcosystemDetailForConsultant(target.consultantProfileId, target.ecosystemId);
  await route(); // warm

  console.log("=== FULL ROUTE");
  await timed("route", route);
  await timed("route (again)", route);

  const firmIds = await getVendorScopedFirms(target.vendorCompanyId);
  console.log(`\n=== BRANCHES, ONE AT A TIME (firms=${firmIds.length})`);
  await timed("buildAdminBriefingContext", () => briefing.buildAdminBriefingContext(target.vendorCompanyId));
  await timed("getAdminBriefingCatalog (no ctx)", () => briefing.getAdminBriefingCatalog({ companyIds: firmIds }));
  await timed("getAdminCompanyBriefing x firms (no ctx)", () =>
    Promise.all(firmIds.map((firmId) => briefing.getAdminCompanyBriefing(firmId)))
  );
  await timed("getAdminCompanyBriefing x1 (no ctx)", () => briefing.getAdminCompanyBriefing(firmIds[0]!));
  await timed("getVendorProductInsightCatalog", () => getVendorProductInsightCatalog(target.vendorCompanyId));
  await timed("getFirmAssessmentProgress x firms", () =>
    Promise.all(firmIds.map((firmId) => getFirmAssessmentProgress(firmId)))
  );
  await timed("getFirmProductCatalog x firms", () =>
    Promise.all(firmIds.map((firmId) => getFirmProductCatalog(firmId)))
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
