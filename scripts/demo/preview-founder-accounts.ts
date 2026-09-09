/**
 * FOUNDERS PREVIEW (2026-09-10) — personal founder accounts on the Neon PREVIEW branch.
 *
 *   Discovery (read-only, default):
 *     (set -a; . ./.env.preview; set +a; node --import tsx scripts/demo/preview-founder-accounts.ts)
 *   Provision (writes; temporary passwords go to ONE local file, never stdout):
 *     (set -a; . ./.env.preview; set +a; node --import tsx scripts/demo/preview-founder-accounts.ts --provision \
 *       --out ~/work/preview-accounts.txt [--people "Leslie:lesliegarrettphd@gmail.com,Cam:cameron@garrettandgarrett.info"]
 *
 * Six roles per person: firm-pro, firm-elite, vendor-pro, vendor-elite, consultant,
 * admin — as plus-addresses `<local>+<role>@<domain>` of each person's own address
 * (Cam's ruling 2026-09-10: lesliegarrettphd+<role>@gmail.com, cameron+<role>@garrettandgarrett.info). Same credential path as
 * lib/provisioning/account.ts (hashPilotPassword + mustChangePassword=TRUE, so the
 * first sign-in lands on /sign-in/password-update), but ATTACHED to existing DEMO
 * companies instead of creating new ones:
 *   firm-*    MEMBER on the richest DEMO firm with an ACTIVE PRO / ELITE membership
 *             that has a FINAL submission for every firm module (5/5 → insights unlocked)
 *   vendor-*  MEMBER on the richest DEMO vendor with an ACTIVE PRO / ELITE membership
 *             and ≥1 product (ELITE prefers Meridian, as the July review accounts did)
 *   consultant ConsultantProfile + ConsultantAssignment. ConsultantAssignment.ecosystemId
 *             is UNIQUE (one consultant per ecosystem), so the first person gets the
 *             ecosystem matching --ecosystem (default "sentinel") and each further person
 *             gets the next-richest ecosystem whose current consultant is a seeded
 *             throwaway (never a @c2acct.com review account, never a founder).
 *   admin     company-less ADMIN (audienceHomeFor → /admin)
 *
 * Safety: refuses to run when DATABASE_URL's host equals the host in .env.prod
 * (prod is untouched by this box). Writes User / ConsultantProfile /
 * ConsultantAssignment / Ecosystem.consultantProfileId only — never company
 * boundary, membership, or pilot rows. Idempotent: re-running --provision issues a
 * fresh temporary password for each account and rewrites the --out file.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import prisma from "@/lib/prisma";
import { hashPilotPassword } from "@/lib/auth/passwords";
import { generateTemporaryPassword } from "@/lib/provisioning/account";
import { recordOperatorAuditEvent } from "@/lib/operatorAudit";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

const args = process.argv.slice(2);
const PROVISION = args.includes("--provision");
const flag = (name: string, fallback: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
type Person = { label: string; local: string; domain: string };
const PEOPLE: Person[] = flag("people", "Leslie:lesliegarrettphd@gmail.com,Cam:cameron@garrettandgarrett.info")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [label, address] = entry.includes(":") ? entry.split(":", 2) : [entry.split("@")[0], entry];
    const [local, domain] = address.split("@");
    if (!local || !domain) throw new Error(`--people entry "${entry}" is not Label:local@domain`);
    return { label, local, domain };
  });
const emailFor = (person: Person, role: string) => `${person.local}+${role}@${person.domain}`;
const OUT = flag("out", path.join(process.env.HOME ?? "~", "work", "preview-accounts.txt"));
const ECOSYSTEM_HINT = flag("ecosystem", "sentinel").toLowerCase();
const ROLES = ["firm-pro", "firm-elite", "vendor-pro", "vendor-elite", "consultant", "admin"] as const;
type Role = (typeof ROLES)[number];

const hostOf = (u?: string) => {
  try {
    return new URL(u ?? "").host || "(unset)";
  } catch {
    return "(unset)";
  }
};

function prodHost(): string | null {
  try {
    const envFile = readFileSync(path.join(process.cwd(), ".env.prod"), "utf8");
    const url = envFile.match(/^DATABASE_URL=(.*)$/m)?.[1]?.replace(/^"|"$/g, "");
    return url ? hostOf(url) : null;
  } catch {
    return null;
  }
}

type Pick = { id: string; name: string; richness: number };

async function firmPick(tier: "PRO" | "ELITE"): Promise<Pick | null> {
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((d) => d.key);
  const modules = await prisma.surveyModule.findMany({ where: { key: { in: moduleKeys } }, select: { id: true } });
  const moduleIds = modules.map((m) => m.id);
  const subs = await prisma.membershipSubscription.findMany({
    where: { plan: tier, status: "ACTIVE", Subject: { Company: { type: "FIRM", dataBoundary: "DEMO", deletedAt: null } } },
    select: { Subject: { select: { Company: { select: { id: true, name: true } } } } },
  });
  const companies = subs.map((s) => s.Subject?.Company).filter((c): c is { id: string; name: string } => Boolean(c));
  const ranked: Pick[] = [];
  for (const c of companies) {
    const rows = await prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({ companyId: c.id, moduleId: { in: moduleIds } }),
      select: { moduleId: true },
    });
    const distinct = new Set(rows.map((r) => r.moduleId)).size;
    if (distinct < moduleIds.length) continue;
    ranked.push({ id: c.id, name: c.name, richness: rows.length });
  }
  ranked.sort((a, b) => b.richness - a.richness || a.name.localeCompare(b.name));
  return ranked[0] ?? null;
}

async function vendorPick(tier: "PRO" | "ELITE", prefer: string | null): Promise<Pick | null> {
  const subs = await prisma.membershipSubscription.findMany({
    where: { plan: tier, status: "ACTIVE", Subject: { Company: { type: "VENDOR", dataBoundary: "DEMO", deletedAt: null } } },
    select: { Subject: { select: { Company: { select: { id: true, name: true } } } } },
  });
  const companies = subs.map((s) => s.Subject?.Company).filter((c): c is { id: string; name: string } => Boolean(c));
  const ranked: Pick[] = [];
  for (const c of companies) {
    const products = await prisma.product.count({ where: { companyId: c.id } });
    if (products === 0) continue;
    ranked.push({ id: c.id, name: c.name, richness: products });
  }
  if (prefer) {
    const p = ranked.find((c) => c.id.toLowerCase().includes(prefer) || c.name.toLowerCase().includes(prefer));
    if (p) return p;
  }
  ranked.sort((a, b) => b.richness - a.richness || a.name.localeCompare(b.name));
  return ranked[0] ?? null;
}

type Eco = { id: string; name: string; firms: number; holder: string | null };

async function ecosystems(): Promise<Eco[]> {
  const rows = await prisma.ecosystem.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { EcosystemFirm: true } },
      ConsultantProfile: { select: { User: { select: { email: true } } } },
    },
  });
  return rows
    .map((e) => ({ id: e.id, name: e.name, firms: e._count.EcosystemFirm, holder: e.ConsultantProfile?.User?.email ?? null }))
    .sort((a, b) => b.firms - a.firms || a.name.localeCompare(b.name));
}

function holderIsProtected(email: string | null, founders: Set<string>) {
  if (!email) return false;
  return email.endsWith("@c2acct.com") || founders.has(email);
}

async function upsertUser(email: string, name: string, role: "MEMBER" | "ADMIN", companyId: string | null, password: string) {
  const passwordHash = await hashPilotPassword(password);
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, companyId, passwordHash, mustChangePassword: true, passwordUpdatedAt: now, updatedAt: now },
    create: { id: randomUUID(), email, name, role, companyId, passwordHash, mustChangePassword: true, passwordUpdatedAt: now, updatedAt: now },
    select: { id: true },
  });
  await recordOperatorAuditEvent({
    actorUserId: null,
    action: "provision-preview-founder-account",
    entityType: "user",
    entityId: user.id,
    summary: `Provisioned preview founder account ${email} (${role}${companyId ? ` on ${companyId}` : ""})`,
    details: { requestedVia: "preview-founder-accounts-script", passwordSource: "temporary-password", mustChangePassword: true },
  });
  return user.id;
}

async function assignConsultant(userId: string, ecosystemId: string) {
  const now = new Date();
  const profile = await prisma.consultantProfile.upsert({
    where: { userId },
    update: { active: true, updatedAt: now },
    create: { id: randomUUID(), userId, active: true, updatedAt: now },
    select: { id: true },
  });
  await prisma.consultantAssignment.deleteMany({ where: { consultantProfileId: profile.id, ecosystemId: { not: ecosystemId } } });
  await prisma.consultantAssignment.deleteMany({ where: { ecosystemId, consultantProfileId: { not: profile.id } } });
  await prisma.ecosystem.updateMany({ where: { consultantProfileId: profile.id, id: { not: ecosystemId } }, data: { consultantProfileId: null } });
  await prisma.ecosystem.update({ where: { id: ecosystemId }, data: { consultantProfileId: profile.id } });
  await prisma.consultantAssignment.upsert({
    where: { consultantProfileId: profile.id },
    update: { ecosystemId, active: true, updatedAt: now },
    create: { id: randomUUID(), consultantProfileId: profile.id, ecosystemId, active: true, updatedAt: now },
  });
}

async function main() {
  const host = hostOf(process.env.DATABASE_URL);
  console.log(`\n=== PREVIEW FOUNDER ACCOUNTS (${PROVISION ? "PROVISION" : "DISCOVERY (read-only)"}) · target ${host} ===`);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unset — refusing.");
  const prod = prodHost();
  if (prod && prod === host) throw new Error(`DATABASE_URL host is the PROD host — refusing (this box never writes prod).`);

  const founders = new Set(PEOPLE.flatMap((p) => ROLES.map((r) => emailFor(p, r))));
  const firmPro = await firmPick("PRO");
  const firmElite = await firmPick("ELITE");
  const vendorPro = await vendorPick("PRO", null);
  const vendorElite = await vendorPick("ELITE", "meridian");
  const ecos = await ecosystems();
  const hinted = ecos.find((e) => e.name.toLowerCase().includes(ECOSYSTEM_HINT) || e.id.toLowerCase().includes(ECOSYSTEM_HINT));
  const ecoQueue: Eco[] = [];
  if (hinted) ecoQueue.push(hinted);
  for (const e of ecos) {
    if (ecoQueue.length >= PEOPLE.length) break;
    if (ecoQueue.some((q) => q.id === e.id)) continue;
    if (holderIsProtected(e.holder, founders) && !(e.holder && founders.has(e.holder))) continue;
    ecoQueue.push(e);
  }

  const table: Array<{ role: Role; target: string; id: string | null }> = [
    { role: "firm-pro", target: firmPro ? `${firmPro.name} (FIRM PRO, ${firmPro.richness} final submissions)` : "NONE", id: firmPro?.id ?? null },
    { role: "firm-elite", target: firmElite ? `${firmElite.name} (FIRM ELITE, ${firmElite.richness} final submissions)` : "NONE", id: firmElite?.id ?? null },
    { role: "vendor-pro", target: vendorPro ? `${vendorPro.name} (VENDOR PRO, ${vendorPro.richness} products)` : "NONE", id: vendorPro?.id ?? null },
    { role: "vendor-elite", target: vendorElite ? `${vendorElite.name} (VENDOR ELITE, ${vendorElite.richness} products)` : "NONE", id: vendorElite?.id ?? null },
    { role: "admin", target: "company-less ADMIN → /admin", id: null },
  ];
  for (const row of table) console.log(`  ${row.role.padEnd(13)} → ${row.target}${row.id ? `  [${row.id}]` : ""}`);
  PEOPLE.forEach((person, i) => {
    const e = ecoQueue[i];
    console.log(`  consultant    (${person.label}) → ${e ? `ecosystem "${e.name}" (${e.firms} firms, holder now: ${e.holder ?? "none"})  [${e.id}]` : "NONE"}`);
  });
  if (!hinted) console.log(`  ⚠️  no ecosystem matches "${ECOSYSTEM_HINT}" — first person gets the richest unprotected ecosystem instead.`);
  const missing = table.filter((r) => r.role !== "admin" && !r.id).map((r) => r.role);
  if (missing.length || ecoQueue.length < PEOPLE.length) {
    console.log(`  ❌ unresolved targets: ${[...missing, ...(ecoQueue.length < PEOPLE.length ? ["consultant"] : [])].join(", ")}`);
    process.exitCode = 1;
    if (PROVISION) return;
  }
  if (!PROVISION) {
    console.log(`\n  Dry run — nothing written. Add --provision to create ${PEOPLE.length * ROLES.length} accounts.`);
    return;
  }

  const lines: string[] = [`# PAT founders preview accounts · ${new Date().toISOString()} · target ${host}`, `# first sign-in enforces a password update (/sign-in/password-update)`, ""];
  let written = 0;
  for (const [i, person] of PEOPLE.entries()) {
    const label = person.label;
    for (const role of ROLES) {
      const email = emailFor(person, role);
      const password = generateTemporaryPassword();
      let where = "";
      if (role === "admin") {
        await upsertUser(email, `${label} (admin)`, "ADMIN", null, password);
        where = "/admin";
      } else if (role === "consultant") {
        const eco = ecoQueue[i];
        const userId = await upsertUser(email, `${label} (consultant)`, "MEMBER", null, password);
        await assignConsultant(userId, eco.id);
        where = `ecosystem ${eco.name}`;
      } else {
        const pick = role === "firm-pro" ? firmPro : role === "firm-elite" ? firmElite : role === "vendor-pro" ? vendorPro : vendorElite;
        await upsertUser(email, `${label} (${role})`, "MEMBER", pick!.id, password);
        where = pick!.name;
      }
      lines.push(`${email.padEnd(44)} ${password}   # ${where}`);
      written += 1;
    }
    lines.push("");
  }
  writeFileSync(OUT, lines.join("\n") + "\n", { mode: 0o600 });
  console.log(`\n  ✅ ${written} accounts provisioned (mustChangePassword=true). Temporary passwords written to ${OUT} (mode 600) — not printed.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
