import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/authz";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";

/**
 * Nudge authorization + message helpers (Phase B2b → 16c). A consultant may nudge
 * a firm/vendor they manage; an admin may nudge any company. The message is a
 * deterministic Pat-drafted template.
 *
 * 16c HITL rule: there is NO auto-send here. A nudge only reaches a firm through
 * a Pat-drafted DRAFT that a consultant explicitly approves — see
 * [[lib/notifications/nudgeDraft]] `decideNudgeDraft` (the single send path).
 * This module now only resolves authorization, recipients, and the draft body.
 *
 * Authorization is resolved server-side from the session + ecosystem scope,
 * never from the client.
 */

export type NudgeAudience = "firm" | "vendor";

export type NudgeAuthority =
  | { kind: "admin" }
  | { kind: "consultant"; consultantLabel: string }
  | { kind: "denied" };

export const NUDGE_KIND: Record<NudgeAudience, string> = {
  firm: "CONSULTANT_FIRM_NUDGE",
  vendor: "CONSULTANT_VENDOR_NUDGE",
};

/** Can `actor` nudge this company? Admins always; consultants only in-scope. */
export async function authorizeCompanyNudge(
  actor: SessionUser,
  companyId: string
): Promise<NudgeAuthority> {
  if (isAdminRole(actor.role)) {
    return { kind: "admin" };
  }
  const consultant = await getConsultantAccessStateForUser(actor);
  if (consultant) {
    const inScope = consultant.ecosystems.some(
      (scope) =>
        scope.vendorCompanyId === companyId ||
        scope.firmCompanies.some((firm) => firm.id === companyId)
    );
    if (inScope) {
      return { kind: "consultant", consultantLabel: consultant.consultantLabel };
    }
  }
  return { kind: "denied" };
}

export async function getCompanyRecipientUserIds(companyId: string): Promise<string[]> {
  const users = await prisma.user.findMany({ where: { companyId }, select: { id: true } });
  return users.map((u) => u.id);
}

export function buildNudgeMessage(
  audience: NudgeAudience,
  fromLabel: string
): { title: string; body: string; ctaLabel: string; ctaHref: string } {
  if (audience === "vendor") {
    return {
      title: "A friendly reminder from your Patalign consultant",
      body: `${fromLabel} sent a nudge: when you have a moment, please finish your product self-assessment so your alignment stays current.`,
      ctaLabel: "Open your product assessment",
      ctaHref: "/vendor/product-assessment",
    };
  }
  return {
    title: "A friendly reminder from your Patalign consultant",
    body: `${fromLabel} sent a nudge: when you have a moment, please finish your alignment assessment modules so your briefing stays current.`,
    ctaLabel: "Open your alignment assessment",
    ctaHref: "/firm/alignment-assessment",
  };
}

/**
 * The label a firm sees as the nudge sender: the consultant's name, or a generic
 * operator label for an admin-issued draft.
 */
export function nudgeFromLabel(authority: NudgeAuthority): string {
  return authority.kind === "consultant" ? authority.consultantLabel : "A Patalign operator";
}

// NOTE: there is deliberately NO sendCompanyNudge here. Turning a Pat-drafted
// nudge into a firm Notification happens ONLY inside decideNudgeDraft's approve
// branch (lib/notifications/nudgeDraft.ts), after a consultant approves. Any
// re-introduction of a direct-send helper is a HITL violation — a contract test
// asserts this file exports no auto-send path.
