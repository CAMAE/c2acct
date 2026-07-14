/**
 * READ-ONLY orphan report for the founders-preview prod demo world (ledger L6 —
 * DETECTION ONLY, no prod deletions). Run AFTER the base chain (3a→3b→3c) and
 * BEFORE the content seeds:
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/report-prod-demo-orphans.ts
 *
 * "Orphan" = a live DEMO company NOT refreshed by the base seed chain. The base
 * seeds stamp updatedAt=new Date() on every in-plan row; classifyCompanyBoundaries
 * uses updateMany (which does NOT touch updatedAt, since Company.updatedAt is not
 * @updatedAt). So a DEMO company whose updatedAt predates the seed run by a wide
 * margin was not in any current plan = a June-era leftover.
 *
 * Threshold: PAT_ORPHAN_BEFORE (ISO) if set, else (freshest DEMO updatedAt − 1h).
 * The gap between a same-run row (minutes old) and a June row (weeks old) is
 * enormous, so the 1h window separates them cleanly; both the freshest ts and
 * the threshold are printed for audit.
 *
 * Per orphan, the three columns Mythos requires:
 *   users attached?   — User rows on the company
 *   boundary?         — dataBoundary (sanity: should be DEMO)
 *   referenced by evidence? — SurveySubmission / CompanyBenchmark / Product
 *                             counts + ecosystem membership (does it surface?)
 *
 * Writes NOTHING. Prints the set, then HOLD. Disposition waits on Mythos's live
 * sweep + a check of the Founders' Manual / Consultant Guide tour paths (the
 * named cohort may be referenced there).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hostOf(url: string | undefined): string {
  if (!url) return "(DATABASE_URL unset)";
  return url.replace(/^[^@]*@/, "").replace(/[/?].*$/, "");
}

async function main() {
  console.log(`\n=== PROD DEMO ORPHAN REPORT (detection-only, no deletions) ===`);
  console.log(`Target DB host: ${hostOf(process.env.DATABASE_URL)}`);
  if (!process.env.DATABASE_URL) {
    console.log("  ❌ DATABASE_URL unset — refusing to run.");
    process.exitCode = 1;
    return;
  }

  const freshest = await prisma.company.findFirst({
    where: { dataBoundary: "DEMO", deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  if (!freshest) {
    console.log("  No live DEMO companies found — nothing to report.");
    return;
  }
  const override = process.env.PAT_ORPHAN_BEFORE ? new Date(process.env.PAT_ORPHAN_BEFORE) : null;
  const threshold = override ?? new Date(freshest.updatedAt.getTime() - 60 * 60 * 1000);
  console.log(`Freshest DEMO updatedAt (= seed run): ${freshest.updatedAt.toISOString()}`);
  console.log(`Orphan threshold (updatedAt < this):  ${threshold.toISOString()}${override ? " [PAT_ORPHAN_BEFORE]" : " [freshest − 1h]"}\n`);

  const orphans = await prisma.company.findMany({
    where: { dataBoundary: "DEMO", deletedAt: null, updatedAt: { lt: threshold } },
    orderBy: [{ type: "asc" }, { updatedAt: "asc" }],
    select: { id: true, name: true, type: true, dataBoundary: true, updatedAt: true },
  });

  if (orphans.length === 0) {
    console.log("✅ No orphans — every live DEMO company was refreshed by the base chain.");
    console.log("\n=== HOLD — nothing to disposition ===");
    return;
  }

  console.log(`⚠️  ${orphans.length} orphan DEMO compan${orphans.length === 1 ? "y" : "ies"} (not refreshed by base chain):\n`);
  for (const o of orphans) {
    const [users, submissions, benchmarks, products, firmEco, vendorEco] = await Promise.all([
      prisma.user.count({ where: { companyId: o.id } }),
      prisma.surveySubmission.count({ where: { companyId: o.id } }),
      prisma.companyBenchmark.count({ where: { companyId: o.id } }),
      o.type === "VENDOR" ? prisma.product.count({ where: { companyId: o.id } }) : Promise.resolve(0),
      o.type === "FIRM" ? prisma.ecosystemFirm.count({ where: { firmCompanyId: o.id } }) : Promise.resolve(0),
      o.type === "VENDOR" ? prisma.ecosystem.count({ where: { vendorCompanyId: o.id } }) : Promise.resolve(0),
    ]);
    const eco = o.type === "FIRM" ? firmEco : vendorEco;
    const evidence = `submissions=${submissions} benchmarks=${benchmarks}` + (o.type === "VENDOR" ? ` products=${products}` : "") + ` ecosystem=${eco}`;
    const surfaces = submissions + benchmarks + products + eco > 0;
    console.log(`  ${o.type.padEnd(6)} ${o.name}`);
    console.log(`     id=${o.id}`);
    console.log(`     updatedAt=${o.updatedAt.toISOString()}  boundary=${o.dataBoundary}`);
    console.log(`     users attached? ${users > 0 ? `YES (${users})` : "no"}`);
    console.log(`     referenced by evidence? ${surfaces ? "YES" : "NO "} — ${evidence}`);
    console.log("");
  }

  console.log(`Summary: ${orphans.length} orphan(s). Those with "referenced by evidence? YES" can surface in the July UI.`);
  console.log(`\n=== HOLD (L6 — no prod deletions) ===`);
  console.log(`Disposition after Mythos's live sweep. Before ANY delete proposal, check the named cohort`);
  console.log(`(e.g. brightline/atlas/cobalt) against the Founders' Manual + Consultant Guide tour paths.`);
}

main()
  .catch((e) => {
    console.error("Orphan report failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
