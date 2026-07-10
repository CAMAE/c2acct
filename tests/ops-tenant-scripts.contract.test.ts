import { describe, expect, it, vi } from "vitest";
import {
  tenantScopedModels,
  buildTenantPlan,
  recordCounts,
  softDeleteTenant,
  hardPurgeTenant,
  EXTERNAL_TOUCHPOINTS,
  RETAINED_ON_DELETE,
  type TenantSummary,
} from "@/scripts/ops/_tenantOps";
import {
  isTenantPurgeEligible,
  isPastRetention,
  TENANT_SOFT_DELETE_WINDOW_DAYS,
  RETENTION_POLICIES,
} from "@/lib/retention";

/**
 * Tenant delete/export ops (Governance Phase 2, A8/B1). Proves the cascade map is
 * schema-derived, the plan counts every scoped model, and the soft/hard delete
 * actions write a receipt tombstone with the right shape. Runs under vitest with a
 * mock prisma client (no DB) — the "e2e" is the full action path exercised.
 */

const COMPANY: TenantSummary = {
  id: "firm-x",
  name: "Firm X",
  type: "FIRM",
  dataBoundary: "PRODUCTION",
  deletedAt: null,
};

describe("cascade map is derived from the schema", () => {
  it("includes directly company-scoped models and excludes unscoped ones", () => {
    const names = tenantScopedModels().map((m) => m.model);
    // Directly scoped (have companyId) — present.
    expect(names).toContain("SurveySubmission");
    expect(names).toContain("CompanyBadge");
    expect(names).toContain("CompanyCapabilityScore");
    expect(names).toContain("Product");
    expect(names).toContain("User");
    // Global/reference tables (no companyId) — never in the tenant cascade.
    expect(names).not.toContain("Badge");
    expect(names).not.toContain("BenchmarkCohort");
    expect(names).not.toContain("CapabilityNode");
  });

  it("delegate keys are camelCase of the model name", () => {
    const survey = tenantScopedModels().find((m) => m.model === "SurveySubmission");
    expect(survey?.delegate).toBe("surveySubmission");
  });
});

describe("plan counts every scoped model with a companyId filter", () => {
  it("counts per model and sums totals; never counts unscoped models", async () => {
    const seen: string[] = [];
    const client = new Proxy(
      {},
      {
        get: (_t, prop: string) => ({
          count: vi.fn(async (args: { where: { companyId: string } }) => {
            seen.push(prop);
            expect(args.where.companyId).toBe("firm-x");
            return prop === "surveySubmission" ? 12 : 1;
          }),
        }),
      }
    );

    const plan = await buildTenantPlan(client as never, "firm-x");
    const models = tenantScopedModels();
    // Every scoped model was counted with the tenant filter.
    expect(seen.length).toBe(models.length);
    expect(plan.cascade.find((c) => c.model === "SurveySubmission")?.count).toBe(12);
    expect(plan.totalRows).toBe(12 + (models.length - 1));
    expect(recordCounts(plan).SurveySubmission).toBe(12);
    expect(plan.externalTouchpoints).toBe(EXTERNAL_TOUCHPOINTS);
    expect(plan.retainedModels).toEqual(RETAINED_ON_DELETE);
  });
});

describe("soft delete sets deletedAt + writes a soft receipt atomically", () => {
  it("wraps the update and receipt in one $transaction", async () => {
    const txOps: unknown[] = [];
    const client = {
      $transaction: vi.fn(async (ops: unknown[]) => {
        txOps.push(...ops);
        return [];
      }),
      company: { update: vi.fn((a) => ({ __op: "update", a })), delete: vi.fn() },
      tenantDeletionReceipt: { create: vi.fn((a) => ({ __op: "create", a })) },
    };
    const plan = { companyId: "firm-x", cascade: [{ model: "SurveySubmission", delegate: "surveySubmission", count: 3 }], totalRows: 3, externalTouchpoints: EXTERNAL_TOUCHPOINTS, retainedModels: RETAINED_ON_DELETE };
    const now = new Date("2026-07-10T00:00:00Z");

    const receipt = await softDeleteTenant(client as never, COMPANY, plan, {
      id: "rcpt-1",
      reason: "customer request",
      requestedBy: "op-1",
      now,
    });

    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(txOps).toHaveLength(2);
    expect(client.company.update).toHaveBeenCalledWith({
      where: { id: "firm-x" },
      data: { deletedAt: now, deletionReason: "customer request" },
    });
    expect(receipt.mode).toBe("soft");
    expect(receipt.softDeletedAt).toBe(now);
    expect(receipt.hardDeletedAt).toBeNull();
    expect(receipt.recordCounts.SurveySubmission).toBe(3);
    expect(receipt.reason).toBe("customer request");
  });
});

describe("hard purge writes the receipt BEFORE deleting the company", () => {
  it("receipt create precedes company.delete (tombstone survives the cascade)", async () => {
    const order: string[] = [];
    const client = {
      $transaction: vi.fn(),
      company: { update: vi.fn(), delete: vi.fn(async () => order.push("delete")) },
      tenantDeletionReceipt: { create: vi.fn(async () => order.push("receipt")) },
    };
    const plan = { companyId: "firm-x", cascade: [], totalRows: 0, externalTouchpoints: EXTERNAL_TOUCHPOINTS, retainedModels: RETAINED_ON_DELETE };
    const softDeletedAt = new Date("2026-06-01T00:00:00Z");

    const receipt = await hardPurgeTenant(
      client as never,
      { ...COMPANY, deletedAt: softDeletedAt },
      plan,
      { id: "rcpt-2", reason: null, requestedBy: null, now: new Date("2026-07-10T00:00:00Z") }
    );

    expect(order).toEqual(["receipt", "delete"]);
    expect(client.company.delete).toHaveBeenCalledWith({ where: { id: "firm-x" } });
    expect(receipt.mode).toBe("hard");
    expect(receipt.softDeletedAt).toBe(softDeletedAt);
    expect(receipt.hardDeletedAt).not.toBeNull();
  });
});

describe("retention window gates hard purge", () => {
  it("not eligible before the window; eligible after", () => {
    const now = new Date("2026-07-10T00:00:00Z");
    const justDeleted = new Date("2026-07-09T00:00:00Z");
    const longAgo = new Date("2026-05-01T00:00:00Z");
    expect(isTenantPurgeEligible(null, now)).toBe(false);
    expect(isTenantPurgeEligible(justDeleted, now)).toBe(false);
    expect(isTenantPurgeEligible(longAgo, now)).toBe(true);
  });

  it("indefinite-retention classes never pass their window", () => {
    expect(RETENTION_POLICIES.deletion_receipts.retentionDays).toBeNull();
    expect(isPastRetention("deletion_receipts", new Date("1970-01-01"), new Date())).toBe(false);
    expect(TENANT_SOFT_DELETE_WINDOW_DAYS).toBe(30);
  });
});
