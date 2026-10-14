import { applyRepoEnv } from "@/lib/env/repoEnv";
import { servedAnchorsFor, sittingSeedFor, type AnchorPoolCell } from "@/lib/assessmentCore";
import { codeOfItemKey, readStoredAnchorPool, untaggedPoolFrom } from "@/lib/modules/anchorPool";

/**
 * anchor-import (R67, items 4 to 6). Read only. For every template on the
 * database the shell points at: the served six for the seeds "coverage",
 * firm#1 and firm#2 (tier count and one-per-driver check), and for each
 * APPROVED template with a -pool twin, the APPROVED served six beside the
 * DRAFT twin's. Never writes; prints the db host only.
 *
 *   node --import tsx scripts/modules/anchor-pool-continuity.ts
 */
const SEEDS = ["coverage", sittingSeedFor("firm", 1), sittingSeedFor("firm", 2)];

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  try {
    const host = (() => { try { return new URL(process.env.DATABASE_URL ?? "").hostname; } catch { return "(unparsed)"; } })();
    const templates = await prisma.moduleTemplate.findMany({
      orderBy: { key: "asc" },
      select: { key: true, reviewStatus: true, verticalId: true, anchorPool: true, _count: { select: { ModuleItem: true } }, ModuleItem: { where: { isAnchor: true }, orderBy: { order: "asc" }, select: { key: true, difficulty: true } } },
    });
    console.log(`db host: ${host} · templates: ${templates.length}`);
    const poolOf = (t: (typeof templates)[number]): { pool: AnchorPoolCell[]; tagged: boolean } => {
      const stored = readStoredAnchorPool(t.anchorPool);
      if (stored) return { pool: stored, tagged: true };
      return { pool: untaggedPoolFrom(t.ModuleItem.map((i) => ({ code: codeOfItemKey(i.key, t.key), difficulty: i.difficulty }))), tagged: false };
    };
    const fmt = (cells: AnchorPoolCell[]) => cells.map((c) => `${c.code}${c.driver ? `:${c.driver}` : ""}:${c.tier ?? "?"}`).join(" ");
    console.log("\n== served six per template, three seeds ==");
    for (const t of templates) {
      const { pool, tagged } = poolOf(t);
      console.log(`${t.key} · ${t.reviewStatus} · ${t._count.ModuleItem} items · ${tagged ? `${pool.length} cells` : "untagged"}`);
      for (const seed of SEEDS) {
        const r = servedAnchorsFor({ pool }, seed);
        const onePerDriver = tagged && new Set(r.served.map((c) => c.driver)).size === 6 && r.served.length === 6;
        console.log(`  seed ${seed.padEnd(9)} → ${fmt(r.served)} · E${r.tierCount.E} M${r.tierCount.M} H${r.tierCount.H} · ${onePerDriver ? "one per driver" : `uncovered ${r.uncoveredDrivers.join(",") || "none"}`} · shortfall E${r.shortfall.E} M${r.shortfall.M} H${r.shortfall.H}`);
      }
    }
    console.log("\n== continuity: APPROVED served six beside the DRAFT -pool twin (seed coverage) ==");
    for (const t of templates.filter((x) => !x.key.endsWith("-pool"))) {
      const twin = templates.find((x) => x.key === `${t.key}-pool`);
      const a = servedAnchorsFor(poolOf(t), "coverage");
      const left = fmt(a.served);
      if (!twin) { console.log(`${t.key}: ${left} · no -pool twin`); continue; }
      const b = servedAnchorsFor(poolOf(twin), "coverage");
      const l = new Set(a.served.map((c) => c.code)); const r = new Set(b.served.map((c) => c.code));
      const added = [...r].filter((c) => !l.has(c)); const dropped = [...l].filter((c) => !r.has(c));
      console.log(`${t.key} (${t.reviewStatus}, E${a.tierCount.E} M${a.tierCount.M} H${a.tierCount.H}): ${left}\n  ${twin.key} (${twin.reviewStatus}, E${b.tierCount.E} M${b.tierCount.M} H${b.tierCount.H}): ${fmt(b.served)}\n  change: ${added.length || dropped.length ? `+${added.join(",") || "none"} -${dropped.join(",") || "none"}` : "none"}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
