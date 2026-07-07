/**
 * PAT pilot-login diagnostic + repair (2026-07-07).
 *
 * WHY: vendor/firm/admin provisioned demo logins fail on prod while the
 * consultant login works. The Credentials provider authorizes against
 * User.passwordHash (auth.config.ts), so failures mean one of:
 *   (a) the user row does not exist in the target DB,
 *   (b) passwordHash is NULL or not a supported pat-scrypt-v1 hash,
 *   (c) the stored hash no longer matches the password in the (stale,
 *       May-29) credentials file,
 *   (d) mustChangePassword is stuck and the password-update flow blocks.
 *
 * USAGE (run on the Mac via Claude Code, with the env pointing at the DB
 * you want to inspect — local docker or prod Neon):
 *   node --import tsx scripts/audit/diagnose-pilot-logins.ts
 *   node --import tsx scripts/audit/diagnose-pilot-logins.ts --reset
 *
 * --reset generates a fresh policy-compliant password for every listed
 * account that exists, sets passwordHash + mustChangePassword=false, and
 * writes the plaintext ONLY to ./pilot-login-reset.local.md (git-ignored
 * by the *.local.* convention — verify before committing anything).
 * Save them to 1Password, then delete that file.
 *
 * SAFETY: additive/repair only. Never prints existing hashes. Never
 * touches users outside the explicit list below.
 */
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { runWithPrisma } from "../_shared/prismaScript";
import { hashPilotPassword, isSupportedPasswordHash } from "@/lib/auth/passwords";

const PILOT_EMAILS = [
  "demo-vendor@patalign.test",
  "demo-firm@patalign.test",
  "demo-consultant@patalign.test",
  "demo-admin-2@patalign.test",
];

function generatePassword() {
  // Policy (lib/auth/passwords.ts): >=12 chars, lower + upper + digit.
  const alphabet =
    "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = randomBytes(24);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  // Guarantee character classes.
  return `${out.slice(0, 20)}aA7`;
}

async function main() {
  const doReset = process.argv.includes("--reset");
  const resetLines: string[] = [];

  await runWithPrisma(async (prisma) => {
    for (const email of PILOT_EMAILS) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          mustChangePassword: true,
          passwordUpdatedAt: true,
          SubjectMembership: {
            select: {
              membershipRole: true,
              active: true,
              Subject: { select: { kind: true, displayName: true } },
            },
          },
        },
      });

      if (!user) {
        console.log(`✗ ${email} — NO USER ROW in this database. (Root cause a: never provisioned here.)`);
        continue;
      }

      const hashOk = isSupportedPasswordHash(user.passwordHash);
      console.log(
        [
          `• ${email}`,
          `  passwordHash: ${user.passwordHash ? (hashOk ? "present (pat-scrypt-v1)" : "PRESENT BUT UNSUPPORTED FORMAT") : "NULL — cannot sign in"}`,
          `  mustChangePassword: ${user.mustChangePassword}`,
          `  passwordUpdatedAt: ${user.passwordUpdatedAt?.toISOString() ?? "never"}`,
          `  memberships: ${
            user.SubjectMembership.length
              ? user.SubjectMembership.map(
                  (m) => `${m.membershipRole}${m.active ? "" : " (inactive)"}@${m.Subject.kind}:${m.Subject.displayName}`
                ).join(", ")
              : "NONE — sign-in may succeed but portals will deny"
          }`,
        ].join("\n")
      );

      if (doReset) {
        const password = generatePassword();
        const passwordHash = await hashPilotPassword(password);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash, mustChangePassword: false, passwordUpdatedAt: new Date() },
        });
        resetLines.push(`${email}  →  ${password}`);
        console.log(`  ↺ password RESET (plaintext written to pilot-login-reset.local.md)`);
      }
    }
  });

  if (doReset && resetLines.length) {
    writeFileSync(
      "pilot-login-reset.local.md",
      [
        "# Pilot login reset — save to 1Password, then DELETE this file.",
        `Generated ${new Date().toISOString()}`,
        "",
        ...resetLines,
        "",
      ].join("\n"),
      { mode: 0o600 }
    );
    console.log("\nDone. New passwords in pilot-login-reset.local.md — 1Password it, delete it.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
