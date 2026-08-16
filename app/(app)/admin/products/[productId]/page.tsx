import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import {
  PRODUCT_CAPABILITY_COVERAGE_OPTIONS,
  PRODUCT_TAXONOMY_FIT_OPTIONS,
  RESEARCH_CONFIDENCE_OPTIONS,
} from "@/lib/adminControlPlane";
import {
  updateProductAction,
  upsertProductCapabilityMapAction,
  upsertProductTaxonomyAssignmentAction,
} from "@/app/(app)/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const [product, buckets, capabilityNodes] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        Company: {
          select: { name: true, type: true },
        },
        ProductTaxonomyAssignment: {
          include: {
            Bucket: {
              select: { title: true, key: true },
            },
          },
        },
        ProductCapabilityMap: {
          include: {
            CapabilityNode: {
              select: { title: true },
            },
          },
        },
        ProductSignal: {
          orderBy: { signalKey: "asc" },
        },
      },
    }),
    prisma.taxonomyBucket.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.capabilityNode.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title={product.name}
        description="Product metadata, taxonomy assignment, capability coverage, and live signal inventory."
      />

      <AdminPanel title="Product settings">
        <form action={updateProductAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="returnTo" value={`/admin/products/${product.id}`} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--shell-ink)]">Name</span>
            <input name="name" defaultValue={product.name} className="pat-input" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--shell-ink)]">Website</span>
            <input name="website" defaultValue={product.website ?? ""} className="pat-input" />
          </label>
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-[var(--shell-ink)]">Summary</span>
            <textarea name="summary" defaultValue={product.summary ?? ""} rows={3} className="pat-textarea" />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--shell-muted)]">
            <input type="checkbox" name="active" defaultChecked={product.active} />
            Active
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="pat-button-primary">
              Save product
            </button>
          </div>
        </form>
      </AdminPanel>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Taxonomy assignments">
          <div className="grid gap-3">
            {product.ProductTaxonomyAssignment.map((assignment) => (
              <div key={assignment.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4 text-sm text-[var(--shell-muted)]">
                {assignment.Bucket.title} ({assignment.Bucket.key}) · {assignment.fit} · {assignment.confidence}
              </div>
            ))}
          </div>
          <form action={upsertProductTaxonomyAssignmentAction} className="mt-4 grid gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="returnTo" value={`/admin/products/${product.id}`} />
            <select name="bucketId" defaultValue="" className="pat-select">
              <option value="" disabled>
                Select bucket
              </option>
              {buckets.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.title}
                </option>
              ))}
            </select>
            <select name="fit" defaultValue="PRIMARY" className="pat-select">
              {PRODUCT_TAXONOMY_FIT_OPTIONS.map((fit) => (
                <option key={fit} value={fit}>
                  {fit}
                </option>
              ))}
            </select>
            <select name="confidence" defaultValue="UNKNOWN" className="pat-select">
              {RESEARCH_CONFIDENCE_OPTIONS.map((confidence) => (
                <option key={confidence} value={confidence}>
                  {confidence}
                </option>
              ))}
            </select>
            <textarea name="notes" rows={2} placeholder="Notes" className="pat-textarea" />
            <button type="submit" className="pat-button-primary">
              Save taxonomy assignment
            </button>
          </form>
        </AdminPanel>

        <AdminPanel title="Capability mappings">
          <div className="grid gap-3">
            {product.ProductCapabilityMap.map((mapping) => (
              <div key={mapping.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4 text-sm text-[var(--shell-muted)]">
                {mapping.capabilityKey} · {mapping.coverage} · {mapping.confidence}
                {mapping.CapabilityNode ? ` · ${mapping.CapabilityNode.title}` : ""}
              </div>
            ))}
          </div>
          <form action={upsertProductCapabilityMapAction} className="mt-4 grid gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="returnTo" value={`/admin/products/${product.id}`} />
            <input name="capabilityKey" placeholder="capability_key" className="pat-input" />
            <select name="nodeId" defaultValue="__none__" className="pat-select">
              <option value="__none__">No linked node</option>
              {capabilityNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
            <select name="coverage" defaultValue="CORE" className="pat-select">
              {PRODUCT_CAPABILITY_COVERAGE_OPTIONS.map((coverage) => (
                <option key={coverage} value={coverage}>
                  {coverage}
                </option>
              ))}
            </select>
            <select name="confidence" defaultValue="UNKNOWN" className="pat-select">
              {RESEARCH_CONFIDENCE_OPTIONS.map((confidence) => (
                <option key={confidence} value={confidence}>
                  {confidence}
                </option>
              ))}
            </select>
            <textarea name="notes" rows={2} placeholder="Notes" className="pat-textarea" />
            <button type="submit" className="pat-button-primary">
              Save capability mapping
            </button>
          </form>
        </AdminPanel>
      </section>

      <AdminPanel title="Signal inventory">
        <div className="grid gap-3">
          {product.ProductSignal.map((signal) => (
            <div key={signal.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4 text-sm text-[var(--shell-muted)]">
              {signal.signalKey} · {signal.valueText ?? signal.valueNumber ?? "--"} · {signal.confidence}
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
