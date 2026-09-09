import Link from "next/link";

/**
 * The V3 hero CTA band (depth box 2 split it out so /pat "How it works" ends
 * on the same Firms / Vendors fork). `start` renders cell 1 (Start here: the
 * pills); `askPatEntry` adds the Ask Pat pill, gated by the caller on the same
 * availability check /ask uses. Hover is the shared .pat-hover-card.
 */
export default function V7DoorBand({ askPatEntry = false, start = true }: { askPatEntry?: boolean; start?: boolean }) {
  const shadow = "var(--shadow-card)";
  return (
      <section className="px-9 pb-6 pt-2">
        <div className="mx-auto max-w-[1120px]">
        <div
          className={`grid overflow-hidden rounded-[28px] border border-[var(--shell-border)] bg-white ${start ? "md:grid-cols-[1.2fr_1fr_1fr]" : "md:grid-cols-2"}`}
          style={{ boxShadow: shadow }}
          data-testid="v7-hero-band"
        >
          {start ? (
          <div
            className="pat-hover-card flex flex-col justify-center gap-5 bg-[#f4f7fb] px-[34px] py-8"
            data-testid="v7-hero-band-start"
          >
            <div className="pat-label">Start here</div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/sign-in"
                className="v7-band-pill inline-flex items-center rounded-full bg-[var(--brand-c2-blue)] px-7 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-c2-blue)] focus-visible:ring-offset-2"
                data-testid="v7-cta-enter"
              >
                Enter PAT
              </Link>
              <Link
                href="/sign-in?view=pat"
                className="v7-band-pill inline-flex items-center rounded-full border border-[var(--shell-ink)] px-7 font-bold text-[var(--shell-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-c2-blue)] focus-visible:ring-offset-2"
                data-testid="v7-cta-meet"
              >
                Meet PAT
              </Link>
              {/* Ask Pat — the door's path to its headline feature. Gated on the same
                  availability check /ask itself uses, so this link is never dead. */}
              {askPatEntry ? (
                <Link href="/ask"
                  className="v7-band-pill inline-flex items-center rounded-full border border-[var(--shell-ink)] px-7 font-bold text-[var(--shell-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-c2-blue)] focus-visible:ring-offset-2"
                  data-testid="v7-cta-ask"
                >
                  Ask Pat
                </Link>
              ) : null}
            </div>
          </div>
          ) : null}
          <Link
            href="/sign-in?view=firm"
            className={`pat-hover-card flex items-center justify-between gap-6 border-t border-[var(--shell-border)] px-[34px] py-8 md:border-t-0 ${start ? "md:border-l" : ""}`}
            data-testid="v7-door-firm"
          >
            <div>
              <div className="pat-label">Firms</div>
              <h3 className="mt-3 text-[27px] font-bold tracking-[-0.01em]">Score your stack.</h3>
            </div>
            <span aria-hidden="true" className="v7-band-arrow shrink-0 leading-none text-[var(--brand-c2-blue)]">
              →
            </span>
          </Link>
          <Link
            href="/sign-in?view=vendor"
            className="pat-hover-card flex items-center justify-between gap-6 border-t border-[var(--shell-border)] px-[34px] py-8 md:border-l md:border-t-0"
            data-testid="v7-door-vendor"
          >
            <div>
              <div className="pat-label">Vendors</div>
              <h3 className="mt-3 text-[27px] font-bold tracking-[-0.01em]">Earn the evidence.</h3>
            </div>
            <span aria-hidden="true" className="v7-band-arrow shrink-0 leading-none text-[var(--brand-c2-blue)]">
              →
            </span>
          </Link>
        </div>
        </div>
      </section>

  );
}
