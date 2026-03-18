import Link from "next/link";

const cards = [
  ["Vendor insights", "/vendor/insights", "Product-intelligence and sponsor-visible insight entry points with Tier 1 live."],
  ["Vendor modules", "/vendor/modules", "Product and external-review module entry points without widening the self lane."],
  ["Executive brief", "/briefs/executive", "Current vendor-relevant build posture and operating summary."],
  ["Badge explainer", "/badges", "Unlock thresholds and evidence semantics for Tier 1 product intelligence."],
];

export default function VendorHomePage() {
  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">Vendor home</div>
        <h1 className="mt-3 text-4xl font-semibold">Vendor Overview</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          Vendor-side surfaces stay aligned to the existing product-intelligence lane, sponsor visibility rules, and canonical `/products` routing.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
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
