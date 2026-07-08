import { notFound, redirect } from "next/navigation";

import NotificationInboxList, {
  type InboxItem,
} from "@/app/components/notifications/NotificationInboxList";
import { getSessionUser } from "@/lib/auth/session";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { listForUser } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";

/**
 * Full notification inbox — the "view all" destination from the header bell
 * (Sprint 4 M3). Recipient-scoped: shows only the signed-in user's own
 * notifications. Gated on PAT_ENABLE_PINGS (404 while dark).
 */
export default async function NotificationsPage() {
  if (!isPingsEnabled()) {
    notFound();
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in");
  }

  const rows = await listForUser(sessionUser.id, { limit: 200 });
  const items: InboxItem[] = rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    ctaLabel: n.ctaLabel,
    ctaHref: n.ctaHref,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="pat-shell-frame w-full py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--shell-ink)]">Notifications</h1>
        <p className="mt-1 text-sm text-[var(--shell-muted)]">
          Everything Pat has flagged for you, newest first.
        </p>
        <div className="mt-6">
          <NotificationInboxList initialItems={items} />
        </div>
      </div>
    </div>
  );
}
