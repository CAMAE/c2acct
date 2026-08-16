"use client";

import { useState } from "react";
import CardChip from "@/app/components/cards/CardChip";
import { PAT_DISCLOSURE_SHORT } from "@/lib/patDisclosure";

/**
 * 16c — consultant nudge approval queue (HITL). Every card is a Pat-drafted nudge
 * the consultant must act on: approve (optionally after editing the copy) sends it
 * to the firm; dismiss drops it. Nothing here can send without an explicit
 * approve click — the server's decideNudgeDraft is the single send path. Every
 * draft shows the AI-disclosure line.
 */

export type QueueDraft = {
  id: string;
  companyName: string;
  audience: "firm" | "vendor";
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  aiGenerated: boolean;
  createdAt: string;
};

type CardState = { editing: boolean; title: string; body: string; busy: boolean };

export default function NudgeQueue({ initialDrafts }: { initialDrafts: QueueDraft[] }) {
  const [drafts, setDrafts] = useState<QueueDraft[]>(initialDrafts);
  const [state, setState] = useState<Record<string, CardState>>({});

  function cardState(d: QueueDraft): CardState {
    return state[d.id] ?? { editing: false, title: d.title, body: d.body, busy: false };
  }
  function patch(id: string, next: Partial<CardState>) {
    setState((cur) => ({ ...cur, [id]: { ...cardState(drafts.find((d) => d.id === id)!), ...cur[id], ...next } }));
  }

  async function decide(d: QueueDraft, decision: "approve" | "dismiss") {
    const cs = cardState(d);
    patch(d.id, { busy: true });
    const payload: Record<string, unknown> = { draftId: d.id, decision };
    if (decision === "approve" && cs.editing) {
      payload.title = cs.title;
      payload.body = cs.body;
    }
    try {
      const res = await fetch("/api/notifications/nudge/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDrafts((cur) => cur.filter((x) => x.id !== d.id));
        return;
      }
    } catch {
      /* fall through to re-enable */
    }
    patch(d.id, { busy: false });
  }

  if (drafts.length === 0) {
    return (
      <div
        data-testid="nudge-queue-empty"
        className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]"
      >
        No nudges waiting for your approval. Draft one from the Freshness board and it lands here for your review before
        anything reaches a firm.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="nudge-queue">
      {drafts.map((d) => {
        const cs = cardState(d);
        return (
          <div key={d.id} className="pat-card p-5" data-testid="nudge-queue-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{d.companyName}</div>
              <CardChip tone="muted">Pat-drafted · pending your approval</CardChip>
            </div>

            {cs.editing ? (
              <div className="mt-3 space-y-2">
                <input
                  className="w-full rounded-lg border border-[var(--shell-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--shell-ink)]"
                  value={cs.title}
                  onChange={(e) => patch(d.id, { title: e.target.value })}
                  aria-label="Nudge title"
                />
                <textarea
                  className="h-28 w-full rounded-lg border border-[var(--shell-border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--shell-ink)]"
                  value={cs.body}
                  onChange={(e) => patch(d.id, { body: e.target.value })}
                  aria-label="Nudge message"
                />
              </div>
            ) : (
              <>
                <div className="mt-3 text-sm font-semibold text-[var(--shell-ink)]">{cs.title}</div>
                <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">{cs.body}</p>
              </>
            )}

            {d.ctaLabel ? (
              <p className="mt-2 text-xs font-semibold text-[var(--brand-c2-blue)]">
                CTA: {d.ctaLabel} → {d.ctaHref}
              </p>
            ) : null}

            {d.aiGenerated ? (
              <p className="mt-2 text-[11px] leading-4 text-[var(--shell-muted)]">{PAT_DISCLOSURE_SHORT}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="nudge-approve"
                disabled={cs.busy}
                onClick={() => void decide(d, "approve")}
                className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--brand-c2-blue)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {cs.editing ? "Approve edited & send to firm" : "Approve & send to firm"}
              </button>
              {cs.editing ? (
                <button
                  type="button"
                  disabled={cs.busy}
                  onClick={() => patch(d.id, { editing: false, title: d.title, body: d.body })}
                  className="inline-flex items-center rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] disabled:opacity-60"
                >
                  Cancel edit
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="nudge-edit"
                  disabled={cs.busy}
                  onClick={() => patch(d.id, { editing: true })}
                  className="inline-flex items-center rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] disabled:opacity-60"
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                data-testid="nudge-dismiss"
                disabled={cs.busy}
                onClick={() => void decide(d, "dismiss")}
                className="inline-flex items-center rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-muted)] disabled:opacity-60"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
