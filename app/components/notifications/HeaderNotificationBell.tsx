"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PAT_DISCLOSURE_SHORT } from "@/lib/patDisclosure";

/**
 * Header notification bell (Sprint 4 M3, 2026-07-08). Lives in the AppHeader
 * icon group, between the Pat top bar and the menu icons. An icon button with an
 * unread badge; opens a dropdown feed (anchored top-right like the language
 * menu) that marks items read and links to the full inbox at /notifications.
 *
 * Replaces the Phase B2a floating bottom-left NotificationCenter. Reuses the
 * same recipient-scoped /api/notifications read/mark endpoints. Rendered only
 * when PAT_ENABLE_PINGS is on and a user is signed in (gated by AppHeader).
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
  aiGenerated: boolean;
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

export default function HeaderNotificationBell({ buttonClassName }: { buttonClassName: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Badge refreshes on mount; the list refreshes whenever the panel toggles.
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

  // Self-contained outside-click + Escape close (independent of AppHeader's menus).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (cardRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
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

  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${buttonClassName} relative`}
        aria-expanded={open}
        aria-controls="notification-bell-card"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5 stroke-current" fill="none" strokeWidth="1.8">
          <path d="M6 9a6 6 0 0 1 12 0c0 4 1.2 5.4 2 6.2H4c.8-.8 2-2.2 2-6.2Z" strokeLinejoin="round" />
          <path d="M10 18.5a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[var(--brand-c2-blue)] px-1 py-0.5 text-[10px] font-semibold leading-none text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={cardRef}
          id="notification-bell-card"
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[3.55rem] z-[65] flex max-h-[32rem] w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.55rem] border border-[var(--shell-border)] bg-white/98"
        >
          <header className="flex items-center justify-between border-b border-[var(--shell-border)] px-4 py-3">
            <div className="text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
              Notifications
            </div>
            {hasUnread ? (
              <button
                type="button"
                onClick={() => void mark(null, true)}
                className="text-[11px] font-semibold text-[var(--brand-c2-blue)] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
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
                  {n.aiGenerated ? (
                    <span className="mt-1.5 inline-block text-[11px] text-[var(--shell-muted)]">
                      {PAT_DISCLOSURE_SHORT}
                    </span>
                  ) : null}
                  {n.ctaHref && n.ctaLabel ? (
                    <span className="mt-2 inline-block text-[12px] font-semibold text-[var(--brand-c2-blue)]">
                      {n.ctaLabel} →
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-[var(--shell-border)] px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[12px] font-semibold text-[var(--brand-c2-blue)] hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
