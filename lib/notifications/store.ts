import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Notification } from "@prisma/client";
import { isKindOptedOut } from "@/lib/notifications/cadence";

/**
 * Notification store (Phase B1, 2026-06-18). The read/write layer the ping
 * system builds on. createNotification respects the user's preference center
 * (in-app toggle + per-kind opt-out) and dedupes one live notification per
 * (recipient, source, kind) so a stalled task never double-pings. Read helpers
 * are recipient-scoped so a user can only ever see/mark their own.
 *
 * Behind PAT_ENABLE_PINGS at the surface level; this lib is inert until a caller
 * (B2 nudge action / B3 trigger engine) invokes it.
 */

function asKindOptOuts(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export type CreateNotificationInput = {
  recipientUserId: string;
  audience: string;
  kind: string;
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  actorUserId?: string | null;
  /** Block 9a: true when Pat (AI) drafted the body — drives the disclosure label. */
  aiGenerated?: boolean;
};

export type CreateNotificationResult =
  | { created: true; notification: Notification }
  | { created: false; reason: "in_app_disabled" | "kind_opted_out" | "duplicate"; notification?: Notification };

export async function createNotification(
  input: CreateNotificationInput
): Promise<CreateNotificationResult> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId: input.recipientUserId },
  });

  if (pref) {
    if (pref.inAppEnabled === false) {
      return { created: false, reason: "in_app_disabled" };
    }
    if (isKindOptedOut(asKindOptOuts(pref.kindOptOuts), input.kind)) {
      return { created: false, reason: "kind_opted_out" };
    }
  }

  // Dedupe: don't resurface an already-live (unread) notification for the same
  // (recipient, source, kind). Only meaningful when a source is attached.
  if (input.sourceType && input.sourceId) {
    const existing = await prisma.notification.findFirst({
      where: {
        recipientUserId: input.recipientUserId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        kind: input.kind,
        readAt: null,
      },
    });
    if (existing) {
      return { created: false, reason: "duplicate", notification: existing };
    }
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        audience: input.audience,
        kind: input.kind,
        title: input.title,
        body: input.body,
        ctaLabel: input.ctaLabel ?? null,
        ctaHref: input.ctaHref ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        actorUserId: input.actorUserId ?? null,
        aiGenerated: input.aiGenerated ?? false,
      },
    });
    return { created: true, notification };
  } catch (error) {
    // Unique-index race on (recipient, source, kind) → treat as duplicate.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { created: false, reason: "duplicate" };
    }
    throw error;
  }
}

export async function listForUser(
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number }
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: { recipientUserId: userId, ...(opts?.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientUserId: userId, readAt: null } });
}

/** Marks one notification read, scoped to its recipient. Returns rows affected. */
export async function markRead(userId: string, notificationId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { recipientUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export type RecordNudgeInput = {
  actorUserId?: string | null;
  recipientUserId: string;
  kind: string;
  sourceType?: string | null;
  sourceId?: string | null;
  manual?: boolean;
};

/** Append an audit row for a nudge (manual or automated). */
export async function recordNudge(input: RecordNudgeInput): Promise<void> {
  await prisma.nudgeEvent.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      recipientUserId: input.recipientUserId,
      kind: input.kind,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      manual: input.manual ?? false,
    },
  });
}
