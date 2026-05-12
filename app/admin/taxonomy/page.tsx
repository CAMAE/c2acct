import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import {
  PRODUCT_CAPABILITY_COVERAGE_OPTIONS,
  RESEARCH_CONFIDENCE_OPTIONS,
  TAXONOMY_BUCKET_KIND_OPTIONS,
  requireAdminSession,
} from "@/lib/adminControlPlane";
import {
  createTaxonomyBucketAction,
  updateTaxonomyBucketAction,
  upsertTaxonomyBucketCapabilityAction,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminTaxonomyPage() {
  await requireAdminSession();
  const [buckets, capabilityNodes] = await Promise.all([
    prisma.taxonomyBucket.findMany({
      orderBy: [{ kind: "asc" }, { title: "asc" }],
      include: {
        Parent: {
          select: { id: true, title: true },
        },
        Children: {
          select: { id: true },
        },
        TaxonomyBucketCapability: {
          include: {
            CapabilityNode: {
              select: { title: true },
            },
          },
          orderBy: { capabilityKey: "asc" },
        },
      },
    }),
    prisma.capabilityNode.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      select: { id: true, key: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Taxonomy"
        description="Manage taxonomy buckets, category hierarchy, and bucket-to-capability mappings used by product and insight intelligence."
      />

      <AdminPanel title="Create taxonomy bucket">
        <form action={createTaxonomyBucketAction} className="grid gap-4 xl:grid-cols-5">
          <input type="hidden" name="returnTo" value="/admin/taxonomy" />
          <input name="key" placeholder="bucket_key" className="pat-input" />
          <input name="title" placeholder="Title" className="pat-input" />
          <select name="kind" defaultValue="FUNCTION" className="pat-select">
            {TAXONOMY_BUCKET_KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <select name="parentId" defaultValue="__none__" className="pat-select">
            <option value="__none__">No parent</option>
            {buckets.map((bucket) => (
              <option key={bucket.id} value={bucket.id}>
                {bucket.title}
              </option>
            ))}
          </select>
          <button type="submit" className="pat-button-primary">
            Create
          </button>
          <textarea name="description" placeholder="Description" className="pat-textarea xl:col-span-5" rows={2} />
        </form>
      </AdminPanel>

      <AdminPanel title="Bucket and mapping management">
        <div className="grid gap-5">
          {buckets.map((bucket) => (
            <div key={bucket.id} className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5">
              <form action={updateTaxonomyBucketAction} className="grid gap-4 xl:grid-cols-5">
                <input type="hidden" name="bucketId" value={bucket.id} />
                <input type="hidden" name="returnTo" value="/admin/taxonomy" />
                <input name="title" defaultValue={bucket.title} className="pat-input" />
                <select name="kind" defaultValue={bucket.kind} className="pat-select">
                  {TAXONOMY_BUCKET_KIND_OPTIONS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
                <select name="parentId" defaultValue={bucket.parentId ?? "__none__"} className="pat-select">
                  <option value="__none__">No parent</option>
                  {buckets.filter((candidate) => candidate.id !== bucket.id).map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 rounded-[18px] border border-[var(--shell-border)] px-4 py-3 text-sm text-[var(--shell-muted)]">
                  <input type="checkbox" name="active" defaultChecked={bucket.active} />
                  Active
                </label>
                <button type="submit" className="pat-button-secondary">
                  Save bucket
                </button>
                <input type="hidden" name="key" value={bucket.key} />
                <textarea
                  name="description"
                  defaultValue={bucket.description ?? ""}
                  className="pat-textarea xl:col-span-5"
                  rows={2}
                />
              </form>

              <div className="mt-5 grid gap-3">
                {bucket.TaxonomyBucketCapability.map((mapping) => (
                  <div key={mapping.id} className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm text-[var(--shell-muted)]">
                    {mapping.capabilityKey} · {mapping.coverage} · {mapping.confidence}
                    {mapping.CapabilityNode ? ` · ${mapping.CapabilityNode.title}` : ""}
                  </div>
                ))}
              </div>

              <form action={upsertTaxonomyBucketCapabilityAction} className="mt-5 grid gap-4 xl:grid-cols-5">
                <input type="hidden" name="bucketId" value={bucket.id} />
                <input type="hidden" name="returnTo" value="/admin/taxonomy" />
                <input name="capabilityKey" placeholder="capability_key" className="pat-input" />
                <select name="nodeId" defaultValue="__none__" className="pat-select">
                  <option value="__none__">No linked node</option>
                  {capabilityNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.title}
                    </option>
                  ))}
                </select>
                <select name="coverage" defaultValue="SUPPORTING" className="pat-select">
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
                <button type="submit" className="pat-button-primary">
                  Save mapping
                </button>
                <textarea name="notes" placeholder="Notes" className="pat-textarea xl:col-span-5" rows={2} />
              </form>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
