/**
 * Group the ecosystem route's Prisma operations by their FULL argument shape,
 * and optionally attribute one operation to the app call chains that issue it.
 *
 *   node --import tsx scripts/perf/profile-query-shapes.ts
 *   node --import tsx scripts/perf/profile-query-shapes.ts --chains=Company.findUnique
 *
 * Two findings from BOX 4b-r that this script exists to keep:
 *
 * 1. Group by the WHOLE args object (where + select + include + orderBy), not
 *    by `select` alone. A findUnique that uses `include` has no `select`, and a
 *    select-keyed grouping renders it as {} — which read as "select-less relation
 *    loads" and sent a session looking for a call that did not exist. The 3,516
 *    "select-less" Company.findUnique were one include-shaped call.
 *
 * 2. Async stacks DO survive Prisma middleware. The default stack limit (10)
 *    is exhausted by Prisma's own frames before any app frame appears, which is
 *    what "middleware loses caller stacks" actually was. Raise
 *    Error.stackTraceLimit and keep every lib/ and app/ frame, and each
 *    operation resolves to a full chain with an exact count. Counts are exact;
 *    the chain is proof, not inference.
 */
import prisma from "@/lib/prisma";
import { applyRepoEnv } from "@/lib/env/repoEnv";

import { resolvePerfScaleTarget, shapeOf } from "./_perfScaleTarget";

applyRepoEnv();
Error.stackTraceLimit = 80;

const chainTarget = process.argv.find((arg) => arg.startsWith("--chains="))?.split("=")[1] ?? null;

function appChain(): string {
  return (new Error().stack ?? "")
    .split("\n")
    .slice(1)
    .filter((line) => /\/(lib|app)\//.test(line) && !/node_modules/.test(line))
    .map((line) =>
      line
        .replace(/.*c2acct-live\//, "")
        .replace(/^\s*at (async )?/, "")
        .replace(/\)$/, "")
    )
    .join(" <- ");
}

async function main() {
  const shapes = new Map<string, number>();
  const chains = new Map<string, number>();
  let collecting = false;

  prisma.$use(async (params, next) => {
    if (!collecting) return next(params);
    const op = `${params.model ?? "raw"}.${params.action}`;
    const key = `${op} ${JSON.stringify(shapeOf(params.args))}`;
    shapes.set(key, (shapes.get(key) ?? 0) + 1);
    if (chainTarget && op === chainTarget) {
      const chain = appChain();
      chains.set(chain, (chains.get(chain) ?? 0) + 1);
    }
    return next(params);
  });

  const target = await resolvePerfScaleTarget(prisma);
  const { getEcosystemDetailForConsultant } = await import("@/lib/ecosystem");
  await getEcosystemDetailForConsultant(target.consultantProfileId, target.ecosystemId); // warm

  collecting = true;
  const started = performance.now();
  await getEcosystemDetailForConsultant(target.consultantProfileId, target.ecosystemId);
  const wall = performance.now() - started;
  collecting = false;

  const total = [...shapes.values()].reduce((sum, count) => sum + count, 0);
  console.log(`wall ${wall.toFixed(0)}ms | prisma ops ${total}`);
  console.log("\n=== OPERATIONS BY FULL ARGS SHAPE (count exact)");
  for (const [key, count] of [...shapes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(`x${String(count).padStart(5)}  ${key}`);
  }

  if (chainTarget) {
    const chainTotal = [...chains.values()].reduce((sum, count) => sum + count, 0);
    console.log(`\n=== ${chainTarget} BY APP CALL CHAIN (total ${chainTotal})`);
    for (const [chain, count] of [...chains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
      console.log(`x${String(count).padStart(5)}  ${chain || "<no app frames>"}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
