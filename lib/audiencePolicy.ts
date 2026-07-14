import type { CompanyType, UserRole } from "@prisma/client";

/**
 * Audience policy (B5-4) — the PURE resolution logic behind lib/audienceGuard.ts,
 * import-safe (no next/prisma) so it is unit-testable. See audienceGuard for the
 * layout chokepoint that resolves the session + applies these.
 */

export type PortalAudienceSegment = "firm" | "vendor" | "user" | "consultant" | "admin";

export const AUDIENCE_HOME_PATH: Record<PortalAudienceSegment, string> = {
  firm: "/firm",
  vendor: "/vendor",
  user: "/user",
  consultant: "/consultants",
  admin: "/admin",
};

export type AudienceResolutionInput = {
  role: UserRole;
  companyId: string | null;
  companyType: CompanyType | null;
  isConsultant: boolean;
};

const ADMIN_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(["ADMIN", "OWNER"]);

/**
 * The account's SINGLE home audience — the one portal it is allowed to occupy.
 * Every other portal redirects here (13a strict role→portal wall). Resolution
 * order matters and is security-critical:
 *   1. consultant  → /consultants  (a consultant profile defines the home even
 *      though the account carries no company; this closes the P0 where consultant
 *      creds reached /vendor).
 *   2. company type → /firm | /vendor  (company MEMBERS *and* company OWNER/ADMIN
 *      stay in their own portal — a firm-admin must never be routed to /admin or
 *      allowed into /vendor. Company binding wins over the ADMIN role.)
 *   3. company set but unknown kind → null (never misroute).
 *   4. company-LESS admin/owner → /admin  (a true platform operator).
 *   5. otherwise → /user  (company-less individual).
 * Returns null only when we genuinely cannot resolve a home (unknown company
 * kind) — resolveAudienceRedirectTarget treats null as "stay", so a null NEVER
 * grants access to a portal it wasn't already on.
 */
export function audienceHomeFor(input: AudienceResolutionInput): PortalAudienceSegment | null {
  if (input.isConsultant) return "consultant";
  if (input.companyType === "FIRM") return "firm";
  if (input.companyType === "VENDOR") return "vendor";
  if (input.companyId) return null; // company set but kind unresolved — do not misroute
  if (ADMIN_ROLES.has(input.role)) return "admin"; // company-less platform operator
  return "user"; // true individual (no company)
}

/** Pure: the redirect target for `segment`, or null to stay. */
export function resolveAudienceRedirectTarget(
  input: AudienceResolutionInput,
  segment: PortalAudienceSegment
): string | null {
  const home = audienceHomeFor(input);
  if (!home || home === segment) return null;
  return AUDIENCE_HOME_PATH[home];
}
