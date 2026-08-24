#!/usr/bin/env node
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { PERF_SCALE_ECOSYSTEM_PREFIX } from "@/lib/demo-seed/perfScale";

/**
 * Per-firm aggregator profiler (AUDIT-WS9-001 follow-up, Mythos ruling 2b).
 *
 * Answers one question with numbers: at 47-firm charter scale, WHERE does the
 * consultant read path actually spend its time? The archive's guess was that
 * `getAdminCompanyBriefing` dominates and that Block A's target
 * (`getFirmAssessmentProgress`) does not — but nobody had measured it, at any
 * scale, per call.
 *
 * Harness discipline matches WS11-J so the numbers are comparable:
 *   - warm 3 (discarded), measure 17
 *   - report p10 / p50 / p90
 *
 * Two shapes are measured for every aggregator:
 *   - PER CALL      — one invocation for one firm. What a single firm costs.
 *   - PER RENDER    — the full N-wide fan-out the ecosystem page actually does
 *                     (`Promise.all(firmIds.map(fn))`). This is the number the
 *                     batching argument is about.
 *
 * Read-only. Measures shipped functions through their real entry points; no
 * optimization, no prototype, no writes.
 */

const WARMUP = 3;
const SAMPLES = 17;

type Sample = number;

interface Stat {
  label: string;
  n: number;
  min: number;
  p10: number;
  p50: number;
  p90: number;
  max: number;
  mean: number;
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  // Nearest-rank on the sorted sample; with n=17 this lands on a real
  // observation rather than an interpolation between two of them.
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[rank]!;
}

function summarize(label: string, samples: Sample[]): Stat {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    label,
    n: sorted.length,
    min: sorted[0] ?? 0,
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    max: sorted[sorted.length - 1] ?? 0,
    mean: sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1),
  };
}

async function measure(label: string, fn: (iteration: number) => Promise<unknown>): Promise<Stat> {
  for (let i = 0; i < WARMUP; i += 1) {
    await fn(i);
  }
  const samples: Sample[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const startedAt = performance.now();
    await fn(i);
    samples.push(performance.now() - startedAt);
  }
  const stat = summarize(label, samples);
  console.log(
    `  ${label.padEnd(52)} p10 ${fmt(stat.p10)}  p50 ${fmt(stat.p50)}  p90 ${fmt(stat.p90)}   (min ${fmt(stat.min)} / max ${fmt(stat.max)})`
  );
  return stat;
}

