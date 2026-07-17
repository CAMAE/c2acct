import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/authz";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { createNotification, recordNudge } from "@/lib/notifications/store";
import {
  authorizeCompanyNudge,
  buildNudgeMessage,
  getCompanyRecipientUserIds,
  nudgeFromLabel,
  NUDGE_KIND,
  type NudgeAudience,
} from "@/lib/notifications/nudge";

/**
 * 16c — Pat-drafted nudges + consultant approval queue. HITL is absolute:
 *
 *   Pat drafts  →  consultant approves / edits / dismisses  →  only THEN a
 *   Notification reaches the firm.
 *
 * `decideNudgeDraft`'s approve branch is the ONE and ONLY place in the codebase
 * that turns a nudge draft into a firm-facing Notification. `createNudgeDraft`
 * never sends; dismiss never sends. Every draft is aiGenerated (disclosure on
 * every surface that renders it). A contract test pins that no other module
 * creates a CONSULTANT_FIRM_NUDGE / CONSULTANT_VENDOR_NUDGE notification.
 */

export type CreateDraftResult =
  | { ok: true; draftId: string; created: boolean }
  | { ok: false; reason: "forbidden" };

/**
 * Draft a Pat-composed nudge for a firm/vendor the actor manages. Idempotent per
 * (companyId, audience): a target never accumulates duplicate PENDING drafts, so
 * the approval queue shows one candidate per firm. NEVER creates a Notification.
 */
export async function createNudgeDraft(input: {
  actor: SessionUser;
  companyId: string;
  audience: NudgeAudience;
}): Promise<CreateDraftResult> {
  const authority = await authorizeCompanyNudge(input.actor, input.companyId);
  if (authority.kind === "denied") {
    return { ok: false, reason: "forbidden" };
  }

  const existing = await prisma.nudgeDraft.findFirst({
    where: { companyId: input.companyId, audience: input.audience, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, draftId: existing.id, created: false };
  }

  const message = buildNudgeMessage(input.audience, nudgeFromLabel(authority));
  const draft = await prisma.nudgeDraft.create({
    data: {
      actorUserId: input.actor.id,
      companyId: input.companyId,
      audience: input.audience,
      title: message.title,
      body: message.body,
      ctaLabel: message.ctaLabel,
      ctaHref: message.ctaHref,
      aiGenerated: true,
      status: "PENDING",
    },
    select: { id: true },
  });
  return { ok: true, draftId: draft.id, created: true };
}

export type PendingNudgeDraft = {
  id: string;
  companyId: string;
  companyName: string;
  audience: NudgeAudience;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  aiGenerated: boolean;
  createdAt: string;
};

/** The company ids the actor may act on: all for admins, ecosystem scope for consultants. */
async function actorScopeCompanyIds(actor: SessionUser): Promise<{ all: boolean; ids: Set<string> }> {
  if (isAdminRole(actor.role)) return { all: true, ids: new Set() };
  const consultant = await getConsultantAccessStateForUser(actor);
  const ids = new Set<string>();
  if (consultant) {
    for (const scope of consultant.ecosystems) {
      if (scope.vendorCompanyId) ids.add(scope.vendorCompanyId);
      for (const firm of scope.firmCompanies) ids.add(firm.id);
    }
  }
  return { all: false, ids };
}

/** The PENDING drafts the actor is authorized to decide, newest first. */
export async function listPendingNudgeDrafts(actor: SessionUser): Promise<PendingNudgeDraft[]> {
  const scope = await actorScopeCompanyIds(actor);
  if (!scope.all && scope.ids.size === 0) return [];

  const drafts = await prisma.nudgeDraft.findMany({
    where: {
      status: "PENDING",
      ...(scope.all ? {} : { companyId: { in: [...scope.ids] } }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyId: true,
      audience: true,
      title: true,
      body: true,
      ctaLabel: true,
      ctaHref: true,
      aiGenerated: true,
      createdAt: true,
      Company: { select: { name: true } },
    },
  });

  return drafts.map((d) => ({
    id: d.id,
    companyId: d.companyId,
    companyName: d.Company?.name ?? d.companyId,
    audience: d.audience as NudgeAudience,
    title: d.title,
    body: d.body,
    ctaLabel: d.ctaLabel,
    ctaHref: d.ctaHref,
    aiGenerated: d.aiGenerated,
    createdAt: d.createdAt.toISOString(),
  }));
}

export type DecideDraftResult =
  | { ok: true; status: "APPROVED" | "DISMISSED"; recipientsNotified: number }
  | { ok: false; reason: "forbidden" | "not_found" | "already_decided" };

/**
 * The consultant's decision on a draft — the ONLY path that can send a nudge.
 * approve → (optional edit applied →) one Notification per firm user; dismiss →
 * nothing sent. Idempotent: a draft that is already APPROVED/DISMISSED is never
 * re-sent. Authorization is re-checked server-side against the actor's scope.
 */
export async function decideNudgeDraft(input: {
  actor: SessionUser;
  draftId: string;
  decision: "approve" | "dismiss";
  title?: string;
  body?: string;
}): Promise<DecideDraftResult> {
  const draft = await prisma.nudgeDraft.findUnique({ where: { id: input.draftId } });
  if (!draft) return { ok: false, reason: "not_found" };

  const authority = await authorizeCompanyNudge(input.actor, draft.companyId);
  if (authority.kind === "denied") return { ok: false, reason: "forbidden" };
  if (draft.status !== "PENDING") return { ok: false, reason: "already_decided" };

  if (input.decision === "dismiss") {
    await prisma.nudgeDraft.update({
      where: { id: draft.id },
      data: { status: "DISMISSED", decidedByUserId: input.actor.id, decidedAt: new Date() },
    });
    return { ok: true, status: "DISMISSED", recipientsNotified: 0 };
  }

  // Approve: apply any consultant edits, then SEND — the single send path.
  const finalTitle = input.title?.trim() || draft.title;
  const finalBody = input.body?.trim() || draft.body;
  const edited = finalTitle !== draft.title || finalBody !== draft.body;
  const audience = draft.audience as NudgeAudience;
  const kind = NUDGE_KIND[audience] ?? NUDGE_KIND.firm;

  const recipientIds = await getCompanyRecipientUserIds(draft.companyId);
  for (const recipientUserId of recipientIds) {
    await createNotification({
      recipientUserId,
      audience: draft.audience,
      kind,
      title: finalTitle,
      body: finalBody,
      ctaLabel: draft.ctaLabel,
      ctaHref: draft.ctaHref,
      // Source is the approved draft, so each approved nudge is a distinct row and
      // re-approving the same draft dedupes (idempotent send).
      sourceType: "NudgeDraft",
      sourceId: draft.id,
      actorUserId: draft.actorUserId,
      aiGenerated: draft.aiGenerated,
    });
    await recordNudge({
      actorUserId: input.actor.id,
      recipientUserId,
      kind,
      sourceType: "NudgeDraft",
      sourceId: draft.id,
      manual: true,
    });
  }

  await prisma.nudgeDraft.update({
    where: { id: draft.id },
    data: {
      status: "APPROVED",
      edited,
      title: finalTitle,
      body: finalBody,
      decidedByUserId: input.actor.id,
      decidedAt: new Date(),
      recipientsNotified: recipientIds.length,
    },
  });
  return { ok: true, status: "APPROVED", recipientsNotified: recipientIds.length };
}
