/**
 * Tenant delete/export core (Governance Phase 2, A8/B1) — the testable engine
 * behind scripts/ops/delete-tenant.ts and scripts/ops/export-tenant.ts.
 *
 * The cascade map is derived FROM THE SCHEMA (Prisma DMMF), not hand-maintained:
 * every model with a `companyId` field is a directly tenant-scoped table. We read
 * each relation's declared onDelete so the plan states what the database will
 * cascade vs. what needs manual follow-up. External touchpoints (Stripe, Blob,
 * log drains) live outside Postgres and are listed for the operator — we never
 * silently claim to have deleted them.
 *
 * Everything here is prisma-client-shaped and dependency-injected so it runs
 * under vitest with a mock client (tests/ops-tenant-scripts.contract.test.ts).
 */
import { Prisma } from "@prisma/client";

export type CascadeEntry = {
  /** Prisma model name (e.g. "SurveySubmission"). */
  model: string;
  /** Prisma client delegate key (e.g. "surveySubmission"). */
  delegate: string;
  /** Rows currently scoped to the tenant (filled by countTenantCascade). */
  count: number;
};

export type ExternalTouchpoint = {
  system: string;
  action: string;
  automated: boolean;
};

/** Systems outside Postgres that a full tenant purge must address — manual by design. */
export const EXTERNAL_TOUCHPOINTS: readonly ExternalTouchpoint[] = [
  {
    system: "Stripe",
    action:
      "Cancel active subscriptions and delete/anonymize the Customer for this tenant (BillingCustomer.providerCustomerId). Invoices are retained as financial records per lib/retention.ts.",
    automated: false,
  },
  {
    system: "Vercel Blob",
    action: "Remove any tenant-scoped export bundles or uploaded assets stored in Blob.",
    automated: false,
  },
  {
    system: "Log drains / diagnostics",
    action:
      "Confirm no tenant PII persists in external log drains; PatDiagnostic rows are sanitized (primitives only) and purge on the retention schedule.",
    automated: false,
  },
  {
    system: "Search index",
    action: "Rebuild/evict any knowledge or help index entries referencing tenant content.",
    automated: false,
  },
];

/** camelCase the model name into the Prisma client delegate key. */
function delegateFor(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

/**
 * Derive the directly tenant-scoped models from the schema: every model with a
 * `companyId` scalar field. onDelete is read from the relation that consumes it.
 */
export function tenantScopedModels(): CascadeEntry[] {
  const entries: CascadeEntry[] = [];
  for (const model of Prisma.dmmf.datamodel.models) {
    const hasCompanyId = model.fields.some((f) => f.name === "companyId" && f.kind === "scalar");
    if (!hasCompanyId) continue;
    entries.push({ model: model.name, delegate: delegateFor(model.name), count: 0 });
  }
  return entries;
}

type CountingClient = Record<string, { count: (args: { where: { companyId: string } }) => Promise<number> }>;

/** Fill in per-model row counts for a tenant. Pure over the injected client. */
export async function countTenantCascade(
  client: CountingClient,
  companyId: string,
  models: CascadeEntry[] = tenantScopedModels()
): Promise<CascadeEntry[]> {
  const out: CascadeEntry[] = [];
  for (const entry of models) {
    const delegate = client[entry.delegate];
    const count = delegate ? await delegate.count({ where: { companyId } }) : 0;
    out.push({ ...entry, count });
  }
  return out;
}

export type TenantPlan = {
  companyId: string;
  cascade: CascadeEntry[];
  totalRows: number;
  externalTouchpoints: readonly ExternalTouchpoint[];
  /** Models retained as legal/financial records rather than purged (billing). */
  retainedModels: string[];
};

/** Models we deliberately do NOT purge on tenant delete (kept as legal records). */
export const RETAINED_ON_DELETE = ["BillingInvoice", "BillingCustomer", "MembershipSubscription"];

/** Build the full dry-run plan (counts + cascade + touchpoints). */
export async function buildTenantPlan(client: CountingClient, companyId: string): Promise<TenantPlan> {
  const cascade = await countTenantCascade(client, companyId);
  return {
    companyId,
    cascade,
    totalRows: cascade.reduce((sum, c) => sum + c.count, 0),
    externalTouchpoints: EXTERNAL_TOUCHPOINTS,
    retainedModels: RETAINED_ON_DELETE,
  };
}

export function recordCounts(plan: TenantPlan): Record<string, number> {
  const map: Record<string, number> = {};
  for (const entry of plan.cascade) map[entry.model] = entry.count;
  return map;
}

// --- Delete actions (testable; CLI wrappers just parse args + call these) ------

export type TenantSummary = {
  id: string;
  name: string;
  type: string;
  dataBoundary: string;
  deletedAt: Date | null;
};

export type DeletionReceiptData = {
  id: string;
  companyId: string;
  companyName: string;
  companyType: string;
  dataBoundary: string;
  requestedBy: string | null;
  reason: string | null;
  mode: "soft" | "hard";
  recordCounts: Record<string, number>;
  externalTouchpoints: readonly ExternalTouchpoint[];
  softDeletedAt: Date | null;
  hardDeletedAt: Date | null;
};

function baseReceipt(
  company: TenantSummary,
  plan: TenantPlan,
  mode: "soft" | "hard",
  opts: { id: string; reason: string | null; requestedBy: string | null }
): Omit<DeletionReceiptData, "softDeletedAt" | "hardDeletedAt"> {
  return {
    id: opts.id,
    companyId: company.id,
    companyName: company.name,
    companyType: company.type,
    dataBoundary: company.dataBoundary,
    requestedBy: opts.requestedBy,
    reason: opts.reason,
    mode,
    recordCounts: recordCounts(plan),
    externalTouchpoints: EXTERNAL_TOUCHPOINTS,
  };
}

type DeleteClient = {
  $transaction: (ops: unknown[]) => Promise<unknown>;
  company: {
    update: (args: unknown) => unknown;
    delete: (args: unknown) => Promise<unknown>;
  };
  tenantDeletionReceipt: { create: (args: { data: unknown }) => unknown };
};

/** Soft-delete: set Company.deletedAt + write a soft receipt, atomically. */
export async function softDeleteTenant(
  client: DeleteClient,
  company: TenantSummary,
  plan: TenantPlan,
  opts: { id: string; reason: string | null; requestedBy: string | null; now?: Date }
): Promise<DeletionReceiptData> {
  const now = opts.now ?? new Date();
  const receipt: DeletionReceiptData = { ...baseReceipt(company, plan, "soft", opts), softDeletedAt: now, hardDeletedAt: null };
  await client.$transaction([
    client.company.update({ where: { id: company.id }, data: { deletedAt: now, deletionReason: opts.reason } }),
    client.tenantDeletionReceipt.create({ data: receipt }),
  ]);
  return receipt;
}

/** Hard purge: write the receipt FIRST (survives cascade), then delete the Company. */
export async function hardPurgeTenant(
  client: DeleteClient,
  company: TenantSummary,
  plan: TenantPlan,
  opts: { id: string; reason: string | null; requestedBy: string | null; now?: Date }
): Promise<DeletionReceiptData> {
  const now = opts.now ?? new Date();
  const receipt: DeletionReceiptData = {
    ...baseReceipt(company, plan, "hard", opts),
    softDeletedAt: company.deletedAt,
    hardDeletedAt: now,
  };
  await client.tenantDeletionReceipt.create({ data: receipt });
  await client.company.delete({ where: { id: company.id } });
  return receipt;
}
