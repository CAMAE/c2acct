import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * Block 12e orphan purge (Mythos ruling, 2026-07-13). Investigation retired the
 * "238 = 176 canon + 62 orphans" premise: the 238 demo firms are legitimate (224
 * carry login users; the rest are canonical and all have final submissions), so
 * the firm canon RE-BASELINES to 238. The only true orphans were 4 stale
 * `demo-bench-vendor-*` vendors (an old, superseded seed — no login users, but
 * carrying products + benchmark rows that polluted the vendor cohort).
 *
 * This flags DEMO FIRM/VENDOR companies that are (a) NOT in the canonical key set
 * (stableId over DEMO_PAT_FIRMS/VENDORS ∪ planExpansionEcosystems() keys) AND
 * (b) own NO login User — the hard guard that protects every review/demo account.
 * Key-recomputation alone is unreliable for firms (real ids carry extra indices),
 * so the user guard is load-bearing: it kept 47 non-canonical-but-real firms.
 * DRY-RUN by default; pass --apply. FK-safe order in a transaction (SurveySubmission
 * required → first; Product/VendorProfile SetNull → delete so they don't dangle;
 * rest cascade on company delete). Run at the scale the DB was seeded (scale 4).
 */

async function main() {
  applyRepoEnv();
  const apply = process.argv.includes("--apply");
  const { default: prisma } = await import("@/lib/prisma");
  const { DEMO_PAT_FIRMS, DEMO_PAT_VENDORS } = await import("@/data/demoPatEcosystem");
  const { planExpansionEcosystems } = await import("@/lib/demo-seed/expansion");
  const { stableId } = await import("@/lib/demoPatEcosystemSeed");

  const plans = planExpansionEcosystems();
  const firmKeys = new Set<string>([
    ...DEMO_PAT_FIRMS.map((f) => f.key),
    ...plans.flatMap((p) => p.firms.map((f) => f.demoFirmInput.key)),
  ]);
  const vendorKeys = new Set<string>([
    ...DEMO_PAT_VENDORS.map((v) => v.key),
    ...plans.map((p) => p.vendor.demoVendorInput.key),
  ]);
  const canonicalFirmIds = new Set([...firmKeys].map((k) => stableId("demo-firm-company", k)));
  const canonicalVendorIds = new Set([...vendorKeys].map((k) => stableId("demo-vendor-company", k)));

  const [firms, vendors] = await Promise.all([
    prisma.company.findMany({
      where: { type: "FIRM", dataBoundary: "DEMO" },
      select: { id: true, name: true, _count: { select: { User: true } } },
    }),
    prisma.company.findMany({
      where: { type: "VENDOR", dataBoundary: "DEMO" },
      select: { id: true, name: true, _count: { select: { User: true } } },
    }),
  ]);
  // HARD GUARD: never purge a company that has a login User — every review/demo
  // account (review.*, demo-firm-elite, demo-vendor-elite, review.firm's "Demo
  // Company", review.vendor's "PAT Demo Vendor") owns a User; true orphans from a
  // prior expand run own none. This protects the base ecosystem automatically.
  const isOrphan = <T extends { id: string; _count: { User: number } }>(c: T, canonical: Set<string>) =>
    !canonical.has(c.id) && c._count.User === 0;
  const orphanFirms = firms.filter((f) => isOrphan(f, canonicalFirmIds));
  const orphanVendors = vendors.filter((v) => isOrphan(v, canonicalVendorIds));
  const keptWithUsers =
    firms.filter((f) => !canonicalFirmIds.has(f.id) && f._count.User > 0).length +
    vendors.filter((v) => !canonicalVendorIds.has(v.id) && v._count.User > 0).length;

  console.log(`Canonical set: ${canonicalFirmIds.size} firms / ${canonicalVendorIds.size} vendors (scale ${process.env.PAT_DEMO_EXPAND_SCALE ?? "1"})`);
  console.log(`DB DEMO:       ${firms.length} firms / ${vendors.length} vendors`);
  console.log(`Orphans (no user, non-canonical): ${orphanFirms.length} firms / ${orphanVendors.length} vendors`);
  console.log(`Kept despite non-canonical (has login user): ${keptWithUsers}`);
  console.log(`After purge:   ${firms.length - orphanFirms.length} firms / ${vendors.length - orphanVendors.length} vendors`);

  // SAFETY: the review-account companies must NEVER be flagged as orphans.
  const protectedIds = [
    stableId("demo-vendor-company", "pat-demo-vendor"), // review.vendor
  ];
  const wronglyFlagged = [...orphanFirms, ...orphanVendors].filter((c) => protectedIds.includes(c.id));
  if (wronglyFlagged.length > 0) {
    console.error(`ABORT: protected companies flagged as orphans: ${wronglyFlagged.map((c) => c.name).join(", ")}`);
    process.exit(1);
  }

  console.log("\nSample orphan firms:", orphanFirms.slice(0, 5).map((f) => f.name).join(" | "));
  console.log("Orphan vendors:", orphanVendors.map((v) => v.name).join(" | ") || "(none)");

  if (!apply) {
    console.log("\nDRY-RUN — no changes. Re-run with --apply to purge.");
    return;
  }

  const orphanIds = [...orphanFirms, ...orphanVendors].map((c) => c.id);
  if (orphanIds.length === 0) {
    console.log("\nNothing to purge.");
    return;
  }
  const result = await prisma.$transaction(async (tx) => {
    const subs = await tx.surveySubmission.deleteMany({ where: { companyId: { in: orphanIds } } });
    const products = await tx.product.deleteMany({ where: { companyId: { in: orphanIds } } });
    const profiles = await tx.vendorProfile.deleteMany({ where: { companyId: { in: orphanIds } } });
    const companies = await tx.company.deleteMany({ where: { id: { in: orphanIds } } });
    return { subs: subs.count, products: products.count, profiles: profiles.count, companies: companies.count };
  });
  console.log(
    `\nPURGED: ${result.companies} companies (${result.subs} submissions, ${result.products} products, ${result.profiles} vendor profiles).`
  );
  const [firmsAfter, vendorsAfter] = await Promise.all([
    prisma.company.count({ where: { type: "FIRM", dataBoundary: "DEMO" } }),
    prisma.company.count({ where: { type: "VENDOR", dataBoundary: "DEMO" } }),
  ]);
  console.log(`Final: ${firmsAfter} firms / ${vendorsAfter} vendors.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
