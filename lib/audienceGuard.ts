import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import {
  AUDIENCE_HOME_PATH,
  audienceHomeFor,
  type PortalAudienceSegment,
} from "@/lib/audiencePolicy";

export type { PortalAudienceSegment } from "@/lib/audiencePolicy";

type AudienceUser = { id: string; role: UserRole; companyId: string | null };

/**
 * Resolve an account's single home audience (consultant profile + company kind
 * lookup, then the pure policy). Shared by the route chokepoint (enforceAudience)
 * and the sign-in hub so both wall the same way. Returns null only for an
 * unresolved company kind (never misroute).
 */
export async function resolveUserAudienceHome(user: AudienceUser): Promise<PortalAudienceSegment | null> {
  const [consultant, company] = await Promise.all([
    prisma.consultantProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
    user.companyId
      ? prisma.company.findUnique({ where: { id: user.companyId }, select: { type: true } })
      : Promise.resolve(null),
  ]);
  return audienceHomeFor({
    role: user.role,
    companyId: user.companyId,
    companyType: company?.type ?? null,
    isConsultant: Boolean(consultant),
  });
}

/**
 * Audience guard (B5-4) — ONE chokepoint applied in each customer portal segment
 * layout so a signed-in account on the WRONG portal is redirected server-side to
 * its own portal home, instead of rendering a confusing empty state (live repro:
 * a firm elite account served /vendor showing "Vendor company: Kirkland Reyes,
 * Products: 0"). Admin + consultant are unaffected (they legitimately view
 * multiple portals). Unauthenticated requests pass through so pages keep their own
 * sign-in redirects; cross-tenant 404 semantics are unchanged (this only redirects
 * wrong-AUDIENCE, never wrong-tenant-same-audience). Pure logic: lib/audiencePolicy.ts.
 */
export async function enforceAudience(segment: PortalAudienceSegment): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  const home = await resolveUserAudienceHome(user);
  if (home && home !== segment) redirect(AUDIENCE_HOME_PATH[home]);
}
