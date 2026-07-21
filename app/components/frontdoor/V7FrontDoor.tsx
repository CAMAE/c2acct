import Link from "next/link";

/**
 * Block 19 — V7 product-native front door. A faithful build of
 * patalign-front-v7-product-native.html using existing product tokens only
 * (--shell-ink / --shell-muted / --shell-border / --brand-c2-blue, pat-card 28px,
 * pat-label, Barlow via the app font, /PAT.png mark). Copy is locked to the
 * mockup's ~40 words. The radar is DATA-FREE — shape only, no numbers anywhere.
 * Dark behind PAT_ENABLE_NEW_FRONT_DOOR (app/page.tsx); the current page is the
 * untouched default. No client JS — a static server component.
 */
export default function V7FrontDoor() {
  const shadow = "0 1px 2px rgba(12,33,66,.05), 0 24px 64px rgba(12,33,66,.09)";
  const borderLt = "rgba(12,33,66,.07)";

  return (
    <div className="min-h-screen bg-[#fbfcfe] text-[var(--shell-ink)]" data-testid="v7-front-door">
      {/*
        Full-bleed escape from the app shell. The V7 mockup is a standalone page
        with its OWN nav + footer; the root layout (app/layout.tsx) otherwise
        wraps every page in AppHeader + app <footer> + a width-constrained,
        padded <main class="pat-shell-main">. Left alone that double-stacks a
        second header above and a second footer below the front door. This style
        renders ONLY when the front door renders (flag on + "/"), so flag-off and
        every other route keep the shell untouched. (When the front door
        graduates from flag-dark, the permanent fix is a layout route-group split
        rather than hiding the shell here.)
      */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            "body.pat-shell > header, body.pat-shell > footer{display:none!important}" +
            "body.pat-shell > main.pat-shell-main{max-width:none!important;margin-inline:0!important;padding-inline:0!important;padding-block:0!important}",
        }}
      />
      {/* NAV */}
      <nav
        className="sticky top-0 z-10 border-b bg-[rgba(251,252,254,.88)] backdrop-blur-[10px]"
        style={{ borderColor: borderLt }}
      >
        <div className="mx-auto flex h-[78px] max-w-[1120px] items-center justify-between px-9">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/PAT.png" alt="PAT" className="block h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-[30px] text-[14.5px] font-semibold text-[var(--shell-muted)]">
            <Link href="/methodology">Methodology</Link>
            <Link href="/trust">Trust</Link>
            <Link href="/sign-in" className="rounded-full bg-[var(--shell-ink)] px-6 py-[11px] font-semibold text-white">
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="px-9 pb-[60px] pt-28 text-center">
        <div className="mx-auto max-w-[1120px]">
          <div className="pat-label">Performance Alignment Technology</div>
          <h1 className="mx-auto mt-[22px] max-w-[12em] text-[62px] font-extrabold leading-[1.04] tracking-[-0.02em]">
            Product selection, without the sales pitch.
          </h1>
          <p className="mt-5 text-[19px] font-medium text-[var(--shell-muted)]">
            Real assessments. Evidence both sides can trust.
          </p>
          <div className="mt-[38px] flex justify-center gap-[14px]">
            <Link
              href="/sign-in"
              className="rounded-full bg-[var(--shell-ink)] px-[38px] py-[15px] text-base font-semibold text-white shadow-[0_10px_26px_rgba(12,33,66,.16)]"
            >
              Enter PAT
            </Link>
            <Link
              href="/sign-in?view=pat"
              className="rounded-full border border-[var(--shell-border)] bg-white px-[38px] py-[15px] text-base font-semibold text-[var(--shell-ink)]"
            >
              Meet PAT
            </Link>
          </div>
        </div>
      </header>

      {/* RADAR PANEL — data-free (shape only) */}
      <section className="px-9 pb-10 pt-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="overflow-hidden rounded-[28px] border border-[var(--shell-border)] bg-white" style={{ boxShadow: shadow }}>
            <div className="flex items-center justify-between px-[34px] py-[22px]" style={{ borderBottom: `1px solid ${borderLt}` }}>
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/PAT.png" alt="PAT" className="block h-[22px] w-auto" />
                <span className="h-[22px] w-px bg-[var(--shell-border)]" />
                <span className="pat-label">Alignment radar</span>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--shell-border)] px-[14px] py-[6px] text-xs font-semibold text-[var(--shell-muted)]">
                <span className="h-[7px] w-[7px] rounded-full bg-[var(--brand-c2-blue)]" />
                Five pillars
              </span>
            </div>
            <div className="px-12 pb-10 pt-11">
              <svg viewBox="0 0 400 330" className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label="Five-pillar alignment radar — shape only, no scores">
                <defs>
                  <radialGradient id="v7rg" cx="50%" cy="52%" r="60%">
                    <stop offset="0%" stopColor="var(--brand-c2-blue)" stopOpacity=".16" />
                    <stop offset="100%" stopColor="var(--brand-c2-blue)" stopOpacity=".05" />
                  </radialGradient>
                </defs>
                <g stroke="#d9e0ea" fill="none" strokeWidth="1">
                  <polygon points="200,58 322,146 275,282 125,282 78,146" />
                  <polygon points="200,98 283,158 251,249 149,249 117,158" opacity=".8" />
                  <polygon points="200,138 244,169 227,218 173,218 156,169" opacity=".6" />
                  <path d="M200,178 L200,58 M200,178 L322,146 M200,178 L275,282 M200,178 L125,282 M200,178 L78,146" />
                </g>
                <polygon points="200,82 298,154 247,246 151,262 121,154" fill="url(#v7rg)" stroke="var(--brand-c2-blue)" strokeWidth="2.5" strokeLinejoin="round" />
                <g fill="var(--brand-c2-blue)" stroke="#fff" strokeWidth="1.5">
                  <circle cx="200" cy="82" r="5" />
                  <circle cx="298" cy="154" r="5" />
                  <circle cx="247" cy="246" r="5" />
                  <circle cx="151" cy="262" r="5" />
                  <circle cx="121" cy="154" r="5" />
                </g>
                <g fontSize="13" fill="var(--shell-muted)" fontWeight="700" textAnchor="middle">
                  <text x="200" y="34">Strategy</text>
                  <text x="358" y="140">Operations</text>
                  <text x="297" y="314">Automation</text>
                  <text x="103" y="314">Integration</text>
                  <text x="42" y="140">Governance</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* DOOR CARDS — sign-in with role preselected */}
      <section className="mx-auto grid max-w-[1120px] grid-cols-1 gap-6 px-9 pb-[88px] pt-6 md:grid-cols-2">
        <Link href="/sign-in?view=firm" className="pat-card flex items-center justify-between gap-6 px-[42px] py-10" style={{ boxShadow: shadow }} data-testid="v7-door-firm">
          <div>
            <div className="pat-label">Firms</div>
            <h3 className="mt-3 text-[26px] font-bold tracking-[-0.01em]">Score your stack.</h3>
          </div>
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[var(--shell-border)] text-[26px]">→</span>
        </Link>
        <Link href="/sign-in?view=vendor" className="pat-card flex items-center justify-between gap-6 px-[42px] py-10" style={{ boxShadow: shadow }} data-testid="v7-door-vendor">
          <div>
            <div className="pat-label">Vendors</div>
            <h3 className="mt-3 text-[26px] font-bold tracking-[-0.01em]">Earn the evidence.</h3>
          </div>
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[var(--shell-border)] text-[26px]">→</span>
        </Link>
      </section>

      {/* TRUST LINE */}
      <div className="bg-white py-[66px] text-center" style={{ borderTop: `1px solid ${borderLt}` }}>
        <div className="mx-auto max-w-[1120px] px-9">
          <b className="text-[25px] font-bold tracking-[-0.01em]">Every number shows its work.</b>
          <p className="mt-[10px] text-[15px]">
            <Link href="/methodology" className="font-semibold text-[var(--shell-muted)]">
              Methodology →
            </Link>
          </p>
        </div>
      </div>

      {/* PRODUCT FOOTER */}
      <footer className="bg-white pb-11 pt-8 text-center" style={{ borderTop: `1px solid ${borderLt}` }}>
        <div className="mx-auto max-w-[1120px] px-9">
          <div className="flex flex-wrap justify-center gap-[26px] text-[13.5px] font-semibold text-[var(--shell-muted)]">
            <Link href="/trust">Trust</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/methodology">Methodology</Link>
            {/* Footer parity with the product: "Build proof" → /release (the release transparency page). */}
            <Link href="/release">Build proof</Link>
          </div>
          <div className="mt-4 text-[12.5px] text-[var(--shell-muted)]">
            Copyright 2026 C2Acct · PAT — Performance Alignment Technology · a Patalign™ product
          </div>
        </div>
      </footer>
    </div>
  );
}
