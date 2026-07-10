/**
 * Data retention & lifecycle policy (Governance Phase 2, A8).
 *
 * Retention is CONFIG, not scattered magic numbers. Every data class has: a
 * retention window, a hard-purge policy, and a stated legal/operational basis.
 * The tenant-delete flow (scripts/ops/delete-tenant.ts) soft-deletes first, keeps
 * the tenant for TENANT_SOFT_DELETE_WINDOW_DAYS (recovery + dispute), then hard
 * purges. The B2B contract path (right-to-delete + export) is built on this.
 *
 * These windows are DEFAULTS for the pilot; an attorney/DPA finalizes the binding
 * numbers (see docs/legal/). Nothing here deletes automatically — the scripts are
 * dry-run by default and operator-run.
 */

export type RetentionClassKey =
  | "tenant_soft_delete"
  | "operator_audit"
  | "billing_records"
  | "billing_webhook_events"
  | "agent_audit"
  | "pat_diagnostics"
  | "notifications"
  | "deletion_receipts";

export type RetentionPolicy = {
  key: RetentionClassKey;
  label: string;
  /** Window in days after which the class is eligible for purge. `null` = retained indefinitely. */
  retentionDays: number | null;
  /** Whether data in this class is hard-deleted (true) or retained as a legal/audit record (false). */
  hardPurge: boolean;
  /** Why this window exists — the defensible basis, stated. */
  basis: string;
};

/** Days a soft-deleted tenant is retained before hard purge is permitted. */
export const TENANT_SOFT_DELETE_WINDOW_DAYS = 30;

export const RETENTION_POLICIES: Readonly<Record<RetentionClassKey, RetentionPolicy>> = {
  tenant_soft_delete: {
    key: "tenant_soft_delete",
    label: "Soft-deleted tenant data",
    retentionDays: TENANT_SOFT_DELETE_WINDOW_DAYS,
    hardPurge: true,
    basis:
      "Recovery + dispute window after a delete request. Hard purge permitted once the window elapses.",
  },
  operator_audit: {
    key: "operator_audit",
    label: "Operator audit events",
    retentionDays: 365 * 2,
    hardPurge: false,
    basis: "Accountability record (who acted on whom). Retained for audit; not user content.",
  },
  billing_records: {
    key: "billing_records",
    label: "Billing invoices & customer records",
    retentionDays: 365 * 7,
    hardPurge: false,
    basis: "Tax/financial-records retention (7-year default). Survives tenant delete as a legal record.",
  },
  billing_webhook_events: {
    key: "billing_webhook_events",
    label: "Billing webhook events (idempotency ledger)",
    retentionDays: 400,
    hardPurge: true,
    basis: "Idempotency + reconciliation ledger; safe to purge after reconciliation settles.",
  },
  agent_audit: {
    key: "agent_audit",
    label: "Agent audit log",
    retentionDays: 365,
    hardPurge: true,
    basis: "Operational agent-run trail; no customer PII by design.",
  },
  pat_diagnostics: {
    key: "pat_diagnostics",
    label: "Runtime diagnostics",
    retentionDays: 90,
    hardPurge: true,
    basis: "Short-lived operational telemetry; sanitized (primitives only) at write.",
  },
  notifications: {
    key: "notifications",
    label: "Notifications & deliveries",
    retentionDays: 180,
    hardPurge: true,
    basis: "Transient in-product messaging; purged after the surface no longer needs history.",
  },
  deletion_receipts: {
    key: "deletion_receipts",
    label: "Tenant deletion receipts",
    retentionDays: null,
    hardPurge: false,
    basis: "Tombstone proof a tenant was deleted. Retained indefinitely; never an FK to Company.",
  },
} as const;

/** Whether a timestamp is past its class retention window as of `now`. */
export function isPastRetention(
  key: RetentionClassKey,
  since: Date,
  now: Date = new Date()
): boolean {
  const policy = RETENTION_POLICIES[key];
  if (policy.retentionDays === null) return false;
  const ageMs = now.getTime() - since.getTime();
  return ageMs >= policy.retentionDays * 24 * 60 * 60 * 1000;
}

/** Whether a soft-deleted tenant is eligible for hard purge. */
export function isTenantPurgeEligible(deletedAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!deletedAt) return false;
  return isPastRetention("tenant_soft_delete", deletedAt, now);
}
