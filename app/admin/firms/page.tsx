export const dynamic = "force-dynamic";

import Link from "next/link";
import { listAdminCompanies, requirePlatformAdminPage } from "@/lib/admin/controlPlane";

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

export default async function AdminFirmsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdminPage("/admin/firms");
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = getSingleParam(resolvedSearchParams.q);
  const firms = await listAdminCompanies({ type: "FIRM", query: q });

  return (
    <section className="grid gap-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Platform firms</div>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Firm inventory</h1>
        </div>
        <Link href="/admin" className="text-sm font-medium text-slate-700 underline underline-offset-4">Back to admin</Link>
      </div>
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <input type="search" name="q" defaultValue={q} placeholder="Filter firms" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950" />
      </form>
      <div className="grid gap-3">
        {firms.map((firm) => (
          <div key={firm.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xl font-semibold text-slate-950">{firm.name}</div>
            <div className="mt-2 text-sm text-slate-700">Memberships: {firm._count.CompanyMembership} | Products: {firm._count.Product}</div>
            <div className="mt-2 text-xs text-slate-500">{firm.id}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
