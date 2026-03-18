export const dynamic = "force-dynamic";

import Link from "next/link";
import { listAdminProducts, requirePlatformAdminPage } from "@/lib/admin/controlPlane";

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdminPage("/admin/products");
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = getSingleParam(resolvedSearchParams.q);
  const products = await listAdminProducts(q);

  return (
    <section className="grid gap-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Platform products</div>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Product inventory</h1>
        </div>
        <Link href="/admin" className="text-sm font-medium text-slate-700 underline underline-offset-4">Back to admin</Link>
      </div>
      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <input type="search" name="q" defaultValue={q} placeholder="Filter products" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950" />
      </form>
      <div className="grid gap-3">
        {products.map((product) => (
          <Link key={product.id} href={`/products/${encodeURIComponent(product.id)}/intelligence`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50">
            <div className="text-xl font-semibold text-slate-950">{product.name}</div>
            <div className="mt-2 text-sm text-slate-700">{product.Company.name} | {product.Company.type}</div>
            <div className="mt-2 text-xs text-slate-500">{product.id}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
