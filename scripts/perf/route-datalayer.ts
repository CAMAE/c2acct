#!/usr/bin/env node
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { PERF_SCALE_ECOSYSTEM_PREFIX } from "@/lib/demo-seed/perfScale";

/** Ecosystem-route data layer only — the figure the >20% decision rule judges. */
const WARMUP = 3;
const SAMPLES = 17;

function percentile(sorted: number[], q: number): number {
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[rank]!;
}
const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(3)}s` : `${ms.toFixed(1)}ms`);

async function main() {
  applyRepoEnv();
  const label = process.argv.find((a) => a.startsWith("--label="))?.split("=")[1] ?? "run";
  const prisma = (await import("@/lib/prisma")).default;
  const { getEcosystemDetailForConsultant } = await import("@/lib/ecosystem");

  const eco = await prisma.ecosystem.findFirst({
    where: { id: { startsWith: PERF_SCALE_ECOSYSTEM_PREFIX } },
    select: { id: true, consultantProfileId: true },
  });
  if (!eco?.consultantProfileId) throw new Error("perf-scale ecosystem not found.");

  const hit = () => getEcosystemDetailForConsultant(eco.consultantProfileId!, eco.id);
  for (let i = 0; i < WARMUP; i += 1) await hit();
  const samples: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const t = performance.now();
    await hit();
    samples.push(performance.now() - t);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const stat = {
    label,
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  };
  console.log(
    `ROUTE[${label}]  p10 ${fmt(stat.p10)}  p50 ${fmt(stat.p50)}  p90 ${fmt(stat.p90)}  (min ${fmt(stat.min)} / max ${fmt(stat.max)})`
  );
  console.log("JSON:" + JSON.stringify(stat));
  await prisma.$disconnect();
}
main().catch((e) => { console.error("route-datalayer failed:", e); process.exit(1); });
