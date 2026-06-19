import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/authz";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { resolvePortalExperience } from "@/lib/portalVisibility";

/**
 * Server-side audience resolution for Pat (Phase A, 2026-06-18).
 *
 * Maps the authenticated session user to the audience string + scope that
 * lib/patAssistant/retrieveHelp.ts enforces. This is the trust boundary: the
 * audience is derived here from the session and entitlements, NEVER from anything
 * the client sends.
 *
 *   - admin/owner       → "admin",      unrestricted (may ask anything across help)
 *   - consultant        → "consultant", unrestricted (per spec: ask anything)
 *   - everyone else      → portal audience (vendor/firm/individual/...), STRICT
 *
 * "unrestricted" still only ever reaches kind = 'help_doc' — it never exposes the
 * internal repo_doc/audit_log/dream_state corpus.
 */
export type PatAudienceResolution = {
  audience: string;
  unrestricted: boolean;
};

export async function resolvePatAudience(
  sessionUser: SessionUser | null
): Promise<PatAudienceResolution | null> {
  if (!sessionUser) {
    return null;
  }

  if (isAdminRole(sessionUser.role)) {
    return { audience: "admin", unrestricted: true };
  }

  const consultant = await getConsultantAccessStateForUser(sessionUser);
  if (consultant) {
    return { audience: "consultant", unrestricted: true };
  }

  const experience = await resolvePortalExperience(sessionUser);
  return { audience: experience.audience, unrestricted: false };
}
