import PortalSurfaceCard from "@/app/components/PortalSurfaceCard";
import { getSessionUser } from "@/lib/auth/session";
import { getPatRollout } from "@/lib/platformRollout";
import { resolvePortalExperience } from "@/lib/portalVisibility";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const sessionUser = await getSessionUser();
  const experience = await resolvePortalExperience(sessionUser);
  const rollout = getPatRollout();

  const operate = experience.surfaces.filter(
    (surface) => surface.section === "operate"
  );
  const network = experience.surfaces.filter(
    (surface) => surface.section === "network"
  );
  const intelligence = experience.surfaces.filter(
    (surface) => surface.section === "intelligence"
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[30px] border border-[var(--shell-border)] bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(21,56,71,0.92))] px-8 py-10 text-white shadow-[0_40px_90px_rgba(15,23,42,0.18)]">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
            One Platform, Every Perspective
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            PAT workspace for {experience.organizationName ?? "the current actor"}.
          </h2>
          <p className="mt-4 text-base leading-7 text-white/72">
            This shell filters visible surfaces by audience, role, and organization context so the platform no longer behaves like one generic survey app.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/75">
            <span className="rounded-full border border-white/15 px-4 py-2">
              Perspective: {experience.audienceLabel}
            </span>
            <span className="rounded-full border border-white/15 px-4 py-2">
              Subject: {experience.subjectKind ?? "Unbound"}
            </span>
            <span className="rounded-full border border-white/15 px-4 py-2">
              Assessment: {experience.hasCompanyBackedAssessment ? "Enabled" : "Scoped off"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="pat-card p-6">
          <div className="pat-label">Rollout discipline</div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Current stage: {experience.rolloutStage === "pat_phase1" ? "PAT phase 1" : "Protected beta"}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
            This workspace is intentionally staged. Future portals stay queued until their data model,
            access rules, and rollout flags exist together.
          </p>
          <div className="mt-5 grid gap-3">
            {rollout.dangerousNow.map((item) => (
              <div key={item} className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="pat-card p-6">
          <div className="pat-label">Compatibility bridges</div>
          <div className="mt-4 grid gap-3">
            {experience.betaOnlyBoundaries.map((item) => (
              <div key={item} className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-2xl font-semibold text-[var(--shell-ink)]">
            Operate
          </h3>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            Immediate workflow surfaces for the current portal.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {operate.map((surface) => (
            <PortalSurfaceCard key={surface.id} surface={surface} />
          ))}
        </div>
      </section>

      {network.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--shell-ink)]">
              Ecosystem
            </h3>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              Controlled visibility for counterparties and sector relationships.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {network.map((surface) => (
              <PortalSurfaceCard key={surface.id} surface={surface} />
            ))}
          </div>
        </section>
      ) : null}

      {intelligence.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--shell-ink)]">
              Intelligence
            </h3>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              Operator and market views that stay hidden unless the role and portal context allow them.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {intelligence.map((surface) => (
              <PortalSurfaceCard key={surface.id} surface={surface} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
