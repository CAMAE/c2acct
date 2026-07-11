import type { CompanyType, UserRole } from "@prisma/client";

/**
 * Audience policy (B5-4) — the PURE resolution logic behind lib/audienceGuard.ts,
 * import-safe (no next/prisma) so it is unit-testable. See audienceGuard for the
 * layout chokepoint that resolves the session + applies these.
 */

export type PortalAudienceSegment = "firm" | "vendor" | "user";

export const AUDIENCE_HOME_PATH: Record<PortalAudienceSegment, string> = {
  firm: "/firm",
  vendor: "/vendor",
  user: "/user",
};

export type AudienceResolutionInput = {
  role: UserRole;
  companyId: string | null;
  companyType: CompanyType | null;
  isConsultant: boolean;
};

const ADMIN_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(["ADMIN"]);

/**
 * The account's home audience, or null when it should NOT be audience-gated
 * (admin, consultant, or an unresolved company kind — never misroute).
 */
export function audienceHomeFor(input: AudienceResolutionInput): PortalAudienceSegment | null {
  if (ADMIN_ROLES.has(input.role)) return null; // admin bypass
  if (input.isConsultant) return null; // consultant bypass
  if (!input.companyId) return "user"; // true individual (no company)
  if (input.companyType === "FIRM") return "firm";
  if (input.companyType === "VENDOR") return "vendor";
  return null; // unknown company kind — do not misroute
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
