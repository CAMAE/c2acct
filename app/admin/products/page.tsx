import Link from "next/link";
import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      Company: {
        select: { name: true, type: true },
      },
      ProductTaxonomyAssignment: {
        select: { id: true },
      },
      ProductCapabilityMap: {
        select: { id: true },
      },
      ProductSignal: {
        select: { id: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Products"
        description="Operator view of product inventory, taxonomy coverage, capability mappings, and linked signal records."
      />

      <AdminPanel title="Product oversight">
        <div className="grid gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/admin/products/${product.id}`}
              className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5 transition hover:border-[rgba(6,54,116,0.32)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{product.name}</div>
                  <div className="mt-1 text-sm text-[var(--shell-muted)]">
                    {product.Company ? `${product.Company.name} (${product.Company.type})` : "No company linked"} · {product.active ? "Active" : "Inactive"}
                  </div>
                </div>
                <div className="text-sm text-[var(--shell-muted)]">Open detail</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--shell-muted)]">
                <span>{product.ProductTaxonomyAssignment.length} taxonomy assignments</span>
                <span>{product.ProductCapabilityMap.length} capability mappings</span>
                <span>{product.ProductSignal.length} signals</span>
              </div>
            </Link>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
