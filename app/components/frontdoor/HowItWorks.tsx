import V7DoorBand from "@/app/components/frontdoor/V7DoorBand";
import V7RadarFigure from "@/app/components/frontdoor/V7RadarFigure";

/**
 * Depth box 2 (2026-09-09, flag-on): /pat is "How it works" — four numbered
 * chapters in the home register, two sentences each, a figure (not a
 * paragraph about one) with a provenance line under it, ending in the same
 * Firms / Vendors fork as the home band. Plain words only — no product-speak.
 * Figures 02 and 03 are illustrative shapes (invented values, labelled so).
 */
const CHAPTERS = [
  {
    number: "01",
    title: "The Alignment Radar",
    lines: [
      "Every firm answers the same five modules — strategy, operations, automation, integration, governance — and each one scores 0 to 100.",
      "The radar is those five scores drawn as one shape, over the dashed outline of the firm's peers.",
    ],
    provenance: "Fig. 01 — the home radar; shape only, no live numbers.",
  },
  {
    number: "02",
    title: "Evidence both ways",
    lines: [
      "A vendor declares what its product does and scores it; the firms that use it score the same features from experience.",
      "Both bars sit side by side, so a claim and the field's reading of it are never separated.",
    ],
    provenance: "Fig. 02 — vendor self-report vs firm-reviewed, invented values for illustration.",
  },
  {
    number: "03",
    title: "The alignment delta",
    lines: [
      "The delta is the distance between the two bars: self-report minus the firm-reviewed average, in points.",
      "PAT calls a gap a divergence only once at least three firm reviews exist; ten points or more is hot and worth a conversation.",
    ],
    provenance: "Fig. 03 — one hot divergence (12 pt) and one within range (3 pt), invented values.",
  },
  {
    number: "04",
    title: "What each side gets",
    lines: [
      "Firms get their own radar, an alignment index and the readouts that follow from it — comparison context, never a ranking.",
      "Vendors get the firm-reviewed evidence for each product, product by product, and where the divergence sits.",
    ],
    provenance: "The same two doors as the home page.",
  },
] as const;

const PAIRS = [
  { label: "Client portal", self: 88, firm: 81 },
  { label: "Close workflow", self: 76, firm: 79 },
  { label: "Bank feeds", self: 91, firm: 72 },
];

function PairedEvidenceBars({ rows, highlightDelta }: { rows: typeof PAIRS; highlightDelta?: boolean }) {
  return (
    <div className="grid gap-5" role="img" aria-label="Vendor self-report next to the firm-reviewed average, per feature">
      {rows.map((row) => {
        const delta = row.self - row.firm;
        const hot = Math.abs(delta) >= 10;
        return (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between text-[15.5px] font-semibold">
              <span>{row.label}</span>
              {highlightDelta ? (
                <span className={`pat-mono text-sm ${hot ? "text-[var(--brand-orange)]" : "text-[var(--shell-muted)]"}`}>
                  {delta > 0 ? "+" : ""}
                  {delta} pt{hot ? " · hot" : ""}
                </span>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center gap-3 text-sm text-[var(--shell-muted)]">
                <span className="w-28 shrink-0">Vendor self-report</span>
                <span className="relative h-[10px] flex-1 rounded bg-[#eef2f7]">
                  <span className="absolute inset-y-0 left-0 rounded bg-[#8ba1bd]" style={{ width: `${row.self}%` }} />
                </span>
                <span className="pat-mono w-8 text-right text-[var(--shell-ink)]">{row.self}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--shell-muted)]">
                <span className="w-28 shrink-0">Firm-reviewed</span>
                <span className="relative h-[10px] flex-1 rounded bg-[#eef2f7]">
                  <span className={`absolute inset-y-0 left-0 rounded ${highlightDelta && hot ? "bg-[var(--brand-orange)]" : "bg-[var(--brand-c2-blue)]"}`} style={{ width: `${row.firm}%` }} />
                </span>
                <span className="pat-mono w-8 text-right text-[var(--shell-ink)]">{row.firm}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FigureCard({ label, chip, children }: { label: string; chip: string; children: React.ReactNode }) {
  const borderLt = "rgba(12,33,66,.07)";
  return (
    <div className="v7-figure-card overflow-hidden border border-[var(--shell-border)] bg-white" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between px-[34px] py-[22px]" style={{ borderBottom: `1px solid ${borderLt}` }}>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/PAT.png" alt="PAT" className="block h-[22px] w-auto" />
          <span className="h-[22px] w-px bg-[var(--shell-border)]" />
          <span className="pat-label">{label}</span>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--shell-border)] px-[14px] py-[6px] text-xs font-semibold text-[var(--shell-muted)]">
          <span className="h-[7px] w-[7px] rounded-full bg-[var(--brand-c2-blue)]" />
          {chip}
        </span>
      </div>
      <div className="px-12 pb-10 pt-10">{children}</div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <>
      <header className="px-9 pb-[40px] pt-24 text-center">
        <div className="mx-auto max-w-[1120px]">
          <div className="pat-label">How it works</div>
          <h1 className="mx-auto mt-[22px] max-w-[14em] text-[48px] font-extrabold leading-[1.06] tracking-[-0.02em]">
            Four chapters, one measured picture.
          </h1>
          <p className="mt-5 text-[18px] font-medium text-[var(--shell-muted)]">
            What PAT measures, how both sides contribute evidence, and what each side gets back.
          </p>
        </div>
      </header>

      <section className="px-9 pb-[64px]">
        <div className="mx-auto grid max-w-[1120px] gap-12">
          {CHAPTERS.map((chapter, index) => (
            <article key={chapter.number} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start" data-testid={`how-chapter-${chapter.number}`}>
              <div className="lg:sticky lg:top-24">
                <div className="pat-mono text-sm text-[var(--shell-muted)]">{chapter.number}</div>
                <h2 className="mt-2 text-[28px] font-bold tracking-[-0.01em]">{chapter.title}</h2>
                {chapter.lines.map((line) => (
                  <p key={line} className="mt-3 text-[16px] leading-7 text-[var(--shell-muted)]">
                    {line}
                  </p>
                ))}
              </div>
              <div>
                {index === 0 ? (
                  <FigureCard label="Alignment radar" chip="Five pillars">
                    <V7RadarFigure />
                  </FigureCard>
                ) : index === 1 ? (
                  <FigureCard label="Evidence both ways" chip="Per feature">
                    <PairedEvidenceBars rows={PAIRS} />
                  </FigureCard>
                ) : index === 2 ? (
                  <FigureCard label="Alignment delta" chip="Points">
                    <PairedEvidenceBars rows={PAIRS.filter((row) => row.label !== "Close workflow")} highlightDelta />
                  </FigureCard>
                ) : (
                  <V7DoorBand start={false} />
                )}
                <p className="pat-meta mt-3 text-[var(--shell-muted)]">{chapter.provenance}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
