import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { listForUser, markAllRead, markRead, unreadCount } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";

type SerializedNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  readAt: string | null;
  createdAt: string;
};

const noStore = { headers: { "cache-control": "no-store" } } as const;

/** Recipient-scoped inbox read: the caller's own notifications + unread count. */
export async function GET() {
  if (!isPingsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [items, unread] = await Promise.all([
    listForUser(sessionUser.id, { limit: 50 }),
    unreadCount(sessionUser.id),
  ]);

  const notifications: SerializedNotification[] = items.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    ctaLabel: n.ctaLabel,
    ctaHref: n.ctaHref,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return NextResponse.json({ ok: true, unread, notifications }, noStore);
}

/** Mark one (`{ id }`) or all (`{ all: true }`) of the caller's notifications read. */
export async function POST(req: Request) {
  if (!isPingsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const all = body && typeof body === "object" && (body as { all?: unknown }).all === true;
  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : null;

  if (all) {
    await markAllRead(sessionUser.id);
  } else if (id) {
    await markRead(sessionUser.id, id);
  } else {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, unread: await unreadCount(sessionUser.id) }, noStore);
}