function fmt(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(3)}s` : `${ms.toFixed(1)}ms`;
}

async function main() {
  applyRepoEnv();
  const prisma = (await import("@/lib/prisma")).default;
  const { getAdminCompanyBriefing } = await import("@/lib/adminBriefingEngine");
  const { getFirmAssessmentProgress, getFirmProductCatalog } = await import("@/lib/firmPat");
  const { getEcosystemDetailForConsultant } = await import("@/lib/ecosystem");
  const { getFirmBriefForConsultant } = await import("@/lib/firmBriefs");

  // Default target is the perf-scale cohort; --ecosystem=<id> points the same
  // harness at any other ecosystem so scale behaviour can be compared directly
  // (e.g. the 15-firm demo ecosystem vs the 47-firm perf cohort).
  const ecosystemFlag = process.argv.find((arg) => arg.startsWith("--ecosystem="));
  const targetId = ecosystemFlag?.split("=")[1];
  const ecosystem = await prisma.ecosystem.findFirst({
    where: targetId ? { id: targetId } : { id: { startsWith: PERF_SCALE_ECOSYSTEM_PREFIX } },
    select: { id: true, name: true, consultantProfileId: true },
  });
  if (!ecosystem?.consultantProfileId) {
    throw new Error(
      targetId
        ? `ecosystem "${targetId}" not found, or it has no consultant profile.`
        : "perf-scale ecosystem not found. Run: node --import tsx scripts/seed/perf-scale.ts --apply"
    );
  }

  const firmRows = await prisma.ecosystemFirm.findMany({
    where: { ecosystemId: ecosystem.id },
    select: { firmCompanyId: true },
    orderBy: { firmCompanyId: "asc" },
  });
  const firmIds = firmRows.map((row) => row.firmCompanyId);

  console.log(`\n================ AGGREGATOR PROFILE @ ${firmIds.length}-FIRM SCALE ================`);
  console.log(`Ecosystem: ${ecosystem.name} (${ecosystem.id})`);
  console.log(`Discipline: warm ${WARMUP}, measure ${SAMPLES}, nearest-rank p10/p50/p90.\n`);

  const stats: Stat[] = [];

  // ---- PER CALL: one firm, one aggregator --------------------------------
  // Rotate the firm per iteration so no single row's cache state dominates.
  console.log("PER CALL (one firm):");
  stats.push(
    await measure("getAdminCompanyBriefing(firmId)", (i) =>
      getAdminCompanyBriefing(firmIds[i % firmIds.length]!)
    )
  );
  stats.push(
    await measure("getFirmAssessmentProgress(firmId)  [Block A target]", (i) =>
      getFirmAssessmentProgress(firmIds[i % firmIds.length]!)
    )
  );
  stats.push(
    await measure("getFirmProductCatalog(firmId)      [Block B target]", (i) =>
      getFirmProductCatalog(firmIds[i % firmIds.length]!)
    )
  );

  // ---- PER RENDER: the N-wide fan-out the page actually performs ---------
  console.log(`\nPER RENDER (${firmIds.length}-wide fan-out, the pattern the page executes):`);
  stats.push(
    await measure(`Promise.all(${firmIds.length}× getAdminCompanyBriefing)`, () =>
      Promise.all(firmIds.map((firmId) => getAdminCompanyBriefing(firmId)))
    )
  );
  stats.push(
    await measure(`Promise.all(${firmIds.length}× getFirmAssessmentProgress)`, () =>
      Promise.all(firmIds.map((firmId) => getFirmAssessmentProgress(firmId)))
    )
  );
  stats.push(
    await measure(`Promise.all(${firmIds.length}× getFirmProductCatalog)`, () =>
      Promise.all(firmIds.map((firmId) => getFirmProductCatalog(firmId)))
    )
  );

  // ---- WHOLE READ PATH: the two routes' data layers ----------------------
  console.log("\nWHOLE READ PATH (route data layer, tenancy gate included):");
  const ecoStat = await measure("getEcosystemDetailForConsultant  [/consultants/ecosystems/:id]", () =>
    getEcosystemDetailForConsultant(ecosystem.consultantProfileId!, ecosystem.id)
  );
  stats.push(ecoStat);
  const firmStat = await measure("getFirmBriefForConsultant        [.../firm/:firmId]", (i) =>
    getFirmBriefForConsultant(ecosystem.consultantProfileId!, ecosystem.id, firmIds[i % firmIds.length]!)
  );
  stats.push(firmStat);

  // ---- Attribution -------------------------------------------------------
  const briefingFanout = stats.find((s) => s.label.includes("getAdminCompanyBriefing)"))!;
  const progressFanout = stats.find((s) => s.label.includes("getFirmAssessmentProgress)"))!;
  const catalogFanout = stats.find((s) => s.label.includes("getFirmProductCatalog)"))!;

  console.log("\nATTRIBUTION (share of the ecosystem route's p50, by fan-out p50):");
  for (const [name, stat] of [
    ["getAdminCompanyBriefing", briefingFanout],
    ["getFirmAssessmentProgress  [Block A]", progressFanout],
    ["getFirmProductCatalog      [Block B]", catalogFanout],
  ] as const) {
    const share = ecoStat.p50 > 0 ? (stat.p50 / ecoStat.p50) * 100 : 0;
    console.log(`  ${name.padEnd(40)} ${fmt(stat.p50).padStart(9)}  ≈ ${share.toFixed(1)}% of route p50`);
  }
  console.log(`  ${"route total (p50)".padEnd(40)} ${fmt(ecoStat.p50).padStart(9)}`);

  console.log("\nJSON:");
  console.log(JSON.stringify({ firmCount: firmIds.length, warmup: WARMUP, samples: SAMPLES, stats }, null, 2));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("profile-aggregators failed:", error);
  process.exit(1);
});
