/**
 * PROD shared REVIEW accounts (founders-preview) — supersedes prod-tour-accounts.ts.
 *
 *   Discovery (read-only, default):
 *     ... node --import tsx scripts/demo/prod-review-accounts.ts
 *   Provision (writes; prints creds to terminal ONLY):
 *     ... node --import tsx scripts/demo/prod-review-accounts.ts --provision
 *
 * FIVE shared logins so founders compare Pro vs Elite side by side. Strong
 * generated passwords, mustChangePassword=FALSE (shared creds, no forced change).
 * Auth path = provisioned-pilot (credentials → JWT sessions → concurrent logins
 * on one account are server-side safe).
 *
 *   firm-pro@c2acct.com     MEMBER on richest PRO demo-bench FIRM
 *   firm-elite@c2acct.com   MEMBER on richest ELITE demo-bench FIRM  (twin — membership is
 *                           per-company/@@unique(subjectId), so Pro+Elite CANNOT share one firm)
 *   vendor-pro@c2acct.com   MEMBER on richest PRO demo VENDOR (twin of Meridian)
 *   vendor-elite@c2acct.com MEMBER on Meridian Practice Cloud (ELITE vendor)
 *   consultant@c2acct.com   ConsultantProfile + reassigned ownership of one rich ecosystem
 *                           (ecosystem↔consultant is 1:1; displaces a throwaway seeded consultant)
 *
 * Data-parallelism caveat: firm/vendor twins are the richest of each tier by
 * submission density; archetype is NOT stored in the DB, so twins are comparable,
 * not identical. WRITES only User / ConsultantProfile / ConsultantAssignment /
 * Ecosystem.consultantProfileId — never company boundary, membership, or pilot.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPilotPassword } from "@/lib/auth/passwords";

const prisma = new PrismaClient();
const PROVISION = process.argv.includes("--provision");

const COMPANY_ACCOUNTS = [
  { email: "firm-pro@c2acct.com", type: "FIRM", tier: "PRO", preferClass: "demo-bench-firm", preferId: null },
  { email: "firm-elite@c2acct.com", type: "FIRM", tier: "ELITE", preferClass: "demo-bench-firm", preferId: null },
  { email: "vendor-pro@c2acct.com", type: "VENDOR", tier: "PRO", preferClass: null, preferId: null },
  { email: "vendor-elite@c2acct.com", type: "VENDOR", tier: "ELITE", preferClass: null, preferId: "meridian" },
] as const;

function strongPassword() {
  // Guarantee the pilot policy: >=12 chars, >=1 lower + upper + digit. Alphanumeric
  // only (ambiguous chars dropped) so creds are shell-safe and easy to type.
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digit = "23456789";
  const all = lower + upper + digit;
  const pick = (set: string) => set[randomBytes(1)[0] % set.length];
  const chars = [pick(lower), pick(upper), pick(digit)];
  while (chars.length < 16) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
const hex = () => randomBytes(16).toString("hex");
const hostOf = (u?: string) => (u ? u.replace(/^[^@]*@/, "").replace(/[/?].*$/, "") : "(unset)");

async function richness(ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const g = await prisma.surveySubmission.groupBy({ by: ["companyId"], where: { companyId: { in: ids } }, _count: { _all: true } });
  return new Map(g.map((r) => [r.companyId, r._count._all]));
}

async function pickCompany(type: string, tier: string, preferClass: string | null, preferId: string | null) {
  const subs = await prisma.membershipSubscription.findMany({
    where: { plan: tier as never, status: "ACTIVE", Subject: { Company: { type: type as never, dataBoundary: "DEMO", deletedAt: null } } },
    select: { Subject: { select: { Company: { select: { id: true, name: true } } } } },
  });
  const companies = subs.map((s) => s.Subject?.Company).filter((c): c is { id: string; name: string } => Boolean(c));
  if (preferId) {
    const p = companies.find((c) => c.id.includes(preferId) || c.name.toLowerCase().includes(preferId));
    if (p) return { ...p, richness: (await richness([p.id])).get(p.id) ?? 0, preferred: true };
  }
  const classed = preferClass ? companies.filter((c) => c.id.includes(preferClass)) : companies;
  const pool = classed.length ? classed : companies;
  const rich = await richness(pool.map((c) => c.id));
  const ranked = pool.map((c) => ({ ...c, richness: rich.get(c.id) ?? 0 })).sort((a, b) => b.richness - a.richness || a.name.localeCompare(b.name));
  return ranked[0] ? { ...ranked[0], preferred: false } : null;
}

async function upsertLogin(email: string, name: string, companyId: string | null, password: string) {
  const hash = await hashPilotPassword(password);
  const now = new Date();
  await prisma.user.upsert({
    where: { email },
    update: { name, role: "MEMBER", companyId, passwordHash: hash, mustChangePassword: false, passwordUpdatedAt: now, updatedAt: now },
    create: { id: hex(), email, name, role: "MEMBER", companyId, passwordHash: hash, mustChangePassword: false, passwordUpdatedAt: now, updatedAt: now },
    select: { id: true },
  });
}

async function main() {
  console.log(`\n=== PROD SHARED REVIEW ACCOUNTS (${PROVISION ? "PROVISION" : "DISCOVERY (read-only)"}) ===`);
  console.log(`Target DB host: ${hostOf(process.env.DATABASE_URL)}`);
  if (!process.env.DATABASE_URL) { console.log("  ❌ DATABASE_URL unset — refusing."); process.exitCode = 1; return; }
  const creds: Array<{ email: string; where: string; password: string }> = [];

  // ---- 4 company accounts ----
  for (const a of COMPANY_ACCOUNTS) {
    const company = await pickCompany(a.type, a.tier, a.preferClass, a.preferId);
    const slot = `${a.type} ${a.tier}`;
    if (!company) { console.log(`  ⚠️  ${a.email} (${slot}): no live DEMO ${a.type} with ACTIVE ${a.tier} membership.`); continue; }
    console.log(`  ${a.email.padEnd(24)} → ${company.name} [${slot}]  richness=${(company as { richness: number }).richness}${(company as { preferred: boolean }).preferred ? " (preferred)" : ""}`);
    console.log(`     company id: ${company.id}`);
    if (PROVISION) {
      const pw = strongPassword();
      await upsertLogin(a.email, `Review ${slot}`, company.id, pw);
      creds.push({ email: a.email, where: `${company.name} [${slot}]`, password: pw });
    }
  }

  // ---- consultant account (ecosystem reassignment) ----
  const ecos = await prisma.ecosystem.findMany({ select: { id: true, name: true, consultantProfileId: true, vendorCompanyId: true, _count: { select: { EcosystemFirm: true } } } });
  const target = ecos.find((e) => e.vendorCompanyId?.includes("meridian")) ?? [...ecos].sort((a, b) => b._count.EcosystemFirm - a._count.EcosystemFirm)[0];
  if (!target) {
    console.log(`  ⚠️  consultant@c2acct.com: no ecosystem to assign.`);
  } else {
    console.log(`  ${"consultant@c2acct.com".padEnd(24)} → ecosystem "${target.name}" (${target._count.EcosystemFirm} firms)${target.consultantProfileId ? `  [reassigns from current owner profile ${target.consultantProfileId}]` : ""}`);
    if (PROVISION) {
      const pw = strongPassword();
      const hash = await hashPilotPassword(pw);
      const now = new Date();
      const user = await prisma.user.upsert({
        where: { email: "consultant@c2acct.com" },
        update: { name: "Review Consultant", role: "MEMBER", companyId: null, passwordHash: hash, mustChangePassword: false, passwordUpdatedAt: now, updatedAt: now },
        create: { id: hex(), email: "consultant@c2acct.com", name: "Review Consultant", role: "MEMBER", passwordHash: hash, mustChangePassword: false, passwordUpdatedAt: now, updatedAt: now },
        select: { id: true },
      });
      const profile = await prisma.consultantProfile.upsert({
        where: { userId: user.id },
        update: { active: true, updatedAt: now },
        create: { id: hex(), userId: user.id, active: true, updatedAt: now },
        select: { id: true },
      });
      // free both unique slots, then own the target ecosystem
      await prisma.consultantAssignment.deleteMany({ where: { consultantProfileId: profile.id, ecosystemId: { not: target.id } } });
      await prisma.consultantAssignment.deleteMany({ where: { ecosystemId: target.id, consultantProfileId: { not: profile.id } } });
      await prisma.ecosystem.update({ where: { id: target.id }, data: { consultantProfileId: profile.id } });
      await prisma.consultantAssignment.upsert({
        where: { consultantProfileId: profile.id },
        update: { ecosystemId: target.id, active: true },
        create: { id: hex(), consultantProfileId: profile.id, ecosystemId: target.id, active: true },
      });
      creds.push({ email: "consultant@c2acct.com", where: `consultant portal → "${target.name}"`, password: pw });
    }
  }

  if (PROVISION) {
    console.log(`\nSHARED REVIEW CREDENTIALS (terminal only — never into files/commits):`);
    console.log(`  ${"email".padEnd(24)} | ${"lands on".padEnd(46)} | password`);
    console.log(`  ${"-".repeat(24)}-+-${"-".repeat(46)}-+---------`);
    for (const c of creds) console.log(`  ${c.email.padEnd(24)} | ${c.where.padEnd(46)} | ${c.password}`);
    console.log(`\n  All: mustChangePassword=false, concurrent sessions OK (JWT). Auth path: provisioned-pilot (/sign-in).`);
  } else {
    console.log(`\nRun again with --provision to create these 5 logins and print passwords.`);
  }
}

main().catch((e) => { console.error("Review-accounts failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
