import type { PrismaClient } from "@prisma/client";

import { PERF_SCALE_ECOSYSTEM_PREFIX } from "@/lib/demo-seed/perfScale";

/**
 * The perf-scale ecosystem every scripts/perf/* profiler targets, resolved the
 * same way route-datalayer.ts resolves it so the numbers are comparable.
 *
 * TRAP, recorded because it bit twice: validate:launch's db:recreate wipes this
 * fixture, and a DEFAULT-depth reseed (5 products/firm) shows the route at
 * ~970ms — the symptom hiding, not fixed. Reseed with
 *   node --import tsx scripts/seed/perf-scale.ts --apply --depth=demo
 * (37 products, 1,739 firm reviews) before trusting any figure from here.
 */
export type PerfScaleTarget = {
  ecosystemId: string;
  consultantProfileId: string;
  vendorCompanyId: string;
};

export async function resolvePerfScaleTarget(prisma: PrismaClient): Promise<PerfScaleTarget> {
  const eco = await prisma.ecosystem.findFirst({
    where: { id: { startsWith: PERF_SCALE_ECOSYSTEM_PREFIX } },
    select: { id: true, consultantProfileId: true, vendorCompanyId: true },
  });
  if (!eco?.consultantProfileId || !eco.vendorCompanyId) {
    throw new Error(
      "perf-scale ecosystem not found — seed it: node --import tsx scripts/seed/perf-scale.ts --apply --depth=demo"
    );
  }
  return {
    ecosystemId: eco.id,
    consultantProfileId: eco.consultantProfileId,
    vendorCompanyId: eco.vendorCompanyId,
  };
}

/** Structural shape of a Prisma args object: keys kept, values reduced to their type. */
export function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0])] : [];
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] =
        entry && typeof entry === "object"
          ? shapeOf(entry)
          : typeof entry === "boolean"
            ? entry
            : typeof entry;
    }
    return out;
  }
  return typeof value;
}
