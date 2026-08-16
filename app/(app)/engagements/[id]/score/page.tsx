import Link from "next/link";

export const dynamic = "force-dynamic";

export default function EngagementScorePage() {
  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Unavailable route</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Engagement scoring is not part of the live PAT launch surface
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This route is quarantined so it does not compete with the current firm, vendor, and
          individual PAT portals. Use the role-specific PAT assessment and insight routes instead.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-primary" href="/firm">
            Open firm PAT
          </Link>
          <Link className="pat-button-secondary" href="/vendor">
            Open vendor PAT
          </Link>
          <Link className="pat-button-secondary" href="/user">
            Open individual PAT
          </Link>
        </div>
      </section>
    </div>
  );
}
