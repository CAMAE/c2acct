import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  hashPilotPassword,
  isSupportedPasswordHash,
  validatePilotPassword,
  verifyPilotPassword,
} from "@/lib/auth/passwords";
import { PILOT_SEED_TEMPORARY_PASSWORD } from "@/lib/pilotCohortSeed";

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("pilot provisioned password auth", () => {
  it("stores verifiable salted password hashes without accepting plaintext", async () => {
    const password = "PatPilotTemp123";
    const hash = await hashPilotPassword(password);

    expect(hash).not.toContain(password);
    expect(isSupportedPasswordHash(hash)).toBe(true);
    await expect(verifyPilotPassword({ password, passwordHash: hash })).resolves.toBe(true);
    await expect(verifyPilotPassword({ password: "wrong-password", passwordHash: hash })).resolves.toBe(false);
  });

  it("rejects weak pilot passwords before provisioning or first-login update", () => {
    expect(validatePilotPassword("short").ok).toBe(false);
    expect(validatePilotPassword("longbutnonumeric").ok).toBe(false);
    expect(validatePilotPassword(PILOT_SEED_TEMPORARY_PASSWORD).ok).toBe(true);
  });

  it("persists the first-login password truth on User", () => {
    const schema = readRepoFile("prisma/schema.prisma");

    expect(schema).toContain("passwordHash");
    expect(schema).toContain("mustChangePassword Boolean");
    expect(schema).toContain("passwordUpdatedAt DateTime?");
  });

  it("forces password rotation before protected pilot routes can open", () => {
    const proxy = readRepoFile("proxy.ts");
    const passwordUpdatePage = readRepoFile("app/(public)/sign-in/password-update/page.tsx");
    const passwordActions = readRepoFile("lib/auth/pilotPasswordActions.ts");

    expect(proxy).toContain("token.mustChangePassword === true");
    expect(proxy).toContain("/sign-in/password-update");
    expect(passwordUpdatePage).toContain("First-login password update");
    expect(passwordActions).toContain("pilot-password-change");
    expect(passwordActions).toContain("mustChangePassword: false");
    expect(passwordActions).toContain("recordOperatorAuditEvent");
  });

  it("keeps admin provisioning audited and hash-only", () => {
    const adminActions = readRepoFile("app/(app)/admin/actions.ts");
    const adminUsersPage = readRepoFile("app/(app)/admin/users/page.tsx");

    expect(adminActions).toContain("createPilotUserAction");
    expect(adminActions).toContain("updatePilotUserPasswordAction");
    expect(adminActions).toContain("provision-pilot-user");
    expect(adminActions).toContain("reset-pilot-password");
    expect(adminActions).toContain("hashPilotPassword");
    expect(adminUsersPage).toContain("Provision pilot account");
    expect(adminUsersPage).toContain("Require password update on first login");
  });
});
