import Link from "next/link";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Reports | Patalign",
  description: "One-click print-ready PAT reports for operators.",
};

export default async function AdminReportsPage() {
  const vendors = await prisma.company.findMany({
    where: { type: "VENDOR", Product: { some: { active: true } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { Product: { where: { active: true } } } },
    },
  });

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Reports"
        title="Report catalog"
        description="One-click, print-optimized report views built from the same live current-state evidence as the operator pages. PDF export is the browser print dialog — no extra tooling."
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <article className="pat-card p-6">
          <div className="pat-label">Platform</div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Ecosystem summary
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Platform counts, average alignment index, the firm league table, and every product
            with a hot vendor/firm divergence — the one-pager for a quarterly readout.
          </p>
          <Link className="pat-button-primary mt-5 inline-flex" href="/admin/reports/ecosystem-summary/print">
            Open print view
          </Link>
        </article>

        <article className="pat-card p-6">
          <div className="pat-label">Vendor</div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Vendor product summary
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Per-product divergence picture for one vendor: self-reported vs firm-reviewed signal
            with the gap called out. Pick the vendor:
          </p>
          {vendors.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--shell-muted)]">No vendors with active products yet.</p>
          ) : (
            <ul className="mt-4 space-y-1.5">
              {vendors.map((vendor) => (
                <li key={vendor.id}>
                  <Link
                    className="text-sm font-medium text-[var(--brand-c2-blue)] hover:underline"
                    href={`/admin/reports/vendor-product-summary/${vendor.id}/print`}
                  >
                    {vendor.name}
                    <span className="ml-1.5 text-xs text-[var(--shell-muted)]">
                      {vendor._count.Product} product{vendor._count.Product === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="pat-card p-6">
          <div className="pat-label">Firm</div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Firm briefing pack
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            The existing per-company PAT briefing already has a print view. Open the briefing
            catalog, pick a company, and use its Print action.
          </p>
          <Link className="pat-button-primary mt-5 inline-flex" href="/admin/briefings">
            Open briefing catalog
          </Link>
        </article>
      </section>
    </div>
  );
}
