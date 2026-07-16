import Link from "next/link";
import { redirect } from "next/navigation";
import CardChip, { CardChipRow } from "@/app/components/cards/CardChip";
import { getSessionUser } from "@/lib/auth/session";
import { getPilotDisabledSignInPath, isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import prisma from "@/lib/prisma";
import { ensureUserPatScaffold, getFirmManagedUserRecords } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export default async function FirmUserInsightPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect(
      isIndividualSurfacesEnabled() ? "/sign-in/firm" : getPilotDisabledSignInPath("individual")
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: { id: true, type: true, name: true },
  }).catch(() => null);
  if (!company || company.type !== "FIRM") {
    redirect("/sign-in/firm");
  }

  // 6/9 audit bug 1: a signed-in firm admin used to get bounced to
  // /sign-in?pilotDisabled=individual here. Keep them in the workspace with
  // a shelved-surface notice instead; only anonymous visitors redirect.
  if (!isIndividualSurfacesEnabled()) {
    return (
      <div className="space-y-8">
        <section className="pat-card p-8">
          <div className="pat-label">User Insight</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Shelved for the current pilot
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
            Person-level user insight for {company.name} is part of the individual surface set,
            which is shelved for the current vendor/firm pilot. Your firm workspace, alignment
            assessment, and insights remain fully available.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-primary" href="/firm/admin">
              Back to firm admin
            </Link>
            <Link className="pat-button-secondary" href="/firm">
              Open firm workspace
            </Link>
          </div>
        </section>
      </div>
    );
  }

  await ensureUserPatScaffold();
  const { q } = await searchParams;
  const records = await getFirmManagedUserRecords(company.id, q ?? null);

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">User Insight</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          User oversight for {company.name}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This management surface helps firm leaders invite users, search for a specific person, and review current assessment status without turning the PAT admin into a sprawling back office.
        </p>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Search users</div>
        <form className="mt-4 flex flex-wrap gap-3" action="/firm/admin/user-insight">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            className="pat-input min-w-[280px] flex-1"
            placeholder="Search by email"
          />
          <button type="submit" className="pat-button-primary">
            Search
          </button>
          <Link className="pat-button-secondary" href="/firm/admin">
            Back to admin
          </Link>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {records.length === 0 ? (
          <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
            No users match the current search.
          </div>
        ) : (
          records.map((user) => (
            <div key={user.id} className="pat-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{user.email}</div>
                <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--shell-accent)]">
                  {user.role}
                </span>
              </div>
              <CardChipRow>
                <CardChip>{user.status}</CardChip>
                <CardChip>{user.assessmentProgress}</CardChip>
                <CardChip tone={user.subjectMembershipReady ? "positive" : "muted"}>
                  {user.subjectMembershipReady ? "Subject connected" : "Subject pending"}
                </CardChip>
                <CardChip tone={user.companyId ? "neutral" : "muted"}>
                  {user.companyId ? "Company attached" : "Not attached"}
                </CardChip>
              </CardChipRow>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
