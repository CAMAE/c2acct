"use client";

import { useRef, useState } from "react";

/**
 * Pat in-portal assistant widget (Phase A, 2026-06-18). A floating launcher +
 * panel that POSTs questions to /api/pat and renders grounded answers with
 * citations, or a contact-support fallback when Pat has no confident answer.
 * Dependency-free (React only); no client storage. Only mounted when the
 * PAT_ENABLE_PAT_ASSISTANT flag is on (see PatAssistantMount).
 */

type Citation = { path: string; idx: number };

type Turn = {
  role: "user" | "pat";
  text: string;
  citations?: Citation[];
  fallback?: boolean;
};

export default function PatAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q || pending) return;

    setError(null);
    setTurns((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setPending(true);

    try {
      const res = await fetch("/api/pat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError("Pat is unavailable right now. Please try again in a moment.");
      } else if (data.insufficientContext) {
        setTurns((prev) => [
          ...prev,
          { role: "pat", text: data.fallback ?? "I don't have that yet — please contact support.", fallback: true },
        ]);
      } else {
        setTurns((prev) => [
          ...prev,
          { role: "pat", text: data.answer as string, citations: (data.citations ?? []) as Citation[] },
        ]);
      }
    } catch {
      setError("Pat is unavailable right now. Please try again in a moment.");
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Pat"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[var(--brand-c2-blue)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[rgba(6,54,116,0.9)]"
      >
        Ask Pat
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Pat assistant"
      className="fixed bottom-5 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-[var(--shell-border)] px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-[var(--shell-ink)]">Pat</div>
          <div className="text-[11px] text-[var(--shell-muted)]">Patalign&apos;s product guide</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close Pat"
          className="rounded-full px-2 py-1 text-sm text-[var(--shell-muted)] hover:bg-[var(--shell-panel-soft)]"
        >
          ✕
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {turns.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--shell-muted)]">
            Hi, I&apos;m Pat. Ask me how to find your way around — like &ldquo;where do I review a
            firm&apos;s assessment?&rdquo; I answer from Patalign&apos;s help library.
          </p>
        ) : null}

        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                turn.role === "user"
                  ? "inline-block rounded-2xl bg-[var(--brand-c2-blue)] px-3 py-2 text-sm text-white"
                  : `inline-block rounded-2xl px-3 py-2 text-sm ${
                      turn.fallback
                        ? "bg-[var(--shell-panel-soft)] text-[var(--shell-muted)]"
                        : "bg-[var(--shell-panel-soft)] text-[var(--shell-ink)]"
                    }`
              }
            >
              <span className="whitespace-pre-wrap">{turn.text}</span>
              {turn.citations && turn.citations.length > 0 ? (
                <span className="mt-2 block text-[11px] text-[var(--shell-muted)]">
                  Source{turn.citations.length > 1 ? "s" : ""}:{" "}
                  {turn.citations.map((c) => `${c.path}:#${c.idx}`).join(", ")}
                </span>
              ) : null}
            </div>
          </div>
        ))}

        {pending ? <div className="text-sm text-[var(--shell-muted)]">Pat is thinking…</div> : null}
        {error ? <div className="text-sm text-[var(--shell-negative,#b00020)]">{error}</div> : null}
      </div>

      <form onSubmit={ask} className="border-t border-[var(--shell-border)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(e as unknown as React.FormEvent);
              }
            }}
            rows={2}
            placeholder="Ask Pat a question…"
            className="flex-1 resize-none rounded-xl border border-[var(--shell-border)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-c2-blue)]"
          />
          <button
            type="submit"
            disabled={pending || !question.trim()}
            className="rounded-xl bg-[var(--brand-c2-blue)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
