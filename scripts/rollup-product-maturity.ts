import { applyRepoEnv } from "@/lib/env/repoEnv";
import { writeProductMaturitySnapshot } from "@/lib/productMaturity";

/**
 * Monthly product-maturity rollup (hybrid Elite depth, job body). Appends a
 * current maturity snapshot for every real product (its vendor is PRODUCTION or
 * PILOT) so the Elite depth Trend pane keeps moving even for products that were
 * not re-reviewed that month. Demo products are skipped inside the writer.
 * Schedule monthly via the deploy host's recompute-jobs launchd runner
 * (scripts/mac-mini/run-recompute-jobs.sh on the mac-mini checkout).
 *
 *   pnpm rollup:product-maturity
 */
async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  const products = await prisma.product.findMany({
    where: { Company: { is: { dataBoundary: { in: ["PRODUCTION", "PILOT"] } } } },
    select: { id: true },
  });
  let written = 0;
  for (const product of products) {
    const result = await writeProductMaturitySnapshot(prisma, product.id);
    if (result) written += 1;
  }
  console.log(`Product maturity rollup: ${written} of ${products.length} real products snapshotted.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
