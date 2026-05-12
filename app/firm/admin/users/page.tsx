import Link from "next/link";
import { redirect } from "next/navigation";
import FirmManagedUserCard from "@/app/components/firm/FirmManagedUserCard";
import { getSessionUser } from "@/lib/auth/session";
import {
  FIRM_ACCESS_ROLES,
  getFirmManagedAccessUsers,
  requireFirmAdminActor,
} from "@/lib/firmAdminAccess";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  updated?: string;
  created?: string;
};

export default async function FirmAdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }

  const firm = await requireFirmAdminActor(sessionUser);
  if (!firm) {
    redirect("/firm");
  }

  const params = searchParams ? await searchParams : undefined;
  const records = await getFirmManagedAccessUsers(firm.id, params?.q ?? null);

  async function updateUserRole(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveFirm = await requireFirmAdminActor(actor);
    if (!liveFirm) {
      redirect("/firm");
    }

    const userId = String(formData.get("userId") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();
    if (!userId || !FIRM_ACCESS_ROLES.includes(role as (typeof FIRM_ACCESS_ROLES)[number])) {
      redirect("/firm/admin/users");
    }

    await prisma.user.updateMany({
      where: {
        id: userId,
        companyId: liveFirm.id,
      },
      data: {
        role: role as (typeof FIRM_ACCESS_ROLES)[number],
        updatedAt: new Date(),
      },
    });

    redirect("/firm/admin/users?updated=1");
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Existing Users</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          PAT access under {firm.name}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Review everyone currently given PAT access from this firm. This is the readable access-management view, not a generic CRM list.
        </p>
        {params?.created === "1" ? (
          <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            PAT user added.
          </div>
        ) : null}
        {params?.updated === "1" ? (
          <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            User role updated.
          </div>
        ) : null}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Search users</div>
        <form className="mt-4 flex flex-wrap gap-3" action="/firm/admin/users">
          <input
            type="search"
            name="q"
            defaultValue={params?.q ?? ""}
            className="pat-input min-w-[280px] flex-1"
            placeholder="Search by name, email, or title"
          />
          <button type="submit" className="pat-button-primary">
            Search
          </button>
          <Link className="pat-button-secondary" href="/firm/admin/users/add">
            Add user
          </Link>
          <Link className="pat-button-secondary" href="/firm/admin">
            Back to admin
          </Link>
        </form>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {records.length === 0 ? (
          <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
            No PAT users are attached to this firm yet. Use Add User to create the first firm access record.
          </div>
        ) : (
          records.map((user) => (
            <div key={user.id} className="space-y-4">
              <FirmManagedUserCard user={user} />
              <form action={updateUserRole} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <input type="hidden" name="userId" value={user.id} />
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--shell-ink)]">PAT access role</label>
                  <select name="role" className="pat-input" defaultValue={user.role}>
                    {FIRM_ACCESS_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="pat-button-primary">
                  Update role
                </button>
              </form>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
