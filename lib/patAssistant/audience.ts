import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/authz";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { resolvePortalExperience, type PortalAudience } from "@/lib/portalVisibility";
import { NO_MEMBERSHIP, resolveCurrentMembership } from "@/lib/membership";
import type { MembershipAudience } from "@/lib/membershipContext";
import { PUBLIC_AUDIENCE } from "@/lib/patAssistant/corpusAccess";

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
 *
 * The resolution also carries the viewer's MEMBERSHIP PLAN (corpus program),
 * which retrieveHelp turns into a depth-tier allowlist. It is resolved here, at
 * the same trust boundary as the audience, for the same reason: both decide what
 * the SQL wall admits, so both must come from the session and never the client.
 *
 * This resolver NEVER returns the `public` audience. `public` marks content for
 * an unauthenticated entry path; an authenticated session producing it would be
 * an audience escalation. Asserted by contract test, and by the assertion below.
 */
export type PatAudienceResolution = {
  audience: string;
  unrestricted: boolean;
  /** Server-resolved membership plan, or NO_MEMBERSHIP. Drives the depth tier. */
  membershipPlan: string;
};

/**
 * COMPILE-TIME proof that no portal audience can ever be the reserved `public`
 * token (corpus program (b)).
 *
 * A runtime `if (audience === PUBLIC_AUDIENCE) return null` was written here
 * first, and TypeScript rejected it as unreachable — which is a stronger result
 * than the check itself. This encodes that: if anyone ever adds "public" to
 * PortalAudience, `Extract<...>` stops being `never` and the build fails at this
 * line, naming exactly what went wrong. A guarantee the compiler enforces beats
 * a branch that can only be tested by making it reachable.
 */
type PublicIsNotAPortalAudience =
  Extract<PortalAudience, typeof PUBLIC_AUDIENCE> extends never ? true : never;
const PUBLIC_AUDIENCE_IS_RESERVED: PublicIsNotAPortalAudience = true;
void PUBLIC_AUDIENCE_IS_RESERVED;

/** Audiences that map to a billable membership context. */
const MEMBERSHIP_AUDIENCES: readonly string[] = ["vendor", "firm", "individual"];

/**
 * The viewer's plan, or NO_MEMBERSHIP.
 *
 * Failure resolves to NO_MEMBERSHIP rather than throwing: a membership lookup
 * that errors must degrade to LESS access, never more, and never to a 500 on a
 * help question. An audience with no membership concept (consultant, admin,
 * invitee) has no plan by construction — their reach comes from `unrestricted`,
 * which deliberately does not include paid depth.
 */
async function resolveMembershipPlan(
  sessionUser: SessionUser,
  audience: string
): Promise<string> {
  if (!MEMBERSHIP_AUDIENCES.includes(audience)) {
    return NO_MEMBERSHIP;
  }
  try {
    const { membership } = await resolveCurrentMembership(
      sessionUser,
      audience as MembershipAudience
    );
    return membership.plan;
  } catch {
    return NO_MEMBERSHIP;
  }
}

export async function resolvePatAudience(
  sessionUser: SessionUser | null
): Promise<PatAudienceResolution | null> {
  if (!sessionUser) {
    return null;
  }

  if (isAdminRole(sessionUser.role)) {
    return { audience: "admin", unrestricted: true, membershipPlan: NO_MEMBERSHIP };
  }

  const consultant = await getConsultantAccessStateForUser(sessionUser);
  if (consultant) {
    return { audience: "consultant", unrestricted: true, membershipPlan: NO_MEMBERSHIP };
  }

  const experience = await resolvePortalExperience(sessionUser);
  const audience = experience.audience;

  return {
    audience,
    unrestricted: false,
    membershipPlan: await resolveMembershipPlan(sessionUser, audience),
  };
}
