import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
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
    redirect("/sign-in/firm");
  }

  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: { id: true, type: true, name: true },
  }).catch(() => null);
  if (!company || company.type !== "FIRM") {
    redirect("/sign-in/firm");
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
              <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
                <div>Status: <span className="font-semibold text-[var(--shell-ink)]">{user.status}</span></div>
                <div>Assessment progress: <span className="font-semibold text-[var(--shell-ink)]">{user.assessmentProgress}</span></div>
                <div>Person subject: <span className="font-semibold text-[var(--shell-ink)]">{user.subjectMembershipReady ? "Connected" : "Pending"}</span></div>
                <div>Company linkage: <span className="font-semibold text-[var(--shell-ink)]">{user.companyId ? "Attached" : "Not attached"}</span></div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
