import { applyRepoEnv } from "@/lib/env/repoEnv";
import { servedAnchorsFor, sittingSeedFor, type AnchorPoolCell } from "@/lib/assessmentCore";
import { TIER_LETTER } from "@/lib/modules/qbankParser";

/**
 * anchor-pool (R66) read-only probe. Lists every knowledge bank template on the
 * database the shell points at (key, status, vertical, item and anchor counts,
 * whether the header pool is stored) and, with --sitting <id>, the anchors that
 * sitting served with their drivers. Never writes; never prints an env value.
 *
 *   node --import tsx scripts/modules/anchor-pool-probe.ts
 *   node --import tsx scripts/modules/anchor-pool-probe.ts --sitting <sittingId>
 */
async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  const sittingArg = process.argv.indexOf("--sitting");
  const sittingId = sittingArg >= 0 ? process.argv[sittingArg + 1] : null;
  try {
    const templates = await prisma.moduleTemplate.findMany({
      orderBy: { key: "asc" },
      select: { id: true, key: true, reviewStatus: true, verticalId: true, anchorPool: true, ModuleItem: { select: { key: true, isAnchor: true, difficulty: true } } },
    });
    const host = (() => { try { return new URL(process.env.DATABASE_URL ?? "").hostname; } catch { return "(unparsed)"; } })();
    console.log(`db host: ${host} · templates: ${templates.length}`);
    for (const t of templates) {
      const anchors = t.ModuleItem.filter((i) => i.isAnchor);
      const pool = Array.isArray(t.anchorPool) ? (t.anchorPool as AnchorPoolCell[]) : null;
      console.log(`${t.key} · ${t.reviewStatus} · ${t.verticalId} · items ${t.ModuleItem.length} · isAnchor ${anchors.length} (${anchors.map((i) => i.key.slice(t.key.length + 1).toUpperCase()).join(", ")}) · pool ${pool ? pool.map((c) => `${c.code}:${c.driver}:${c.tier}`).join(" ") : "untagged (null)"}`);
    }
    if (sittingId) {
      const sitting = await prisma.moduleSitting.findUnique({ where: { id: sittingId }, select: { id: true, companyId: true, templateId: true, servedItemIds: true, startedAt: true, status: true } });
      if (!sitting) { console.log(`sitting ${sittingId}: not found`); return; }
      const template = templates.find((t) => t.id === sitting.templateId)!;
      const served = Array.isArray(sitting.servedItemIds) ? (sitting.servedItemIds as string[]) : [];
      const items = await prisma.moduleItem.findMany({ where: { id: { in: served } }, select: { id: true, key: true, isAnchor: true, difficulty: true } });
      const pool = Array.isArray(template.anchorPool) ? (template.anchorPool as AnchorPoolCell[]) : null;
      const ordinal = await prisma.moduleSitting.count({ where: { companyId: sitting.companyId, templateId: sitting.templateId, startedAt: { lte: sitting.startedAt } } });
      const codeOf = (key: string) => key.slice(template.key.length + 1).toUpperCase();
      const servedCodes = new Set(items.map((i) => codeOf(i.key)));
      console.log(`\nsitting ${sitting.id} · ${template.key} · ${sitting.status} · ordinal ${ordinal} · served ${served.length} items`);
      if (pool) {
        const rule = servedAnchorsFor({ pool }, sittingSeedFor(sitting.companyId, ordinal));
        console.log(`rule for seed ${sittingSeedFor(sitting.companyId, ordinal)}: ${rule.served.map((c) => `${c.code}:${c.driver}:${c.tier}`).join(" ")} · uncovered ${rule.uncoveredDrivers.join(",") || "none"} · mix E${rule.tierCount.E} M${rule.tierCount.M} H${rule.tierCount.H} · shortfall E${rule.shortfall.E} M${rule.shortfall.M} H${rule.shortfall.H}`);
        console.log(`in this sitting: ${rule.served.map((c) => `${c.code}:${c.driver}=${servedCodes.has(c.code) ? "served" : "MISSING"}`).join(" ")}`);
      } else {
        const anchors = items.filter((i) => i.isAnchor);
        console.log(`untagged bank: anchors in sitting ${anchors.map((i) => `${codeOf(i.key)}:${TIER_LETTER[i.difficulty]}`).join(" ")}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
