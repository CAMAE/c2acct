import { createHash, randomBytes } from "crypto";

export const DEFAULT_INVITE_MAX_CLAIMS = 1;
export const DEFAULT_INVITE_TTL_DAYS = 14;

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(normalizeInviteCode(code)).digest("hex");
}

export function generateInviteCode() {
  const raw = randomBytes(10).toString("hex").toUpperCase();
  return `AAE-${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}`;
}

export function getDefaultInviteExpiry(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_INVITE_TTL_DAYS);
  return expiresAt;
}

export function isInviteExpired(expiresAt: Date | string | null | undefined, now = new Date()) {
  if (!expiresAt) {
    return false;
  }

  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() <= now.getTime();
}

export type InviteCodeClaimSnapshot = {
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "REVOKED";
  expiresAt?: Date | string | null;
  claimCount: number;
  maxClaims: number;
};

export function getInviteTerminalState(
  inviteCode: InviteCodeClaimSnapshot,
  now = new Date()
): "REVOKED" | "EXPIRED" | "EXHAUSTED" | null {
  if (inviteCode.status === "REVOKED") {
    return "REVOKED";
  }

  if (isInviteExpired(inviteCode.expiresAt, now)) {
    return "EXPIRED";
  }

  if (inviteCode.status === "EXHAUSTED" || inviteCode.claimCount >= inviteCode.maxClaims) {
    return "EXHAUSTED";
  }

  return null;
}

export function isInviteClaimSatisfied(input: {
  existingRelationship:
    | {
        status: "ACTIVE" | "PAUSED" | "REVOKED";
        launchMode: "PRIVATE_LAUNCH";
        productAccessMode: "NONE" | "ALL_PRODUCTS";
      }
    | null
    | undefined;
  inviteCode: Pick<InviteCodeClaimSnapshot, "status"> & {
    launchMode: "PRIVATE_LAUNCH";
    productAccessMode: "NONE" | "ALL_PRODUCTS";
  };
}) {
  const relationship = input.existingRelationship;
  if (!relationship) {
    return false;
  }

  return (
    relationship.status === "ACTIVE" &&
    relationship.launchMode === input.inviteCode.launchMode &&
    relationship.productAccessMode === input.inviteCode.productAccessMode
  );
}
