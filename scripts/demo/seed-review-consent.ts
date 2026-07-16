/**
 * Seed Pat-assistant consent for the 5 shared review accounts so the "Ask Pat"
 * header bar renders for them immediately (the bar needs the flag AND per-user
 * consent: app/layout.tsx showPatTopBar = isPatAssistantEnabled() && user &&
 * hasPatConsent(user.id)). Idempotent (setConsent upserts AiAssistantConsent).
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/seed-review-consent.ts
 */
import prisma from "@/lib/prisma";
import { setConsent } from "@/lib/patAssistant/consent";

const EMAILS = [
  "firm-pro@c2acct.com",
  "firm-elite@c2acct.com",
  "vendor-pro@c2acct.com",
  "vendor-elite@c2acct.com",
  "consultant@c2acct.com",
];

async function main() {
  console.log(`\n=== SEED REVIEW-ACCOUNT PAT CONSENT ===`);
  if (!process.env.DATABASE_URL) { console.log("  ❌ DATABASE_URL unset"); process.exitCode = 1; return; }
  for (const email of EMAILS) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!u) { console.log(`  ⚠️  no user ${email}`); continue; }
    await setConsent(u.id, true);
    console.log(`  ✅ consent ON — ${email}`);
  }
  console.log(`Ask Pat bar will render for these accounts once PAT_ENABLE_PAT_ASSISTANT binds (redeploy).`);
}

main().catch((e) => { console.error("consent-seed failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
