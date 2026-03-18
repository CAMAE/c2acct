import Link from "next/link";
import { getOutputCardRouteKey, getOutputSectionsForReportProfile } from "@/lib/intelligence/outputRegistry";

export default function VendorInsightsPage() {
  const sections = getOutputSectionsForReportProfile("product_intelligence_report");
  const cards = sections.flatMap((section) => section.cards);

  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">Vendor insights</div>
        <h1 className="mt-3 text-4xl font-semibold">Vendor product-intelligence entry points</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          Vendor intelligence stays on the canonical `/products` family. Self signal and sponsor-visible observed signal remain distinct evidence lanes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={`/vendor/insights/${encodeURIComponent(getOutputCardRouteKey(card))}`}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-semibold">{card.title}</div>
              <div className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Tier 1
              </div>
            </div>
            <div className="mt-2 text-sm text-white/70">{card.desc}</div>
            <div className="mt-4 text-xs uppercase tracking-[0.18em] text-white/45">{card.evidenceSources.join(" + ").replaceAll("_", " ")}</div>
          </Link>
        ))}
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xl font-semibold">Tier 2 vendor intelligence</div>
            <div className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
              Coming soon
            </div>
          </div>
          <div className="mt-2 text-sm text-white/70">
            Deeper comparative analytics and broader institutional signal layers remain intentionally deferred until the underlying evidence depth is expanded.
          </div>
        </div>
      </div>
    </section>
  );
}
