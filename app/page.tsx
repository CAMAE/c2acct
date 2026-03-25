import Link from "next/link";
import {
  ALL_AUDIENCES,
  getAudienceMeta,
  getAudiencePreview,
  type PortalAudience,
} from "@/lib/portalVisibility";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveAudienceCandidate(
  value: string | string[] | undefined
): PortalAudience {
  const candidate = typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
  return ALL_AUDIENCES.includes(candidate as PortalAudience)
    ? (candidate as PortalAudience)
    : "firm";
}

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const previewAudience = resolveAudienceCandidate(resolvedSearchParams?.audience);
  const previewMeta = getAudienceMeta(previewAudience);
  const previewSurfaces = getAudiencePreview(previewAudience);

  return (
    <div className="space-y-14">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-[34px] border border-[var(--shell-border)] bg-[linear-gradient(145deg,rgba(15,23,42,0.97),rgba(25,65,79,0.95))] px-8 py-10 text-white shadow-[0_40px_100px_rgba(15,23,42,0.16)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
            Corporate Surface
          </div>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">
            C2Acct is the operating wrapper. PAT is the platform inside it.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/74">
            The runtime is no longer framed as one generic survey application. C2Acct now presents a public corporate surface and a PAT workspace that filters visibility by role, subject, and organization context.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/platform"
              className="rounded-full bg-[var(--shell-accent)] px-6 py-3 text-sm font-semibold text-[var(--shell-ink)] transition hover:brightness-105"
            >
              Open PAT Workspace
            </Link>
            <Link
              href="/survey"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/82 transition hover:bg-white/5"
            >
              Current Golden Path
            </Link>
          </div>
        </div>

        <div className="rounded-[30px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--shell-muted)]">
            Live Runtime
          </div>
          <div className="mt-4 space-y-4">
            {[
              { title: "Login", desc: "Authenticated actor entry into the platform." },
              { title: "Survey", desc: "Current institution-backed assessment flow." },
              { title: "Results", desc: "Latest scored submission and integrity context." },
              { title: "Outputs", desc: "Unlocked output layer after submission." },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-[22px] border border-[var(--shell-border)] bg-white p-5"
              >
                <div className="font-semibold text-[var(--shell-ink)]">{step.title}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--shell-muted)]">
              PAT Visibility Matrix
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--shell-ink)]">
              Preview by perspective
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--shell-muted)]">
              This preview uses the same surface matrix as the live workspace so role-specific visibility can be inspected without inventing fake routes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_AUDIENCES.map((audience) => (
              <Link
                key={audience}
                href={`/?audience=${audience}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  previewAudience === audience
                    ? "bg-[var(--shell-ink)] text-white"
                    : "border border-[var(--shell-border)] bg-white text-[var(--shell-muted)] hover:text-[var(--shell-ink)]"
                }`}
              >
                {getAudienceMeta(audience).label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-[var(--shell-border)] bg-white p-6">
          <div className="text-xl font-semibold text-[var(--shell-ink)]">
            {previewMeta.label}
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            {previewMeta.description}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {previewSurfaces.map((surface) => (
            <div
              key={surface.id}
              className="rounded-[24px] border border-[var(--shell-border)] bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">
                  {surface.title}
                </div>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--shell-muted)]">
                  {surface.availability}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                {surface.description}
              </p>
              {surface.reason ? (
                <p className="mt-4 text-sm text-[var(--shell-muted)]">{surface.reason}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
