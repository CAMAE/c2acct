"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Public Pat chat (BOX 3) — the modern chat shape, skinned entirely in PAT's
 * own design system.
 *
 * Layout: conversation list, input pinned at the bottom, and a right panel that
 * expands to render the corpus article behind a citation. No vendor's chat UI is
 * cloned; every surface here is .pat-card / .pat-input / .pat-button-* so it
 * reads as part of Patalign rather than as a widget bolted onto it.
 *
 * State is IN-MEMORY ONLY. There are no accounts on this surface and nothing is
 * persisted: reloading the page starts a new conversation, and the only thing
 * that outlives a render is the opaque sessionId the usage ledger needs in order
 * to count messages. That id is a conversation key, not an identity — it is
 * generated client-side, resolves to no user, and carries no privilege.
 */

export type PublicCitation = { path: string; title: string };

type Turn =
  | { role: "you"; text: string }
  | { role: "pat"; text: string; citations: PublicCitation[]; declined: boolean; signInInvited: boolean };

const MAX_INPUT = 600;

function newSessionId(): string {
  // Opaque and client-generated. Inventing one buys a fresh message budget and
  // nothing else — the per-IP limit still bounds the caller.
  return `pub-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export default function PublicChatClient({ signInHref }: { signInHref: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [openArticle, setOpenArticle] = useState<PublicCitation | null>(null);
  const sessionId = useMemo(newSessionId, []);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  const send = useCallback(async () => {
    const question = draft.trim();
    if (!question || busy) return;

    setTurns((prior) => [...prior, { role: "you", text: question }]);
    setDraft("");
    setNotice(null);
    setBusy(true);

    try {
      const response = await fetch("/api/pat/public", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, sessionId }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 429) {
        // A cap is not a corpus gap, and the copy says so plainly rather than
        // implying Patalign has nothing on the subject.
        setNotice(
          data?.error === "session_message_cap"
            ? "That's the end of this conversation's free questions. Sign in to keep going."
            : "You're asking faster than the public assistant allows. Give it a moment."
        );
        return;
      }
      if (!response.ok || !data?.ok) {
        setNotice("Pat is unavailable right now. Please try again shortly.");
        return;
      }

      setTurns((prior) => [
        ...prior,
        {
          role: "pat",
          text: data.answer ?? data.fallback ?? "",
          citations: (data.citations ?? []) as PublicCitation[],
          declined: data.answer === null,
          signInInvited: Boolean(data.signInInvited),
        },
      ]);
    } catch {
      setNotice("Pat is unavailable right now. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }, [draft, busy, sessionId]);

  return (
    <div className="flex w-full gap-4">
      <section className="pat-card flex min-h-[32rem] flex-1 flex-col p-6" aria-label="Ask Pat">
        <header className="mb-4">
          <h2 className="pat-label-emphasis">Ask Pat</h2>
          <p className="pat-dark-copy-soft text-sm">
            Answers come from Patalign&apos;s public library. Pat says so when it doesn&apos;t have one.
          </p>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto" role="log" aria-live="polite">
          {turns.length === 0 ? (
            <p className="pat-dark-copy-soft text-sm">
              Ask what PAT is, how scoring works, or what a benchmark means.
            </p>
          ) : null}

          {turns.map((turn, index) =>
            turn.role === "you" ? (
              <p key={index} className="pat-soft-panel ml-auto max-w-[80%] p-3 text-sm">
                {turn.text}
              </p>
            ) : (
              <div key={index} className="pat-subpanel max-w-[90%] p-3">
                <p className="text-sm">{turn.text}</p>
                {turn.citations.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {turn.citations.map((citation) => (
                      <li key={citation.path}>
                        <button
                          type="button"
                          className="pat-link text-xs"
                          onClick={() => setOpenArticle(citation)}
                        >
                          {citation.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {turn.signInInvited ? (
                  <p className="mt-2 text-xs">
                    <a className="pat-link" href={signInHref}>
                      Sign in for the full help library
                    </a>
                  </p>
                ) : null}
              </div>
            )
          )}
          {busy ? <p className="pat-dark-copy-soft text-sm">Pat is looking…</p> : null}
          <div ref={listEndRef} />
        </div>

        {notice ? (
          <p className="pat-banner pat-banner-info mt-3 text-sm" role="status">
            {notice}
          </p>
        ) : null}

        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className="sr-only" htmlFor="public-chat-input">
            Ask Pat a question
          </label>
          <textarea
            id="public-chat-input"
            className="pat-textarea flex-1"
            rows={2}
            maxLength={MAX_INPUT}
            value={draft}
            disabled={busy}
            placeholder="Ask about PAT…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button type="submit" className="pat-button-primary" disabled={busy || !draft.trim()}>
            Ask
          </button>
        </form>
        <p className="pat-dark-copy-soft mt-1 text-xs">
          {draft.length}/{MAX_INPUT}
        </p>
      </section>

      {openArticle ? (
        <aside className="pat-card hidden w-[22rem] shrink-0 p-6 lg:block" aria-label="Source article">
          <div className="flex items-start justify-between gap-3">
            <h3 className="pat-label-emphasis text-sm">{openArticle.title}</h3>
            <button type="button" className="pat-link text-xs" onClick={() => setOpenArticle(null)}>
              Close
            </button>
          </div>
          <p className="pat-dark-copy-soft mt-3 text-xs">
            This answer was grounded in Patalign&apos;s public library.
          </p>
          <p className="mt-2 break-words text-xs">{openArticle.path}</p>
        </aside>
      ) : null}
    </div>
  );
}
