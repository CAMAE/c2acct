"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * In-app notification center (Phase B2a, 2026-06-18). A bell launcher (bottom-
 * left, opposite the Pat widget) with an unread badge and a panel that lists the
 * signed-in user's notifications and marks them read. Read-only inbox — the nudge
 * write path lands in B2b. Dependency-free (React only); no client storage.
 * Mounted only when PAT_ENABLE_PINGS is on (see NotificationCenterMount).
 */

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  readAt: string | null;
  createdAt: string;
};

type InboxData = { notifications: Notification[]; unread: number };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Fetch helper — returns data, never calls setState (so effects stay clean). */
async function fetchInbox(): Promise<InboxData | null> {
  try {
    const res = await fetch("/api/notifications", { headers: { "cache-control": "no-store" } });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.ok) return null;
    return { notifications: data.notifications ?? [], unread: data.unread ?? 0 };
  } catch {
    return null;
  }
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  // Refreshes the badge on mount and the list whenever the panel opens/closes.
  // setState runs only after the awaited fetch (never synchronously in the effect).
  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await fetchInbox();
      if (active && data) {
        setItems(data.notifications);
        setUnread(data.unread);
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  const refresh = useCallback(async () => {
    const data = await fetchInbox();
    if (data) {
      setItems(data.notifications);
      setUnread(data.unread);
    }
  }, []);

  async function mark(id: string | null, all = false) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { id }),
      });
      await refresh();
    } catch {
      /* silent */
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="fixed bottom-5 left-5 z-50 inline-flex items-center justify-center rounded-full border border-[var(--shell-border)] bg-white px-3.5 py-3 text-sm font-semibold text-[var(--shell-ink)] shadow-lg hover:bg-[var(--shell-panel-soft)]"
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 ? (
          <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--brand-c2-blue)] px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
    );
  }

  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="fixed bottom-5 left-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-[var(--shell-border)] px-4 py-3">
        <div className="text-sm font-semibold text-[var(--shell-ink)]">Notifications</div>
        <div className="flex items-center gap-2">
          {hasUnread ? (
            <button
              type="button"
              onClick={() => void mark(null, true)}
              className="text-[11px] font-semibold text-[var(--brand-c2-blue)] hover:underline"
            >
              Mark all read
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
            className="rounded-full px-2 py-1 text-sm text-[var(--shell-muted)] hover:bg-[var(--shell-panel-soft)]"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {items.length === 0 ? (
          <p className="px-1 text-sm leading-6 text-[var(--shell-muted)]">
            You&apos;re all caught up — no notifications yet.
          </p>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => void mark(n.id)}
              className={`block w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                n.readAt
                  ? "border-[var(--shell-border)] bg-white"
                  : "border-[var(--brand-c2-blue)] bg-[var(--shell-panel-soft)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--shell-ink)]">{n.title}</span>
                <span className="shrink-0 text-[11px] text-[var(--shell-muted)]">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm leading-5 text-[var(--shell-muted)]">{n.body}</p>
              {n.ctaHref && n.ctaLabel ? (
                <span className="mt-2 inline-block text-[12px] font-semibold text-[var(--brand-c2-blue)]">
                  {n.ctaLabel} →
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
