export const dynamic = "force-dynamic";

import Link from "next/link";
import { requirePlatformAdminPage, searchAdminEntities, type AdminSearchFilter } from "@/lib/admin/controlPlane";

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

const filters: AdminSearchFilter[] = ["all", "company", "firm", "vendor", "product", "user", "audit"];

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdminPage("/admin/search");
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = getSingleParam(resolvedSearchParams.q);
  const type = (getSingleParam(resolvedSearchParams.type) || "all") as AdminSearchFilter;
  const results = await searchAdminEntities({ query: q, filter: filters.includes(type) ? type : "all" });

  return (
    <section className="grid gap-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Platform search</div>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Universal search</h1>
          <div className="mt-3 max-w-3xl text-sm text-slate-600">
            This acts like a command palette: typed search, scoped filters, direct routes, and evidence text. It is platform-admin only and does not inherit tenant-admin visibility.
          </div>
        </div>
        <Link href="/admin" className="text-sm font-medium text-slate-700 underline underline-offset-4">
          Back to admin
        </Link>
      </div>

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_120px]">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search companies, vendors, products, users, audit events"
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950"
        />
        <select name="type" defaultValue={type} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950">
          {filters.map((filter) => (
            <option key={filter} value={filter}>
              {filter}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter}
            href={`/admin/search?type=${encodeURIComponent(filter)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${
              filter === type ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {filter}
          </Link>
        ))}
      </div>

      {q.trim().length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Enter a search term to query the platform-wide command surface.
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No results matched the current query and filter.
        </div>
      ) : (
        <div className="grid gap-3">
          {results.map((result) => (
            <Link key={`${result.type}:${result.id}`} href={result.href} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{result.type}</div>
                  <div className="mt-1 text-xl font-semibold text-slate-950">{result.label}</div>
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">match {result.score}</div>
              </div>
              <div className="mt-2 text-sm text-slate-700">{result.subLabel}</div>
              <div className="mt-2 text-xs text-slate-500">{result.evidence}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
