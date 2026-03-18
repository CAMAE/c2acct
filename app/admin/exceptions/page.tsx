export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAdminExceptions, requirePlatformAdminPage } from "@/lib/admin/controlPlane";

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

export default async function AdminExceptionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdminPage("/admin/exceptions");
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = getSingleParam(resolvedSearchParams.q);
  const exceptions = await getAdminExceptions({ query: q, limit: 30 });

  return (
    <section className="grid gap-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Platform exceptions</div>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Exceptions queue</h1>
          <div className="mt-3 max-w-3xl text-sm text-slate-600">
            Partial but real queue. Inspect and route-to-source actions exist now; reassign, suppress, and bulk workflow actions remain intentionally deferred.
          </div>
        </div>
        <Link href="/admin" className="text-sm font-medium text-slate-700 underline underline-offset-4">
          Back to admin
        </Link>
      </div>

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_120px]">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Filter exceptions by title, summary, or category"
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950"
        />
        <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
          Filter
        </button>
      </form>

      <div className="grid gap-4">
        {exceptions.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.category}</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{item.title}</div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">{item.severity}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">{item.status}</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-700">{item.summary}</div>
            <div className="mt-2 text-xs text-slate-500">{item.createdAt}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href={item.href} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Inspect
              </Link>
              <div className="text-xs text-slate-500">Actions now: {item.supportedActions.join(" | ")}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
