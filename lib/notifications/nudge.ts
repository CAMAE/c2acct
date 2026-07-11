import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/authz";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { createNotification, recordNudge } from "@/lib/notifications/store";

/**
 * Manual nudge write path (Phase B2b, 2026-06-18). A consultant sends a friendly
 * reminder to a firm/vendor they manage; an admin may nudge any company. The
 * relationship message is templated (deterministic — no LLM in the write path);
 * Pat-composed copy is a later enhancement.
 *
 * Authorization is resolved server-side from the session + ecosystem scope
 * (mirrors requireConsultantCompanyAccess), never from the client.
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

function buildNudgeMessage(
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

export type SendNudgeResult =
  | { ok: true; recipients: number; created: number }
  | { ok: false; reason: "forbidden" | "no_recipients" };

/**
 * Send a manual nudge to every user of the target company. Each recipient goes
 * through the store's preference + dedupe gate; an audit row is recorded per
 * recipient regardless (the actor did nudge).
 */
export async function sendCompanyNudge(input: {
  actor: SessionUser;
  companyId: string;
  audience: NudgeAudience;
}): Promise<SendNudgeResult> {
  const authority = await authorizeCompanyNudge(input.actor, input.companyId);
  if (authority.kind === "denied") {
    return { ok: false, reason: "forbidden" };
  }

  const recipientIds = await getCompanyRecipientUserIds(input.companyId);
  if (recipientIds.length === 0) {
    return { ok: false, reason: "no_recipients" };
  }

  const fromLabel = authority.kind === "consultant" ? authority.consultantLabel : "A Patalign operator";
  const message = buildNudgeMessage(input.audience, fromLabel);
  const kind = NUDGE_KIND[input.audience];

  let created = 0;
  for (const recipientUserId of recipientIds) {
    const result = await createNotification({
      recipientUserId,
      audience: input.audience,
      kind,
      title: message.title,
      body: message.body,
      ctaLabel: message.ctaLabel,
      ctaHref: message.ctaHref,
      sourceType: "Company",
      sourceId: input.companyId,
      actorUserId: input.actor.id,
      // Block 9a: the nudge body is a Pat-drafted template a person reviews + sends.
      aiGenerated: true,
    });
    if (result.created) {
      created += 1;
    }
    await recordNudge({
      actorUserId: input.actor.id,
      recipientUserId,
      kind,
      sourceType: "Company",
      sourceId: input.companyId,
      manual: true,
    });
  }

  return { ok: true, recipients: recipientIds.length, created };
}
