/**
 * Pat AI assistant opt-in consent (Elite Sprint Block A, 2026-07-07).
 *
 * The single source of truth for "may this user see / talk to Pat?". Default
 * OFF: no row, or optedIn=false, means Pat does not render and /api/pat returns
 * 404. This governs ONLY the AI assistant surface — never platform data, scores,
 * or aggregated benchmarks, which are covered by the ToS/Privacy Policy accepted
 * at sign-up. Every change is written to the operator audit log.
 *
 * Fail-closed: any read error (including the table missing before migrations
 * land) resolves to "not consented", so a misconfiguration keeps Pat dark rather
 * than exposing it.
 */
import prisma from "@/lib/prisma";
import { recordOperatorAuditEvent } from "@/lib/operatorAudit";
import { isPrismaMissingSchemaError, warnPrismaCompatibilityOnce } from "@/lib/prisma-compat";

/**
 * Bump when the consent copy materially changes so we can tell which version a
 * user agreed to. Mirrors the copy shipped in PatConsentPanel.tsx / proposal §1.
 */
export const PAT_CONSENT_VERSION = "2026-07-07.v1";

export type PatConsentState = {
  optedIn: boolean;
  consentVersion: string | null;
  grantedAt: Date | null;
  revokedAt: Date | null;
};

const CONSENT_OFF: PatConsentState = {
  optedIn: false,
  consentVersion: null,
  grantedAt: null,
  revokedAt: null,
};

/** Current consent state for a user. Fails closed (opted out) on any read error. */
export async function getConsent(userId: string): Promise<PatConsentState> {
  if (!userId) {
    return { ...CONSENT_OFF };
  }
  try {
    const row = await prisma.aiAssistantConsent.findUnique({ where: { userId } });
    if (!row) {
      return { ...CONSENT_OFF };
    }
    return {
      optedIn: row.optedIn,
      consentVersion: row.consentVersion,
      grantedAt: row.grantedAt,
      revokedAt: row.revokedAt,
    };
  } catch (error) {
    if (isPrismaMissingSchemaError(error)) {
      warnPrismaCompatibilityOnce(
        "pat-consent-missing",
        "AiAssistantConsent table is missing in the database. Pat stays opt-out (off) for every user until Prisma migrations are applied."
      );
      return { ...CONSENT_OFF };
    }
    throw error;
  }
}

/** Fail-closed boolean the mount + /api/pat gate on. */
export async function hasPatConsent(userId: string): Promise<boolean> {
  return (await getConsent(userId)).optedIn;
}

/**
 * Record a user's opt-in/opt-out. Upserts the row, stamps grant/revoke time, and
 * writes an operator audit event. Opting in captures the current consent version;
 * opting out preserves the historical grant but flips optedIn=false + revokedAt.
 */
export async function setConsent(userId: string, optedIn: boolean): Promise<PatConsentState> {
  const now = new Date();
  const row = await prisma.aiAssistantConsent.upsert({
    where: { userId },
    create: optedIn
      ? { userId, optedIn: true, consentVersion: PAT_CONSENT_VERSION, grantedAt: now }
      : { userId, optedIn: false, revokedAt: now },
    update: optedIn
      ? { optedIn: true, consentVersion: PAT_CONSENT_VERSION, grantedAt: now, revokedAt: null }
      : { optedIn: false, revokedAt: now },
  });

  await recordOperatorAuditEvent({
    actorUserId: userId,
    action: optedIn ? "pat-consent-grant" : "pat-consent-revoke",
    entityType: "ai_assistant_consent",
    entityId: userId,
    summary: `Pat assistant consent ${optedIn ? "granted" : "revoked"} by user ${userId}`,
    details: { optedIn, consentVersion: optedIn ? PAT_CONSENT_VERSION : null },
  });

  return {
    optedIn: row.optedIn,
    consentVersion: row.consentVersion,
    grantedAt: row.grantedAt,
    revokedAt: row.revokedAt,
  };
}
