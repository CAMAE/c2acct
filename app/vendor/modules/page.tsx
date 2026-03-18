import Link from "next/link";

const cards = [
  ["Product self-assessment", "/survey", "Current product-aware assessment entry point where product context is visible."],
  ["Sponsor-visible reviews", "/reviews", "External-review lane remains separate from self-assessment and retains 5-question paging."],
  ["Product intelligence catalog", "/products", "Canonical vendor product route family and intelligence destination."],
];

export default function VendorModulesPage() {
  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">Vendor modules</div>
        <h1 className="mt-3 text-4xl font-semibold">Vendor module entry points</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          Vendor modules stay split between self-assessment and sponsor-visible review. The external-review lane remains distinct and does not widen the self-owned seam.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([title, href, body]) => (
          <Link key={href} href={href} className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10">
            <div className="text-xl font-semibold">{title}</div>
            <div className="mt-2 text-sm text-white/70">{body}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
