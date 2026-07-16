/**
 * Provision a DIRECT credential login for a demo-BENCH vendor so a reviewer can
 * open its own /vendor/battlecard (and the rest of the vendor workspace) without
 * going through the consultant ecosystem view. Mirrors preview-pat-setup's ELITE
 * vendor block (owner user + ELITE membership + Ask-Pat consent), but targets any
 * bench vendor by id/name substring.
 *
 *   set -a; source .env.local; set +a; \
 *     node --import tsx scripts/demo/provision-bench-vendor-login.ts bridgepath [elite|pro]
 *
 * Tier defaults to ELITE so the named BattleCard (real firm names + full brief)
 * renders — the richest surface for a review sweep. Pass "pro" for the Secret-Firm
 * teaser (Bridgepath's natural prod tier). Idempotent; prints the credentials.
 * Uses the @/lib/prisma singleton.
 */
import { randomUUID } from "crypto";
import { MembershipPlan, MembershipStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPilotPassword } from "@/lib/auth/passwords";

const idSubstr = (process.argv[2] ?? "bridgepath").toLowerCase();
const tier = (process.argv[3] ?? "elite").toLowerCase() === "pro" ? MembershipPlan.PRO : MembershipPlan.ELITE;

function titleCase(s: string): string {
  return s.replace(/(^|[-_])([a-z])/g, (_m, _sep, c) => c.toUpperCase());
}

async function main() {
  if (!process.env.DATABASE_URL) { console.log("  ❌ DATABASE_URL unset"); process.exitCode = 1; return; }
  const vendor = await prisma.company.findFirst({
    where: { type: "VENDOR", dataBoundary: "DEMO", OR: [{ id: { contains: idSubstr } }, { name: { contains: idSubstr } }] },
    select: { id: true, name: true },
  });
  if (!vendor) { console.log(`no DEMO vendor matching '${idSubstr}'`); process.exitCode = 1; return; }

  const slug = idSubstr.replace(/[^a-z0-9]/g, "");
  const email = `demo-vendor-${slug}@pat.local`;
  const userId = `demo-vendor-${slug}-login`;
  const password = `PatVendor${titleCase(slug)}7x`;
  const passwordHash = await hashPilotPassword(password);

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId, email, name: `Demo ${vendor.name} Owner`, role: "OWNER",
      companyId: vendor.id, passwordHash, mustChangePassword: false, updatedAt: new Date(),
    },
    update: { companyId: vendor.id, passwordHash, mustChangePassword: false, role: "OWNER", updatedAt: new Date() },
  });

  // Bench vendors are seeded with a Subject already (mirror preview-pat-setup's
  // vendor-elite block, which findUniques it).
  const subject = await prisma.subject.findUnique({ where: { companyId: vendor.id }, select: { id: true } });
  if (!subject) { console.log(`vendor ${vendor.name} has no Subject row — cannot set membership`); process.exitCode = 1; return; }

  await prisma.membershipSubscription.upsert({
    where: { subjectId: subject.id },
    create: { id: randomUUID(), subjectId: subject.id, plan: tier, status: MembershipStatus.ACTIVE, provider: "pat-placeholder", startedAt: new Date(), updatedAt: new Date() },
    update: { plan: tier, status: MembershipStatus.ACTIVE, provider: "pat-placeholder", updatedAt: new Date() },
  });

  await prisma.aiAssistantConsent.upsert({
    where: { userId },
    create: { userId, optedIn: true, consentVersion: "preview", grantedAt: new Date() },
    update: { optedIn: true, consentVersion: "preview", grantedAt: new Date(), revokedAt: null },
  });

  console.log(`\n${tier} vendor login ready: ${email} / ${password} -> vendor "${vendor.name}" (${vendor.id})`);
  console.log(`  open /vendor/battlecard as this account for the ${tier === "ELITE" ? "named" : "Secret-teaser"} BattleCard.`);
}

main().catch((e) => { console.error("provision failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
