import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * Read-only verification that the consultant vendor brief is fully populated
 * for the demo ecosystem: builds the real VendorBriefData through
 * getVendorBriefForConsultant (same code path as the page) and reports, per
 * section, whether it has data — including the positioning radar's >= 3
 * usable-product requirement. Run after the demo seed:
 *
 *   DATABASE_URL=<prod> node --import tsx scripts/demo/verify-vendor-brief-sections.ts
 */

const ECOSYSTEM_ID = process.env.PAT_VERIFY_ECOSYSTEM_ID?.trim() || "demo-acct-ecosystem";
const RADAR_MIN_AXES = 3;

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  const { getVendorBriefForConsultant } = await import("@/lib/briefs");

  const assignment = await prisma.consultantAssignment.findFirst({
    where: { ecosystemId: ECOSYSTEM_ID, active: true },
    select: { consultantProfileId: true },
  });
  if (!assignment) {
    console.error(`ABORT: no active consultant assignment on ecosystem ${ECOSYSTEM_ID}.`);
    process.exit(1);
  }
  console.log(`Building brief as consultant profile ${assignment.consultantProfileId} on ${ECOSYSTEM_ID}…`);

  const brief = await getVendorBriefForConsultant(assignment.consultantProfileId, ECOSYSTEM_ID);
  if (!brief) {
    console.error("ABORT: getVendorBriefForConsultant returned null (tenancy/ecosystem wiring).");
    process.exit(1);
  }

  const radarUsable = brief.selfVsMarketDelta.filter(
    (row) => row.vendorSelfReported !== null || row.firmReviewedAverage !== null
  );
  const heatmapScoredCells = brief.perFirmHeatmap.cells.filter((cell) => cell.score !== null);
  const roadmapTotal =
    brief.actionRoadmap.thirtyDay.length +
    brief.actionRoadmap.sixtyDay.length +
    brief.actionRoadmap.ninetyDay.length;

  const checks: Array<[section: string, ok: boolean, detail: string]> = [
    ["header", Boolean(brief.vendorCompanyName) && brief.firmCount > 0 && brief.productCount > 0,
      `vendor="${brief.vendorCompanyName}" firms=${brief.firmCount} products=${brief.productCount}`],
    ["executiveSummary", Boolean(brief.executiveSummary) && Object.values(brief.executiveSummary).some(Boolean),
      JSON.stringify(brief.executiveSummary).slice(0, 140) + "…"],
    ["selfVsMarketDelta (table)", brief.selfVsMarketDelta.length > 0,
      brief.selfVsMarketDelta.map((r) => `${r.productName}: self=${r.vendorSelfReported} firmAvg=${r.firmReviewedAverage} (${r.firmReviewCount} reviews)`).join(" | ")],
    ["positioningRadar (>=3 usable)", radarUsable.length >= RADAR_MIN_AXES,
      `${radarUsable.length} usable products (MIN_AXES=${RADAR_MIN_AXES})`],
    ["perFirmHeatmap", brief.perFirmHeatmap.firms.length > 0 && brief.perFirmHeatmap.products.length > 0 && heatmapScoredCells.length > 0,
      `firms=${brief.perFirmHeatmap.firms.length} products=${brief.perFirmHeatmap.products.length} scoredCells=${heatmapScoredCells.length}/${brief.perFirmHeatmap.cells.length}`],
    ["actionRoadmap", roadmapTotal > 0,
      `30d=${brief.actionRoadmap.thirtyDay.length} 60d=${brief.actionRoadmap.sixtyDay.length} 90d=${brief.actionRoadmap.ninetyDay.length}`],
    ["methodology", brief.methodology.sampleSizes.firmCount > 0 && brief.methodology.sampleSizes.reviewCount > 0,
      JSON.stringify(brief.methodology.sampleSizes)],
    ["editVariants", Object.keys(brief.editVariants).length > 0,
      `${Object.keys(brief.editVariants).length} sections with variants`],
  ];

  let failures = 0;
  for (const [section, ok, detail] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}  ${section.padEnd(28)} ${detail}`);
    if (!ok) failures += 1;
  }

  console.log(failures === 0 ? "\nALL SECTIONS POPULATED." : `\n${failures} section(s) missing data.`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
