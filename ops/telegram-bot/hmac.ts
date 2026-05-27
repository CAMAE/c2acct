import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC signing for Telegram approval callback_data, for anti-replay / forgery
 * resistance. We sign `${approvalId}:${createdAtMs}` with AGENT_APPROVAL_HMAC_SECRET
 * and keep the first 16 hex chars so `${action}:${approvalId}:${hmac}` stays well
 * under Telegram's 64-byte callback_data limit. Verification recomputes from the
 * stored approval row (its id + createdAt), so a tampered id or signature fails.
 */

const SIGNATURE_LENGTH = 16;

function getSecret(): string {
  const secret = process.env.AGENT_APPROVAL_HMAC_SECRET;
  if (!secret) {
    throw new Error("AGENT_APPROVAL_HMAC_SECRET is not set");
  }
  return secret;
}

export function signApproval(approvalId: string, createdAtMs: number): string {
  return createHmac("sha256", getSecret())
    .update(`${approvalId}:${createdAtMs}`)
    .digest("hex")
    .slice(0, SIGNATURE_LENGTH);
}

export function verifyApproval(approvalId: string, createdAtMs: number, provided: string): boolean {
  const expected = signApproval(approvalId, createdAtMs);
  if (!provided || provided.length !== expected.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
