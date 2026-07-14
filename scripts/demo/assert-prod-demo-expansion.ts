/**
 * READ-ONLY post-seed assertions for the founders-preview prod demo-expansion
 * (ledger step 4). Runs against whatever DATABASE_URL points at — intended to be
 * invoked with prod Neon's DIRECT_URL, e.g.:
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/assert-prod-demo-expansion.ts
 *
 * Writes NOTHING. Exits non-zero if any gate fails. Prints the target DB host
 * (never the credential) so the operator can confirm the target before trusting
 * the PASS.
 *
 * D0 ruling (Mythos 2026-07-14): D0-LOCAL = 238/43 is the ACCUMULATED review DB
 * and stays a LOCAL assertion only. On PROD, D0 is whatever the canonical seed
 * chain (base + demo-expand --apply) deterministically produces — RECORD it, do
 * not chase 238/43, do not invent firms. This script therefore prints prod's
 * actual DEMO firm/vendor counts as the canonical figure. To prove idempotency
 * on the post-apply re-run, lock the recorded numbers via
 * PAT_EXPECT_FIRMS / PAT_EXPECT_VENDORS and the D0 comparison becomes a gate.
 *
 * Gates (hard):
 *   ND  — 0 duplicate names among live DEMO companies
 *   A7  — every demo-* id is DEMO boundary; no demo-expand-* leaked into
 *         PILOT/PRODUCTION; pilot/production live counts reported for eyeball
 *   D5  — every ELITE membership on a DEMO company is status=ACTIVE (and >0 exist)
 *   D0  — RECORD (informational) unless PAT_EXPECT_FIRMS/PAT_EXPECT_VENDORS lock it
 *
 * D1/D2/D3 (thin cards, BattleCard mixes, trajectories) + the face==detail /
 * elite==pro equality invariants are Mythos's LIVE surface sweep, not this
 * data-layer script.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EXPECT = {
  firms: process.env.PAT_EXPECT_FIRMS ? Number(process.env.PAT_EXPECT_FIRMS) : null,
  vendors: process.env.PAT_EXPECT_VENDORS ? Number(process.env.PAT_EXPECT_VENDORS) : null,
};

let pass = true;
const fail = (m: string) => {
  pass = false;
  console.log(`  ❌ ${m}`);
};
const ok = (m: string) => console.log(`  ✅ ${m}`);

function hostOf(url: string | undefined): string {
  if (!url) return "(DATABASE_URL unset)";
  return url.replace(/^[^@]*@/, "").replace(/[/?].*$/, "");
}

async function main() {
  console.log(`\n=== PROD DEMO-EXPANSION ASSERTIONS ===`);
  console.log(`Target DB host: ${hostOf(process.env.DATABASE_URL)}\n`);
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is unset — refusing to run.");
    process.exitCode = 1;
    return;
  }

  // ---- Reconciliation: full live company breakdown by type × boundary ----
  const breakdown = await prisma.company.groupBy({
    by: ["type", "dataBoundary"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  console.log("Live company breakdown (deletedAt=null):");
  for (const row of breakdown.sort((a, b) => `${a.type}${a.dataBoundary}`.localeCompare(`${b.type}${b.dataBoundary}`))) {
    console.log(`     ${row.type.padEnd(7)} ${row.dataBoundary.padEnd(11)} ${row._count._all}`);
  }
  console.log("");

  // ---- D0: demo company counts by type (live) ----------------------------
  const [demoFirms, demoVendors] = await Promise.all([
    prisma.company.count({ where: { type: "FIRM", dataBoundary: "DEMO", deletedAt: null } }),
    prisma.company.count({ where: { type: "VENDOR", dataBoundary: "DEMO", deletedAt: null } }),
  ]);
  const lock = EXPECT.firms !== null || EXPECT.vendors !== null;
  console.log(`D0-PROD — demo companies (live): firms=${demoFirms} vendors=${demoVendors}` + (lock ? ` (locked expect ${EXPECT.firms}/${EXPECT.vendors})` : ` (RECORD — canonical prod scale; not 238/43)`));
  if (EXPECT.firms !== null) { if (demoFirms === EXPECT.firms) ok(`firms == ${EXPECT.firms} (idempotent)`); else fail(`firms ${demoFirms} != locked ${EXPECT.firms}`); }
  if (EXPECT.vendors !== null) { if (demoVendors === EXPECT.vendors) ok(`vendors == ${EXPECT.vendors} (idempotent)`); else fail(`vendors ${demoVendors} != locked ${EXPECT.vendors}`); }
  if (!lock) ok(`recorded prod canonical scale: ${demoFirms} firms / ${demoVendors} vendors — put this in the ledger`);

  // ---- ND: no duplicate names among live DEMO companies ------------------
  const dupes = await prisma.company.groupBy({
    by: ["name"],
    where: { dataBoundary: "DEMO", deletedAt: null },
    _count: { name: true },
    having: { name: { _count: { gt: 1 } } },
  });
  console.log(`\nND — duplicate DEMO company names: ${dupes.length}`);
  if (dupes.length === 0) ok("0 name-dupes");
  else {
    for (const d of dupes.slice(0, 20)) console.log(`     dup: "${d.name}" ×${d._count.name}`);
    fail(`${dupes.length} duplicate DEMO company name(s)`);
  }

  // ---- A7: boundary integrity -------------------------------------------
  const [demoIdNotDemo, expandLeak, pilot, production, demoNonNamespaced] = await Promise.all([
    prisma.company.count({ where: { id: { startsWith: "demo-" }, dataBoundary: { not: "DEMO" } } }),
    prisma.company.count({ where: { id: { startsWith: "demo-expand-" }, dataBoundary: { in: ["PILOT", "PRODUCTION"] } } }),
    prisma.company.count({ where: { dataBoundary: "PILOT", deletedAt: null } }),
    prisma.company.count({ where: { dataBoundary: "PRODUCTION", deletedAt: null } }),
    prisma.company.count({ where: { dataBoundary: "DEMO", NOT: { id: { startsWith: "demo-" } } } }),
  ]);
  console.log(`\nA7 — boundary integrity:`);
  console.log(`     demo-* ids not DEMO: ${demoIdNotDemo} | demo-expand-* in PILOT/PROD: ${expandLeak}`);
  console.log(`     live PILOT companies: ${pilot} | live PRODUCTION companies: ${production}`);
  console.log(`     DEMO rows with non-demo-* id (email-net catch): ${demoNonNamespaced}`);
  if (demoIdNotDemo === 0) ok("all demo-* ids are DEMO boundary"); else fail(`${demoIdNotDemo} demo-* id(s) not DEMO`);
  if (expandLeak === 0) ok("no demo-expand-* leaked into PILOT/PRODUCTION"); else fail(`${expandLeak} demo-expand-* row(s) in PILOT/PRODUCTION`);

  // ---- D5: demo ELITE memberships resolve ELITE + ACTIVE -----------------
  const eliteOnDemo = await prisma.membershipSubscription.findMany({
    where: { plan: "ELITE", Subject: { Company: { dataBoundary: "DEMO", deletedAt: null } } },
    select: {
      status: true,
      Subject: { select: { Company: { select: { id: true, name: true, type: true } } } },
    },
  });
  const nonActive = eliteOnDemo.filter((e) => e.status !== "ACTIVE");
  console.log(`\nD5 — demo ELITE memberships: ${eliteOnDemo.length} (non-ACTIVE: ${nonActive.length})`);
  for (const e of eliteOnDemo) {
    const c = e.Subject?.Company;
    console.log(`     ${e.status === "ACTIVE" ? "✓" : "✗"} ${e.status.padEnd(20)} ${c?.type} ${c?.name} (${c?.id})`);
  }
  if (eliteOnDemo.length > 0) ok(`${eliteOnDemo.length} demo ELITE account(s) present`); else fail("no demo ELITE accounts found");
  if (nonActive.length === 0) ok("all demo ELITE memberships ACTIVE"); else fail(`${nonActive.length} demo ELITE membership(s) not ACTIVE`);

  console.log(`\n=== ${pass ? "PASS ✓ all gates green" : "FAIL ✗ see ❌ above"} ===`);
  if (!pass) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Assertion run failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
