import { applyRepoEnv } from "@/lib/env/repoEnv";
import { writeFirmMaturitySnapshot } from "@/lib/firmMaturity";

/**
 * Monthly firm-maturity rollup (B5-5, job body). Appends a current maturity
 * snapshot for every real firm (PRODUCTION+PILOT) so the Trajectory surface keeps
 * moving even for firms that did not resubmit that month. Demo firms are skipped
 * inside the writer. Schedule monthly via the deploy host's recompute-jobs launchd
 * runner (scripts/mac-mini/run-recompute-jobs.sh on the mac-mini checkout).
 *
 *   pnpm rollup:firm-maturity
 */
async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  const firms = await prisma.company.findMany({
    where: { type: "FIRM", dataBoundary: { in: ["PRODUCTION", "PILOT"] } },
    select: { id: true },
  });
  let written = 0;
  for (const firm of firms) {
    const result = await writeFirmMaturitySnapshot(prisma, firm.id);
    if (result) written += 1;
  }
  console.log(`Firm maturity rollup: ${written} of ${firms.length} real firms snapshotted.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
