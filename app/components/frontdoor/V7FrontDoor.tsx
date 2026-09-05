import Link from "next/link";
import { isAskPatDoorEntryEnabled } from "@/lib/frontDoor";

/**
 * Block 19 — V7 product-native front door. A faithful build of
 * patalign-front-v7-product-native.html using existing product tokens only
 * (--shell-ink / --shell-muted / --shell-border / --brand-c2-blue, pat-card 28px,
 * pat-label, Barlow via the app font, /PAT.png mark). Copy is locked to the
 * mockup. The radar and the cohort-standing panel are DATA-FREE — shape only, no
 * numbers, no percentile claims. Bar positions are illustrative layout
 * coordinates (same status as the radar polygon points), not scores.
 * Dark behind PAT_ENABLE_NEW_FRONT_DOOR (the (public) route group renders it when
 * on). No client JS — a static server component.
 *
 * Block 21a STEP 2b — DEDUPE: the nav, product footer, full-bleed escape and the
 * min-h-screen wrapper moved to V7PublicShell (the (public) group layout wraps this
 * content in ONE shared shell + the EN/FR/ES selector). This component is now just
 * the front-door CONTENT — a fragment. The V7-scoped pat-label 12px size lives on
 * V7PublicShell's [data-testid="v7-public-shell"] wrapper.
 *
 * Content order: hero → door cards → radar panel → cohort-standing panel → trust
 * band. Revision 3 (2026-07-27): type scale backed off halfway; the cohort legend
 * drops the color-key words; the single pillar sentence becomes five per-pillar
 * value sentences under the radar; the methodology/trust band is condensed.
 */

// Illustrative peer positions — shape only, no scores. band = [left%, width%];
// p90 = top-decile tick; you = the "you" dot; tone = semantic standing of "you"
// vs the peer band (up = above / mid = within / dn = below). Pillar names reuse
// the radar (not new copy).
const COHORT_ROWS = [
  { pillar: "Strategy", band: [42, 25], p90: 77, you: 60, tone: "mid" },
  { pillar: "Operations", band: [46, 22], p90: 79, you: 81, tone: "up" },
  { pillar: "Automation", band: [48, 22], p90: 78, you: 74, tone: "up" },
  { pillar: "Integration", band: [45, 24], p90: 80, you: 53, tone: "mid" },
  { pillar: "Governance", band: [50, 20], p90: 82, you: 74, tone: "up" },
] as const;
const YOU_TONE: Record<string, string> = { up: "#16a34a", mid: "#d97e22", dn: "#c4442e" };

// Locked verbatim — one plain-language value sentence per pillar, under the radar.
const PILLAR_SENTENCES: { pillar: string; rest: string }[] = [
  { pillar: "Strategy", rest: "whether your technology plans point where your practice is actually heading." },
  { pillar: "Operations", rest: "the daily workflow discipline that separates smooth closes from late nights." },
  { pillar: "Automation", rest: "where software genuinely saves hours, and where it only promises to." },
  { pillar: "Integration", rest: "whether your systems share data cleanly or make your team re-key it." },
  { pillar: "Governance", rest: "the controls and vendor oversight your clients assume you already have." },
];

