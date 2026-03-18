import Link from "next/link";
import { getOutputCardRouteKey, getOutputSectionsForReportProfile } from "@/lib/intelligence/outputRegistry";

const utilityCards = [
  ["Learning progression summary", "/user/learning", "Runtime progress, grading state, and final-test readiness for the invited-user learning layer."],
  ["Badge explainer", "/badges", "Tier 1 unlock semantics, evidence requirements, and Tier 2 status."],
];

export default function UserInsightsPage() {
  const firmCards = getOutputSectionsForReportProfile("firm_baseline_report").flatMap((section) => section.cards);

  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">User insights</div>
        <h1 className="mt-3 text-4xl font-semibold">User-facing insight entry points</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          Invited users remain a firm subset. These detail pages use the current firm intelligence seam and do not widen sponsor or product visibility by themselves.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {firmCards.map((card) => (
          <Link
            key={card.id}
            href={`/user/insights/${encodeURIComponent(getOutputCardRouteKey(card))}`}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-semibold">{card.title}</div>
              <div className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Tier 1
              </div>
            </div>
            <div className="mt-2 text-sm text-white/70">{card.desc}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {utilityCards.map(([title, href, body]) => (
          <Link key={href} href={href} className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10">
            <div className="text-xl font-semibold">{title}</div>
            <div className="mt-2 text-sm text-white/70">{body}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6">
        <div className="text-xl font-semibold">Tier 2 user insights</div>
        <div className="mt-2 text-sm text-white/70">
          Higher-order accreditation, performance benchmarking, and broader personalized intelligence remain intentionally marked coming soon.
        </div>
      </div>
    </section>
  );
}
