import Link from "next/link";
import { notFound } from "next/navigation";
import PortalShell from "@/app/components/PortalShell";
import PortalSurfaceCard from "@/app/components/PortalSurfaceCard";
import BrandLockup from "@/app/components/brand/BrandLockup";
import PatDashboardShell from "@/app/components/dashboard/PatDashboardShell";
import {
  DEV_PREVIEW_ENV,
  DEV_PREVIEW_ROUTE,
  DEV_PREVIEW_VIEWS,
  getDevPreviewExperience,
  isDevPreviewEnabled,
  type DevPreviewView,
} from "@/lib/devPreview";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function isPreviewView(value: string | null): value is DevPreviewView {
  return DEV_PREVIEW_VIEWS.some((view) => view.id === value);
}

function PreviewSwitcher({ activeView }: { activeView: DevPreviewView }) {
  return (
    <section className="pat-card p-6">
      <div className="pat-label">Development-only preview</div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
        PAT surface review mode
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
        This route is isolated from real auth and real RBAC. It exists only to review surface composition while PAT is still being built, and it is disabled automatically in production.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {DEV_PREVIEW_VIEWS.map((view) => {
          const active = view.id === activeView;
          return (
            <Link
              key={view.id}
              href={`${DEV_PREVIEW_ROUTE}?view=${view.id}`}
              className={`rounded-[20px] border px-4 py-4 ${
                active
                  ? "border-[rgba(6,54,116,0.14)] bg-[rgba(6,54,116,0.05)]"
                  : "border-[var(--shell-border)] bg-white hover:border-[rgba(6,54,116,0.14)]"
              }`}
            >
              <div className="text-sm font-semibold text-[var(--shell-ink)]">{view.label}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{view.description}</div>
            </Link>
          );
        })}
      </div>
      <div className="mt-6 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
        Enable with <span className="font-semibold">{DEV_PREVIEW_ENV}=1</span> in local `.env.local`, then open{" "}
        <span className="font-semibold">{DEV_PREVIEW_ROUTE}</span>.
      </div>
    </section>
  );
}

function PreviewOverview({ title, description, href, cta }: { title: string; description: string; href: string; cta: string }) {
  return (
    <section className="pat-card p-8">
      <BrandLockup mode="hero" tone="light" />
      <div className="pat-label mt-6">Public surface</div>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{description}</p>
      <div className="mt-6">
        <Link className="pat-button-primary" href={href}>
          {cta}
        </Link>
      </div>
    </section>
  );
}

function ChildSurfacePreview({
  eyebrow,
  title,
  description,
  points,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <PatDashboardShell eyebrow={eyebrow} title={title} description={description}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {points.map((point) => (
          <div key={point} className="pat-soft-panel p-5 text-sm leading-6 text-[var(--shell-muted)]">
            {point}
          </div>
        ))}
      </div>
    </PatDashboardShell>
  );
}

export default async function PatPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  if (!isDevPreviewEnabled()) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedView = getSingleParam(resolvedSearchParams?.view);
  const activeView: DevPreviewView = isPreviewView(requestedView) ? requestedView : "home";
  const experience = getDevPreviewExperience(activeView);

  return (
    <div className="space-y-8">
      <PreviewSwitcher activeView={activeView} />

      {activeView === "home" ? (
        <PreviewOverview
          title="Homepage review"
          description="The PAT homepage stays focused on two jobs only: explain PAT and get people into sign-in. Use the live route to review the completed homepage/header/nav pass."
          href="/"
          cta="Open live homepage"
        />
      ) : null}

      {activeView === "login" ? (
        <PreviewOverview
          title="Sign-in hub review"
          description="Use the live sign-in route to review PAT login copy, redirect guidance, env warnings, and local auth reset handling. This preview route does not proxy auth."
          href="/sign-in"
          cta="Open live sign-in hub"
        />
      ) : null}

      {experience ? (
        <PortalShell experience={experience}>
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Previewed surfaces</h2>
              <p className="mt-1 text-sm text-[var(--shell-muted)]">
                These are development-only shell previews for the selected PAT persona. They do not bypass real route access or API checks.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {experience.surfaces.map((surface) => (
                <PortalSurfaceCard key={surface.id} surface={surface} />
              ))}
            </div>
          </section>
        </PortalShell>
      ) : null}

      {activeView === "survey" ? (
        <ChildSurfacePreview
          eyebrow="Survey Preview"
          title="Assessment readiness and launch framing"
          description="Use this view to review how PAT explains readiness, company context, and the intake step before the user enters the modular assessment."
          points={[
            "Keep readiness calm, explicit, and product-grade.",
            "Assessment is the intake mechanism, not the whole product story.",
            "Firm and vendor variants can diverge later without breaking the current launch seam.",
            "This preview does not submit or bypass auth.",
          ]}
        />
      ) : null}

      {activeView === "results" ? (
        <ChildSurfacePreview
          eyebrow="Results Preview"
          title="Pro membership results shell"
          description="Review the present-day score, current-state readout, and restrained interpretation framing without implying Elite membership capabilities that are not yet active."
          points={[
            "Current-state clarity should be stronger than decorative metrics.",
            "Signal integrity informs interpretation but is not badge gating unless explicitly designed.",
            "Submission history should read as real recorded snapshots, not synthetic trend fiction.",
            "Elite membership stays staged until the data model can support it honestly.",
          ]}
        />
      ) : null}

      {activeView === "insights" ? (
        <ChildSurfacePreview
          eyebrow="Insights Preview"
          title="Insights with Pro membership unlocked and Elite membership staged"
          description="Use this view to review how PAT presents unlocked reflective content now while clearly staging future projections, comparison layers, and higher-order intelligence."
          points={[
            "Pro membership should read as reflective, grounded, and earned.",
            "Elite membership should remain visible as a future layer without pretending it is live.",
            "Insight copy should stay concise and decision-oriented.",
            "The route compatibility remains /outputs even when user-facing labels say Insights.",
          ]}
        />
      ) : null}

      {activeView === "profile" ? (
        <ChildSurfacePreview
          eyebrow="Profile Preview"
          title="Profile and scope context framing"
          description="Review how PAT expresses the active scope, current profile identity, and what the current signal record can actually support."
          points={[
            "Profile should show scope and identity without leaking implementation noise.",
            "Current use is Pro membership interpretation and insight access.",
            "Capability benchmarking and future-state projection stay staged.",
            "This view is for layout and framing review, not live data inspection.",
          ]}
        />
      ) : null}

      {activeView === "admin" ? (
        <ChildSurfacePreview
          eyebrow="Admin Preview"
          title="Operator-facing PAT admin review"
          description="Review the operator console framing and admin surface composition here without weakening real production RBAC or exposing live mutation paths."
          points={[
            "Production admin still requires real operator role checks.",
            "Development preview is for layout and flow review only.",
            "Environment checks and compatibility notices should stay readable and explicit.",
            "This route does not impersonate a real operator in the database.",
          ]}
        />
      ) : null}
    </div>
  );
}
