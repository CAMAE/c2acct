"use client";

/**
 * Depth box 6: the first card on every help surface. Ask Pat lives in the
 * header bar on signed-in pages; this card brings the visitor to it.
 */
export default function AskPatCard({ className = "" }: { className?: string }) {
  function focusAskPat() {
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Ask Pat"]');
    if (input) {
      input.focus();
      input.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const launcher = document.querySelector<HTMLElement>('[aria-label="Ask Pat"]');
    launcher?.click();
  }
  return (
    <button
      type="button"
      onClick={focusAskPat}
      className={`pat-card pat-hover-card block w-full p-6 text-left ${className}`.trim()}
      data-testid="help-ask-pat-card"
    >
      <div className="pat-label">Ask Pat</div>
      <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">Ask a question in your own words</div>
      <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
        Pat answers from PAT&apos;s own documented content for your role and says so when it has no documented answer. Start typing in
        the Ask Pat bar at the top of the page.
      </p>
      <span className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)]">Open Ask Pat →</span>
    </button>
  );
}
