"use client";

import { useState } from "react";

/**
 * Full-page inbox list (Sprint 4 M3). Server-rendered initial data from
 * /notifications, with client-side mark-read / mark-all-read via the same
 * recipient-scoped /api/notifications endpoint the header bell uses.
 */

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  readAt: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationInboxList({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const hasUnread = items.some((n) => !n.readAt);

  async function post(body: unknown) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      /* silent — optimistic update below keeps the UI responsive */
    }
  }

  async function markOne(id: string) {
    const now = new Date().toISOString();
    setItems((current) => current.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n)));
    await post({ id });
  }

  async function markAll() {
    const now = new Date().toISOString();
    setItems((current) => current.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    await post({ all: true });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-[var(--shell-border)] bg-white px-4 py-6 text-sm leading-6 text-[var(--shell-muted)]">
        You&apos;re all caught up — no notifications yet.
      </p>
    );
  }

  return (
    <div>
      {hasUnread ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void markAll()}
            className="text-[12px] font-semibold text-[var(--brand-c2-blue)] hover:underline"
          >
            Mark all read
          </button>
        </div>
      ) : null}

      <ul className="space-y-2.5">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => void markOne(n.id)}
              className={`block w-full rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                n.readAt
                  ? "border-[var(--shell-border)] bg-white"
                  : "border-[var(--brand-c2-blue)] bg-[var(--shell-panel-soft)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--shell-ink)]">{n.title}</span>
                <span className="shrink-0 text-[11px] text-[var(--shell-muted)]">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">{n.body}</p>
              {n.ctaHref && n.ctaLabel ? (
                <span className="mt-2 inline-block text-[12px] font-semibold text-[var(--brand-c2-blue)]">
                  {n.ctaLabel} →
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
