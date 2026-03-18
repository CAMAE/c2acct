export const dynamic = "force-dynamic";

import Link from "next/link";
import { listAdminUsers, requirePlatformAdminPage } from "@/lib/admin/controlPlane";

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdminPage("/admin/users");
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = getSingleParam(resolvedSearchParams.q);
  const users = await listAdminUsers(q);

  return (
    <section className="grid gap-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Platform users</div>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">User inventory</h1>
        </div>
        <Link href="/admin" className="text-sm font-medium text-slate-700 underline underline-offset-4">Back to admin</Link>
      </div>
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <input type="search" name="q" defaultValue={q} placeholder="Filter users" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950" />
      </form>
      <div className="grid gap-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xl font-semibold text-slate-950">{user.name?.trim() || user.email}</div>
            <div className="mt-2 text-sm text-slate-700">{user.email}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              Role {user.role} | Platform {user.platformRole} | Company {user.companyId ?? "--"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
