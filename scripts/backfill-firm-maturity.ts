import { applyRepoEnv } from "@/lib/env/repoEnv";
import { maturityTier, MATURITY_SNAPSHOT_VERSION } from "@/lib/firmMaturity";

/**
 * One-time idempotent backfill of FirmMaturitySnapshot history (B5-5) from real
 * SurveySubmission history — reconstructs each firm's alignment trajectory from
 * the actual timestamps of its final module submissions. No fabricated history:
 * one snapshot per real submission event, at that event's time. Real firms only
 * (PRODUCTION+PILOT); demo untouched.
 *
 *   Dry run (default):  pnpm backfill:firm-maturity
 *   Apply (local/prev): pnpm backfill:firm-maturity -- --apply
 *   Prod --apply is Cam's-go-only at deploy night.
 *
 * Idempotent: deterministic snapshot ids keyed by (company, event time).
 */
import { createHash } from "node:crypto";

function stableId(companyId: string, iso: string): string {
  return `fmi-backfill-${createHash("sha1").update(`${companyId}:${iso}`).digest("hex").slice(0, 24)}`;
}

async function main() {
  applyRepoEnv();
  const apply = process.argv.includes("--apply");
  const { default: prisma } = await import("@/lib/prisma");
  const { FIRM_MODULE_DEFINITIONS } = await import("@/lib/firmPat");
  const { getSurveyFinalWhere } = await import("@/lib/surveyDrafts");

  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((m) => m.key);
  const firms = await prisma.company.findMany({
    where: { type: "FIRM", dataBoundary: { in: ["PRODUCTION", "PILOT"] } },
    select: { id: true, name: true },
  });

  let firmsWithHistory = 0;
  let snapshotsPlanned = 0;

  for (const firm of firms) {
    const subs = await prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({ SurveyModule: { key: { in: moduleKeys } }, companyId: firm.id }),
      orderBy: { createdAt: "asc" },
      select: { moduleId: true, score: true, createdAt: true },
    });
    if (subs.length === 0) continue;
    firmsWithHistory += 1;

    const latest = new Map<string, number>();
    const events: Array<{ at: Date; score: number }> = [];
    for (const s of subs) {
      if (typeof s.score !== "number") continue;
      latest.set(s.moduleId, s.score);
      const scores = [...latest.values()];
      events.push({ at: s.createdAt, score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) });
    }
    snapshotsPlanned += events.length;

    if (apply) {
      for (const ev of events) {
        const tier = maturityTier(ev.score);
        const id = stableId(firm.id, ev.at.toISOString());
        await prisma.firmMaturitySnapshot.upsert({
          where: { id },
          create: {
            id,
            companyId: firm.id,
            score: ev.score,
            tier: tier.tier,
            bandMin: tier.bandMin,
            bandMax: tier.bandMax,
            version: MATURITY_SNAPSHOT_VERSION,
            computedAt: ev.at,
          },
          update: { score: ev.score, tier: tier.tier, bandMin: tier.bandMin, bandMax: tier.bandMax, computedAt: ev.at },
        });
      }
      // final index from the last event
      const last = events[events.length - 1];
      const tier = maturityTier(last.score);
      await prisma.firmMaturityIndex.upsert({
        where: { companyId_version: { companyId: firm.id, version: MATURITY_SNAPSHOT_VERSION } },
        create: { id: `fmi-${firm.id}`, companyId: firm.id, score: last.score, tier: tier.tier, bandMin: tier.bandMin, bandMax: tier.bandMax, version: MATURITY_SNAPSHOT_VERSION },
        update: { score: last.score, tier: tier.tier, bandMin: tier.bandMin, bandMax: tier.bandMax, computedAt: last.at },
      });
    }
  }

  console.log(
    `\nFirm maturity backfill (${apply ? "APPLIED" : "DRY RUN"}): ${firms.length} real firms, ${firmsWithHistory} with submission history, ${snapshotsPlanned} snapshots ${apply ? "written" : "would be written"}.`
  );
  if (!apply) console.log("Re-run with --apply to write. Prod --apply is Cam's-go-only at deploy night.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