const ArrowGlyph = ({ px }: { px: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="block" style={{ width: px, height: px }} aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export default function V7FrontDoor() {
  const shadow = "0 1px 2px rgba(12,33,66,.05), 0 24px 64px rgba(12,33,66,.09)";
  const borderLt = "rgba(12,33,66,.07)";
  // Ask Pat door entry — rendered ONLY when /ask would render (public tier live).
  const askPatEntry = isAskPatDoorEntryEnabled();

  return (
    <>
      {/* HERO */}
      <header className="px-9 pb-[60px] pt-28 text-center">
        <div className="mx-auto max-w-[1120px]">
          <div className="pat-label">Performance Alignment Technology</div>
          <h1 className="mx-auto mt-[22px] max-w-[12em] text-[64px] font-extrabold leading-[1.04] tracking-[-0.02em]">
            Product selection, without the sales pitch.
          </h1>
          <p className="mt-5 text-[20px] font-medium text-[var(--shell-muted)]">
            Real assessments. Evidence both sides can trust.
          </p>
          {/* Hero CTAs — compact cta-cards (same family as the doors, smaller).
              flex-wrap so a third card (Ask Pat) or a narrow viewport stacks instead
              of overflowing the 390px column. */}
          <div className="mt-[38px] flex flex-wrap justify-center gap-[18px]">
            <Link href="/sign-in" className="pat-card flex items-center gap-[22px] px-[30px] py-[22px] text-[19px] font-bold" style={{ boxShadow: shadow }} data-testid="v7-cta-enter">
              <span>Enter PAT</span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--shell-border)] leading-none text-[var(--shell-ink)]">
                <ArrowGlyph px={19} />
              </span>
            </Link>
            <Link href="/sign-in?view=pat" className="pat-card flex items-center gap-[22px] px-[30px] py-[22px] text-[19px] font-bold" style={{ boxShadow: shadow }} data-testid="v7-cta-meet">
              <span>Meet PAT</span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--shell-border)] leading-none text-[var(--shell-ink)]">
                <ArrowGlyph px={19} />
              </span>
            </Link>
            {/* Ask Pat — the door's path to its headline feature. Gated on the same
                availability check /ask itself uses, so this link is never dead. */}
            {askPatEntry ? (
              <Link href="/ask" className="pat-card flex items-center gap-[22px] px-[30px] py-[22px] text-[19px] font-bold" style={{ boxShadow: shadow }} data-testid="v7-cta-ask">
                <span>Ask Pat</span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--shell-border)] leading-none text-[var(--shell-ink)]">
                  <ArrowGlyph px={19} />
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* DOOR CARDS — sign-in with role preselected. Above the panels. */}
      <section className="mx-auto grid max-w-[1120px] grid-cols-1 gap-6 px-9 pb-6 pt-10 md:grid-cols-2">
        <Link href="/sign-in?view=firm" className="pat-card flex items-center justify-between gap-6 px-[42px] py-10" style={{ boxShadow: shadow }} data-testid="v7-door-firm">
          <div>
            <div className="pat-label">Firms</div>
            <h3 className="mt-3 text-[27px] font-bold tracking-[-0.01em]">Score your stack.</h3>
          </div>
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[var(--shell-border)] leading-none text-[var(--shell-ink)]">
            <ArrowGlyph px={22} />
          </span>
        </Link>
        <Link href="/sign-in?view=vendor" className="pat-card flex items-center justify-between gap-6 px-[42px] py-10" style={{ boxShadow: shadow }} data-testid="v7-door-vendor">
          <div>
            <div className="pat-label">Vendors</div>
            <h3 className="mt-3 text-[27px] font-bold tracking-[-0.01em]">Earn the evidence.</h3>
          </div>
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[var(--shell-border)] leading-none text-[var(--shell-ink)]">
            <ArrowGlyph px={22} />
          </span>
        </Link>
      </section>

      {/* PANELS — data-free shape only: alignment radar, then cohort standing. */}
      <section className="px-9 pb-[88px] pt-6">
        <div className="mx-auto max-w-[1120px]">
          {/* RADAR CARD */}
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
                {/* Peer overlay — dashed, under the solid navy "you" shape. */}
                <polygon points="200,96 286,152 249,236 153,244 116,152" fill="none" stroke="#8ba1bd" strokeWidth="2" strokeDasharray="6 5" strokeLinejoin="round" />
                <polygon points="200,82 298,154 247,246 151,262 121,154" fill="url(#v7rg)" stroke="var(--brand-c2-blue)" strokeWidth="2.5" strokeLinejoin="round" />
                <g fill="var(--brand-c2-blue)" stroke="#fff" strokeWidth="1.5">
                  <circle cx="200" cy="82" r="5" />
                  <circle cx="298" cy="154" r="5" />
                  <circle cx="247" cy="246" r="5" />
                  <circle cx="151" cy="262" r="5" />
                  <circle cx="121" cy="154" r="5" />
                </g>
                <g fontSize="14" fill="var(--shell-muted)" fontWeight="700" textAnchor="middle">
                  <text x="200" y="34">Strategy</text>
                  <text x="358" y="140">Operations</text>
                  <text x="297" y="314">Automation</text>
                  <text x="103" y="314">Integration</text>
                  <text x="42" y="140">Governance</text>
                </g>
              </svg>
              {/* Legend beneath the radar — You (solid navy) vs Peers (dashed). */}
              <div className="mt-6 flex items-center justify-center gap-[26px] text-[14.5px] text-[var(--shell-muted)]">
                <span className="flex items-center gap-2"><span className="inline-block h-[11px] w-[11px] rounded-full bg-[var(--brand-c2-blue)]" /> You</span>
                <span className="flex items-center gap-2"><span className="inline-block w-[26px] border-t-2 border-dashed border-[#8ba1bd]" /> Peers</span>
              </div>
              {/* Five per-pillar value sentences — plain language, locked verbatim. */}
              <div className="mx-auto mt-[26px] max-w-[640px] border-t pt-[22px]" style={{ borderColor: borderLt }}>
                {PILLAR_SENTENCES.map((s) => (
                  <p key={s.pillar} className="mt-2 text-[15px] text-[var(--shell-muted)]">
                    <b className="text-[var(--shell-ink)]">{s.pillar}</b> — {s.rest}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* COHORT STANDING CARD — shape only, illustrative peer positions, no
              numbers. "You" dots are semantic (up/mid/dn vs the peer band). */}
          <div className="mt-7 overflow-hidden rounded-[28px] border border-[var(--shell-border)] bg-white" style={{ boxShadow: shadow }}>
            <div className="flex items-center justify-between px-[34px] py-[22px]" style={{ borderBottom: `1px solid ${borderLt}` }}>
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/PAT.png" alt="PAT" className="block h-[22px] w-auto" />
                <span className="h-[22px] w-px bg-[var(--shell-border)]" />
                <span className="pat-label">Cohort standing</span>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--shell-border)] px-[14px] py-[6px] text-xs font-semibold text-[var(--shell-muted)]">
                <span className="h-[7px] w-[7px] rounded-full bg-[var(--brand-c2-blue)]" />
                Peer view
              </span>
            </div>
            <div className="px-12 pb-9 pt-10">
              {COHORT_ROWS.map((row, i) => (
                <div key={row.pillar} className={i === 0 ? "" : "mt-6"}>
                  <div className="mb-2 text-[15.5px] font-semibold">{row.pillar}</div>
                  {/* Row geometry is ALL px on ONE centreline (y = 7px of a 14px row).
                      The shell's html{font-size:11.5px} scales rem-based Tailwind
                      spacing, so the old h-3 / top-0.5 / h-2 / h-4 / w-0.5 mix left the
                      "you" dot 0.8px under the track, 2.2px under the peer band and
                      2.75px under the top-decile tick at 1440px (measured 2026-09-04).
                      Dot and tick are x-centred on their percentage, not left-anchored. */}
                  <div className="relative h-[14px]" data-testid="v7-cohort-row">
                    <span className="absolute inset-x-0 top-[6px] h-[2px] rounded-[1px] bg-[#eef2f7]" />
                    <span className="absolute top-[3px] h-[8px] rounded bg-[#dbe4ee]" style={{ left: `${row.band[0]}%`, width: `${row.band[1]}%` }} />
                    <span className="absolute top-[-1px] h-[16px] w-[2px] -translate-x-1/2 rounded-[1px] bg-[var(--brand-c2-blue)]" style={{ left: `${row.p90}%` }} />
                    {/* semantic "you" dot — ring color by standing vs the band */}
                    <span className="absolute top-0 h-[14px] w-[14px] -translate-x-1/2 rounded-full border-[3.5px] bg-white" style={{ left: `${row.you}%`, borderColor: YOU_TONE[row.tone] }} />
                  </div>
                </div>
              ))}
              <div className="mt-7 flex items-center justify-center gap-[26px] border-t pt-4 text-[15px] text-[var(--shell-muted)]" style={{ borderColor: borderLt }}>
                <span className="flex items-center gap-2"><span className="inline-block h-2 w-[26px] rounded bg-[#dbe4ee]" /> Peers</span>
                <span className="flex items-center gap-2"><span className="inline-block h-[14px] w-0.5 bg-[var(--brand-c2-blue)]" /> Top decile</span>
                <span className="flex items-center gap-2"><span className="inline-block h-[11px] w-[11px] rounded-full border-[3px] border-[#16a34a] bg-white" /> You</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / methodology — condensed band with a single ghost-pill button. */}
      <div className="bg-white py-[34px] text-center" style={{ borderTop: `1px solid ${borderLt}` }}>
        <div className="mx-auto max-w-[1120px] px-9">
          <Link
            href="/methodology"
            className="inline-block rounded-full border border-[var(--shell-border)] bg-white px-10 py-4 text-[17px] font-semibold text-[var(--shell-ink)]"
          >
            Methodology
          </Link>
        </div>
      </div>
    </>
  );
}
