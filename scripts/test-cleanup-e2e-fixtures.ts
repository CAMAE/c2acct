import { loadEnv } from "./_shared/prismaScript";

// loadEnv() must run before importing prisma so DATABASE_URL is in env
// when PrismaClient initializes.
loadEnv();

/**
 * AUDIT-D12-002 closer (Day-18 Block 3). Sweeps e2e-test fixture rows
 * that the local-review-auth and consultant-flow specs create but
 * historically did not clean up.
 *
 * Invoked from playwright `test.afterAll` hooks via execFileSync, which
 * gives the script a normal Node/tsx runtime (the in-test
 * `await import("@/lib/prisma")` path failed under Playwright's own
 * module loader — that's the Day-18 Block 3 diagnosis).
 *
 * Idempotent + tolerant: every delete is a `deleteMany` with no row count
 * assertion. Re-running on a clean DB is a no-op.
 *
 * Scope by name prefix on purpose — picks up historical leftovers from
 * crashed prior runs, not just the current run's rows.
 */

async function main() {
  const prismaModule = await import("@/lib/prisma");
  const prisma = prismaModule.default;

  // 1. Day-17 e2e leak: BriefEditChoice rows written by the consultant-
  //    flow happy-path test (Sentinel consultant picks a phrasing variant).
  //    Sweep ALL rows because the demo-bench data is reseeded between
  //    full validation chains; legitimate pre-seed BriefEditChoice rows
  //    would have to be re-introduced via the seed scripts (none today).
  await prisma.briefEditChoice.deleteMany({});

  // 2. Day-12 e2e leak: timestamped firm Companies created by the
  //    consultant-assigned-firm spec. Schema cascades EcosystemFirm; the
  //    Solo: ecosystem cascade is handled in step 3.
  await prisma.company.deleteMany({
    where: { name: { startsWith: "Consultant ", contains: " Firm " } },
  });

  // 3. Orphaned Solo: ecosystems left behind after the Company delete in
  //    step 2 (Ecosystem.vendorCompanyId is onDelete: SetNull, not Cascade).
  //    Cascades ConsultantAssignment via Ecosystem -> Assignment Cascade.
  await prisma.ecosystem.deleteMany({
    where: { name: { startsWith: "Solo: Consultant " } },
  });

  console.log("[test-cleanup-e2e-fixtures] cleanup complete");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[test-cleanup-e2e-fixtures] error:", error);
  process.exitCode = 1;
  process.exit(1);
});
