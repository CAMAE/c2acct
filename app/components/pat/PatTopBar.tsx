"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pat top bar (Elite Sprint Block B). Replaces the floating launcher with a
 * persistent header input in the YouTube-search pattern: PAT lockup (fixed) |
 * Pat input (flex-grow, max-w-720, centered) | menu/account icons (fixed).
 *
 * Focus expands a dropdown thread panel; Esc / click-out collapses it. On mobile
 * (<md) it collapses to a Pat icon that opens a full-width overlay input. Same
 * /api/pat pipeline as before (grounded answers + citations, contact-support
 * fallback) — a pure surface swap. Rendered only when the caller has already
 * cleared the flag + consent gate (see AppHeader / root layout).
 */

type Citation = { path: string; idx: number };

type Turn = {
  role: "user" | "pat";
  text: string;
  citations?: Citation[];
  fallback?: boolean;
};

/** Neutral chat glyph for the mobile Ask-Pat launcher (R17: the navy "P" avatar
 *  was removed from the Ask Pat bar; the launcher uses a plain speech bubble). */
function ChatGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 text-[var(--shell-muted)] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8 8.38 8.38 0 0 1 8.5-8.5A8.5 8.5 0 0 1 21 11.5z" />
    </svg>
  );
}

export default function PatTopBar() {
  const [open, setOpen] = useState(false); // desktop dropdown
  const [mobileOpen, setMobileOpen] = useState(false); // mobile overlay
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  const anyOpen = open || mobileOpen;

  useEffect(() => {
    if (!anyOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
      }
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [anyOpen]);

  useEffect(() => {
    if (mobileOpen) {
      mobileInputRef.current?.focus();
    }
  }, [mobileOpen]);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q || pending) return;

    setError(null);
    setTurns((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setPending(true);
    setOpen(true);

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
          {
            role: "pat",
            text: data.fallback ?? "I don't have that yet — please contact support.",
            fallback: true,
          },
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

  const renderThread = () => (
    <div ref={scrollRef} className="max-h-[24rem] space-y-3 overflow-y-auto px-4 py-3">
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
      {error ? (
        <div className="text-sm text-[var(--shell-negative,#b00020)]">
          {error} You can always reach a human at{" "}
          <a className="pat-link" href="mailto:support@patalign.com">
            support@patalign.com
          </a>
          .
        </div>
      ) : null}
    </div>
  );

  const panelClassName =
    "overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-white shadow-2xl";

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 items-center justify-center">
      {/* Desktop: persistent centered input */}
      <form onSubmit={ask} className="hidden w-full max-w-[720px] md:block">
        <div className="relative w-full">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Ask Pat…"
            aria-label="Ask Pat"
            className="h-11 w-full rounded-full border border-[var(--shell-border)] bg-white px-4 text-sm text-[var(--shell-ink)] outline-none focus:border-[var(--brand-c2-blue)] focus:ring-2 focus:ring-[rgba(6,54,116,0.14)]"
          />
        </div>
      </form>

      {/* Mobile: collapse to a Pat icon that opens a full-width overlay */}
      <button
        type="button"
        onClick={() => setMobileOpen((current) => !current)}
        aria-label="Ask Pat"
        aria-expanded={mobileOpen}
        className="inline-flex h-[3.05rem] w-[3.05rem] items-center justify-center rounded-[1.05rem] border border-[var(--shell-border)] bg-white hover:border-[rgba(6,54,116,0.32)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)] md:hidden"
      >
        <ChatGlyph />
      </button>

      {/* Desktop dropdown thread panel */}
      {open ? (
        <div
          role="dialog"
          aria-label="Pat assistant"
          className={`absolute left-1/2 top-[calc(100%+0.55rem)] z-[55] hidden w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 md:block ${panelClassName}`}
        >
          {renderThread()}
        </div>
      ) : null}

      {/* Mobile full-width overlay: input + thread */}
      {mobileOpen ? (
        <div
          role="dialog"
          aria-label="Pat assistant"
          className={`fixed inset-x-2 top-[4.15rem] z-[55] md:hidden ${panelClassName}`}
        >
          <form onSubmit={ask} className="border-b border-[var(--shell-border)] p-3">
            <div className="relative w-full">
              <input
                ref={mobileInputRef}
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask Pat…"
                aria-label="Ask Pat"
                className="h-11 w-full rounded-full border border-[var(--shell-border)] bg-white px-4 text-sm text-[var(--shell-ink)] outline-none focus:border-[var(--brand-c2-blue)]"
              />
            </div>
          </form>
          {renderThread()}
        </div>
      ) : null}
    </div>
  );
}
