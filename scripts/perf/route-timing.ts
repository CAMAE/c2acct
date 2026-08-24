#!/usr/bin/env node
/**
 * Authenticated route timing against a PRODUCTION build (Mythos ruling 2b).
 *
 * Mirrors the WS11-J methodology so the numbers are comparable to the ones in
 * docs/audit/AUDIT-WS9-001_batch_per_firm_aggregators.md: production build,
 * standalone server, warm 3 / measure 17, nearest-rank p10/p50/p90.
 *
 * Measures server response time (request → full HTML body received), which is
 * the server-side share of click-to-paint. It does not include browser parse or
 * paint; those are constant across the comparison and would only add noise from
 * a headless browser.
 *
 * Read-only. Requires a server already running (see --base-url).
 *
 * Usage:
 *   node --import tsx scripts/perf/route-timing.ts --base-url=http://127.0.0.1:3002 \
 *     --email=review.consultant+perf-scale@perf-scale.pat.local --password=Pat-Perf-Scale-2026
 */
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { PERF_SCALE_ECOSYSTEM_PREFIX } from "@/lib/demo-seed/perfScale";

const WARMUP = 3;
const SAMPLES = 17;

function arg(name: string, fallback?: string): string {
  const found = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  const value = found?.split("=").slice(1).join("=");
  if (!value && fallback === undefined) throw new Error(`missing --${name}=`);
  return value ?? fallback!;
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[rank]!;
}

function fmt(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(3)}s` : `${ms.toFixed(1)}ms`;
}

/** Minimal cookie jar — NextAuth needs the session cookie carried across requests. */
class Jar {
  private readonly cookies = new Map<string, string>();
  absorb(response: Response): void {
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const eq = pair?.indexOf("=") ?? -1;
      if (pair && eq > 0) this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
  header(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

async function main() {
  applyRepoEnv();
  const baseUrl = arg("base-url", "http://127.0.0.1:3002").replace(/\/$/, "");
  const email = arg("email");
  const password = arg("password");

  const prisma = (await import("@/lib/prisma")).default;
  const ecosystem = await prisma.ecosystem.findFirst({
    where: { id: { startsWith: PERF_SCALE_ECOSYSTEM_PREFIX } },
    select: { id: true, name: true },
  });
  if (!ecosystem) throw new Error("perf-scale ecosystem not found — run the perf-scale seed first.");
  const firm = await prisma.ecosystemFirm.findFirst({
    where: { ecosystemId: ecosystem.id },
    select: { firmCompanyId: true },
    orderBy: { firmCompanyId: "asc" },
  });
  const firmCount = await prisma.ecosystemFirm.count({ where: { ecosystemId: ecosystem.id } });
  await prisma.$disconnect();

  // ---- authenticate ------------------------------------------------------
  const jar = new Jar();
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  jar.absorb(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header() },
    body: new URLSearchParams({ csrfToken, email, password, redirectTo: "/consultants" }),
  });
  jar.absorb(loginRes);

  const probe = await fetch(`${baseUrl}/consultants`, { headers: { cookie: jar.header() }, redirect: "manual" });
  if (probe.status !== 200) {
    throw new Error(
      `authentication failed — GET /consultants returned ${probe.status}. ` +
        "Check PAT_ENABLE_LOCAL_REVIEW_AUTH / PAT_ENABLE_CONSULTANT_ACCESS on the server."
    );
  }

  const routes: Array<{ label: string; path: string }> = [
    { label: "/consultants/ecosystems/[id]", path: `/consultants/ecosystems/${ecosystem.id}` },
    ...(firm
      ? [
          {
            label: "/consultants/ecosystems/[id]/firm/[firmId]",
            path: `/consultants/ecosystems/${ecosystem.id}/firm/${firm.firmCompanyId}`,
          },
        ]
      : []),
  ];

  console.log(`\n================ ROUTE TIMING @ ${firmCount}-FIRM SCALE (production build) ================`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Ecosystem: ${ecosystem.name}`);
  console.log(`Discipline: warm ${WARMUP}, measure ${SAMPLES}, nearest-rank p10/p50/p90.\n`);

  const results: Array<Record<string, unknown>> = [];
  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    const hit = async () => {
      const startedAt = performance.now();
      const response = await fetch(url, { headers: { cookie: jar.header() }, redirect: "manual" });
      // Drain the body: a route is not "served" until the HTML is fully received.
      await response.text();
      if (response.status !== 200) {
        throw new Error(`${route.label} returned ${response.status}`);
      }
      return performance.now() - startedAt;
    };

    for (let i = 0; i < WARMUP; i += 1) await hit();
    const samples: number[] = [];
    for (let i = 0; i < SAMPLES; i += 1) samples.push(await hit());

    const sorted = [...samples].sort((a, b) => a - b);
    const stat = {
      route: route.label,
      n: sorted.length,
      min: sorted[0]!,
      p10: percentile(sorted, 0.1),
      p50: percentile(sorted, 0.5),
      p90: percentile(sorted, 0.9),
      max: sorted[sorted.length - 1]!,
    };
    results.push(stat);
    console.log(
      `  ${route.label.padEnd(46)} p10 ${fmt(stat.p10)}  p50 ${fmt(stat.p50)}  p90 ${fmt(stat.p90)}   (min ${fmt(stat.min)} / max ${fmt(stat.max)})`
    );
  }

  console.log("\nJSON:");
  console.log(JSON.stringify({ firmCount, warmup: WARMUP, samples: SAMPLES, routes: results }, null, 2));
}

main().catch((error) => {
  console.error("route-timing failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
