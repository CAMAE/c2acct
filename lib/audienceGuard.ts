import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAudienceRedirectTarget, type PortalAudienceSegment } from "@/lib/audiencePolicy";

export type { PortalAudienceSegment } from "@/lib/audiencePolicy";

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

  const [consultant, company] = await Promise.all([
    prisma.consultantProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
    user.companyId
      ? prisma.company.findUnique({ where: { id: user.companyId }, select: { type: true } })
      : Promise.resolve(null),
  ]);

  const target = resolveAudienceRedirectTarget(
    {
      role: user.role,
      companyId: user.companyId,
      companyType: company?.type ?? null,
      isConsultant: Boolean(consultant),
    },
    segment
  );
  if (target) redirect(target);
}
