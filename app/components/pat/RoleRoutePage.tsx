import Link from "next/link";
import type { PortalAudience } from "@/lib/portalVisibility";
import type { SessionUser } from "@/lib/auth/session";
import type { PatRouteRole } from "@/lib/patNavigation";
import { patRoleConfigs } from "@/lib/patNavigation";
import PortalSurfaceCard from "@/app/components/PortalSurfaceCard";

type RoleRoutePageProps = {
  role: PatRouteRole;
  sessionUser: SessionUser | null;
  activeAudience?: PortalAudience | null;
};

export default function RoleRoutePage({
  role,
  sessionUser,
  activeAudience,
}: RoleRoutePageProps) {
  const config = patRoleConfigs[role];
  const signedIn = Boolean(sessionUser);
  const audienceMismatch =
    activeAudience && role !== "user"
      ? activeAudience !== role
      : role === "user"
        ? activeAudience !== "individual"
        : false;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{config.label} route</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {config.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {config.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-primary" href={signedIn ? `/${role}` : config.signInHref}>
            {signedIn ? `Refresh ${config.label.toLowerCase()} route` : config.signInLabel}
          </Link>
          <Link className="pat-button-secondary" href={`/${role}`}>
            Open {config.label} workspace
          </Link>
        </div>
      </section>

      {sessionUser ? (
        <section className="pat-card p-6">
          <div className="pat-label">Current live context</div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Signed in as <span className="font-semibold text-[var(--shell-ink)]">{sessionUser.email ?? "actor"}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Current role <span className="font-semibold text-[var(--shell-ink)]">{sessionUser.role}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Current audience <span className="font-semibold text-[var(--shell-ink)]">{activeAudience ?? "unbound"}</span>
            </div>
          </div>
          {audienceMismatch ? (
            <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
              Your current signed-in PAT context does not match this route’s target audience. This page is still useful for reviewing information architecture, but the downstream live surfaces will continue to enforce the real authenticated context.
            </div>
          ) : null}
        </section>
      ) : (
        <section className="pat-card p-6">
          <div className="pat-label">Entry note</div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
            This route is part of the PAT information architecture. It stays lightweight and routes into the existing login, survey, results, insights, and profile plumbing instead of introducing a second flow.
          </p>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Click-through structure</h2>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            These cards route into the current PAT system where it already exists, and mark future integrations as placeholders where it does not.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {config.cards.map((card) => (
            <PortalSurfaceCard key={card.id} surface={card} />
          ))}
        </div>
      </section>
    </div>
  );
}
