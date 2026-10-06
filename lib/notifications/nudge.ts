import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/authz";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { getFirmAssessmentProgress, summarizeFirmAlignmentProgress } from "@/lib/firmPat";
import { guideWord } from "@/lib/roleWords";

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

/**
 * pattern box A (R60, R-O, audit G3): the firm's module progress, read from the
 * hub's reader (lib/firmPat getFirmAssessmentProgress), so a firm at 5 of 5 never
 * receives a "finish your modules" nudge. Null when progress cannot be read.
 */
export type NudgeModuleProgress = { completedModules: number; totalModules: number };

export async function readFirmModuleProgressForNudge(companyId: string): Promise<NudgeModuleProgress | null> {
  try {
    const summary = summarizeFirmAlignmentProgress(await getFirmAssessmentProgress(companyId));
    return { completedModules: summary.completedModules, totalModules: summary.totalModules };
  } catch {
    return null;
  }
}

export function buildNudgeMessage(
  audience: NudgeAudience,
  fromLabel: string,
  progress: NudgeModuleProgress | null = null
): { title: string; body: string; ctaLabel: string; ctaHref: string } {
  const title = `A friendly reminder from your Patalign ${guideWord("consultant")}`;
  if (audience === "vendor") {
    return {
      title,
      body: `${fromLabel} sent a nudge: when you have a moment, please finish your product self-assessment so your alignment stays current.`,
      ctaLabel: "Open your product assessment",
      ctaHref: "/vendor/product-assessment",
    };
  }
  const complete = progress !== null && progress.totalModules > 0 && progress.completedModules >= progress.totalModules;
  if (complete) {
    // R60 G3: a complete firm gets the refresh nudge, never a completion nudge.
    return {
      title,
      body: `${fromLabel} sent a nudge: all ${progress.totalModules} of your alignment modules are in. When you have a moment, please refresh your alignment assessment so your briefing and benchmark position stay current.`,
      ctaLabel: "Refresh your alignment assessment",
      ctaHref: "/firm/alignment-assessment",
    };
  }
  const remaining = progress ? progress.totalModules - progress.completedModules : null;
  return {
    title,
    body:
      remaining !== null && remaining > 0
        ? `${fromLabel} sent a nudge: ${remaining} of your ${progress!.totalModules} alignment modules ${remaining === 1 ? "is" : "are"} still open. When you have a moment, please finish your alignment assessment modules so your briefing stays current.`
        : `${fromLabel} sent a nudge: when you have a moment, please finish your alignment assessment modules so your briefing stays current.`,
    ctaLabel: "Open your alignment assessment",
    ctaHref: "/firm/alignment-assessment",
  };
}

/**
 * The sender phrase a firm reads in the nudge body. A generic role phrase — not
 * the raw consultant label — so it always reads cleanly ("Your consultant sent a
 * nudge…") and never leaks a demo/account label. (16c copy fix.)
 */
export function nudgeFromLabel(authority: NudgeAuthority): string {
  return authority.kind === "consultant" ? "Your consultant" : "A Patalign operator";
}

// NOTE: there is deliberately NO sendCompanyNudge here. Turning a Pat-drafted
// nudge into a firm Notification happens ONLY inside decideNudgeDraft's approve
// branch (lib/notifications/nudgeDraft.ts), after a consultant approves. Any
// re-introduction of a direct-send helper is a HITL violation — a contract test
// asserts this file exports no auto-send path.
