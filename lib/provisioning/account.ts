import { randomBytes, randomUUID } from "crypto";
import { CompanyType, SubjectKind, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPilotPassword, validatePilotPassword } from "@/lib/auth/passwords";
import { recordOperatorAuditEvent } from "@/lib/operatorAudit";

/**
 * Shared account-provisioning seam: create a firm or vendor organization plus
 * its owner user in one transaction. The /admin/organizations form, the Pilot
 * Ops agent's approval-gated `provisioning.create_account` tool call, and the
 * public /create-account wizard all run through this function, so the surfaces
 * can never drift. `credentialMode` decides the password semantics: "temporary"
 * (admin/agent) enforces a first-login password update; "user-chosen"
 * (self-signup) keeps the password the owner typed.
 *
 * Secret discipline: the password enters as an argument and leaves only as a
 * hash on User.passwordHash. It is never returned, logged, or written to the
 * operator audit trail by this module.
 */

export const PROVISION_ORG_KINDS = ["firm", "vendor"] as const;
export type ProvisionOrgKind = (typeof PROVISION_ORG_KINDS)[number];

export type ProvisionCredentialMode = "temporary" | "user-chosen";

export interface ProvisionAccountRequest {
  orgName: string;
  orgKind: string;
  ownerEmail: string;
  ownerName?: string | null;
}

export interface ProvisionAccountInput extends ProvisionAccountRequest {
  password: string;
  credentialMode: ProvisionCredentialMode;
  /** Admin user id for the web form; null for the agent and self-signup paths. */
  actorUserId: string | null;
  requestedVia: "admin-form" | "pilot-ops-agent" | "self-signup";
  /** Optional onboarding answers (self-signup wizard) recorded on the audit event. */
  profile?: { orgSize?: string | null; primaryGoal?: string | null };
}

export type ProvisionAccountErrorCode =
  | "invalid_org_name"
  | "invalid_org_kind"
  | "invalid_email"
  | "password_policy"
  | "email_exists";

export type ProvisionAccountResult =
  | {
      ok: true;
      companyId: string;
      userId: string;
      orgName: string;
      orgType: CompanyType;
      ownerEmail: string;
    }
  | { ok: false; code: ProvisionAccountErrorCode; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pure request validation (no password, no DB) — reusable by the Telegram command parser. */
export function validateProvisionAccountRequest(
  request: ProvisionAccountRequest
): { ok: true; orgKind: ProvisionOrgKind; orgName: string; ownerEmail: string } | { ok: false; code: ProvisionAccountErrorCode; message: string } {
  const orgName = request.orgName.trim();
  if (!orgName) {
    return { ok: false, code: "invalid_org_name", message: "Organization name is required." };
  }

  const orgKind = request.orgKind.trim().toLowerCase();
  if (!PROVISION_ORG_KINDS.includes(orgKind as ProvisionOrgKind)) {
    return { ok: false, code: "invalid_org_kind", message: 'Organization kind must be "firm" or "vendor".' };
  }

  const ownerEmail = request.ownerEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(ownerEmail)) {
    return { ok: false, code: "invalid_email", message: "Owner email is not a valid email address." };
  }

  return { ok: true, orgKind: orgKind as ProvisionOrgKind, orgName, ownerEmail };
}

export async function provisionOrganizationAccount(
  input: ProvisionAccountInput
): Promise<ProvisionAccountResult> {
  const validated = validateProvisionAccountRequest(input);
  if (!validated.ok) {
    return validated;
  }

  const passwordCheck = validatePilotPassword(input.password);
  if (!passwordCheck.ok) {
    return { ok: false, code: "password_policy", message: passwordCheck.reason ?? "Password rejected." };
  }

  const passwordHash = await hashPilotPassword(input.password);
  const orgType = validated.orgKind === "firm" ? CompanyType.FIRM : CompanyType.VENDOR;
  const ownerName = input.ownerName?.trim() || null;
  const mustChangePassword = input.credentialMode === "temporary";
  const now = new Date();

  const existing = await prisma.user.findUnique({
    where: { email: validated.ownerEmail },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      code: "email_exists",
      message: `A user with email ${validated.ownerEmail} already exists. Use /admin/users to manage existing accounts.`,
    };
  }

  const { company, user } = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        id: randomUUID(),
        name: validated.orgName,
        type: orgType,
        updatedAt: now,
      },
      select: { id: true, name: true, type: true },
    });

    await tx.subject.create({
      data: {
        id: randomUUID(),
        key: `company:${company.id}`,
        displayName: company.name,
        kind: SubjectKind.ORGANIZATION,
        companyId: company.id,
        updatedAt: now,
      },
    });

    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        email: validated.ownerEmail,
        name: ownerName,
        role: UserRole.OWNER,
        companyId: company.id,
        passwordHash,
        mustChangePassword,
        passwordUpdatedAt: now,
        updatedAt: now,
      },
      select: { id: true, email: true },
    });

    await recordOperatorAuditEvent(
      {
        actorUserId: input.actorUserId,
        action: "provision-organization-account",
        entityType: "organization",
        entityId: company.id,
        summary: `Provisioned ${validated.orgKind} organization ${company.name} with owner ${user.email}`,
        details: {
          orgKind: validated.orgKind,
          ownerUserId: user.id,
          ownerEmail: user.email,
          requestedVia: input.requestedVia,
          passwordSource: input.credentialMode === "temporary" ? "temporary-password" : "user-chosen-password",
          mustChangePassword,
          ...(input.profile?.orgSize ? { orgSize: input.profile.orgSize } : {}),
          ...(input.profile?.primaryGoal ? { primaryGoal: input.profile.primaryGoal } : {}),
        },
      },
      tx
    );

    return { company, user };
  });

  return {
    ok: true,
    companyId: company.id,
    userId: user.id,
    orgName: company.name,
    orgType: company.type,
    ownerEmail: user.email,
  };
}

const PASSWORD_LOWER = "abcdefghjkmnpqrstuvwxyz";
const PASSWORD_UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const PASSWORD_DIGITS = "23456789";
const PASSWORD_ALL = PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGITS;
const PASSWORD_LENGTH = 16;

/**
 * Generate a temporary password that satisfies validatePilotPassword (≥12 chars,
 * lower + upper + digit). Used by the agent path, where no human types one.
 */
export function generateTemporaryPassword(): string {
  const pick = (alphabet: string, count: number) => {
    const bytes = randomBytes(count);
    let out = "";
    for (let i = 0; i < count; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  };

  const required = pick(PASSWORD_LOWER, 1) + pick(PASSWORD_UPPER, 1) + pick(PASSWORD_DIGITS, 1);
  const filler = pick(PASSWORD_ALL, PASSWORD_LENGTH - required.length);
  const combined = (required + filler).split("");

  // Fisher–Yates shuffle so the guaranteed-class characters aren't positional.
  const shuffleBytes = randomBytes(combined.length);
  for (let i = combined.length - 1; i > 0; i -= 1) {
    const j = shuffleBytes[i] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}
