import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for lib/briefEditChoice.ts. Mocks Prisma at the module
 * boundary; no DB required. The companion integration test
 * (tests/brief-edit-choice-tenancy.contract.test.ts) drives a real
 * prisma client to prove Invariant 3 end-to-end.
 */

type MockAssignment = {
  vendorCompanyId: string | null;
  firmCompanyIds: string[];
};

const assignmentByKey = new Map<string, MockAssignment | null>();
const upsertCalls: Array<{ where: unknown; create: unknown; update: unknown }> = [];
const findManyByConsultantAndBriefId = new Map<
  string,
  Array<{ sectionKey: string; choiceType: string; choiceValue: string }>
>();

vi.mock("@/lib/prisma", () => ({
  default: {
    consultantAssignment: {
      findFirst: vi.fn(async ({ where }: { where: { consultantProfileId: string; ecosystemId: string } }) => {
        const key = `${where.consultantProfileId}::${where.ecosystemId}`;
        const ecosystem = assignmentByKey.get(key);
        if (!ecosystem) return null;
        return {
          Ecosystem: {
            vendorCompanyId: ecosystem.vendorCompanyId,
            EcosystemFirm: ecosystem.firmCompanyIds.map((firmCompanyId) => ({ firmCompanyId })),
          },
        };
      }),
    },
    briefEditChoice: {
      upsert: vi.fn(async ({ where, update, create }: { where: unknown; update: { choiceValue: string }; create: { briefId: string; sectionKey: string; consultantProfileId: string; choiceType: string; choiceValue: string } }) => {
        upsertCalls.push({ where, update, create });
        return {
          id: `choice-${upsertCalls.length}`,
          choiceValue: update.choiceValue ?? create.choiceValue,
          updatedAt: new Date("2026-05-17T12:00:00Z"),
        };
      }),
      findMany: vi.fn(async ({ where }: { where: { consultantProfileId: string; briefId: string } }) => {
        const key = `${where.consultantProfileId}::${where.briefId}`;
        return findManyByConsultantAndBriefId.get(key) ?? [];
      }),
    },
  },
}));

async function loadAPI() {
  return import("@/lib/briefEditChoice");
}

beforeEach(() => {
  assignmentByKey.clear();
  upsertCalls.length = 0;
  findManyByConsultantAndBriefId.clear();
});

function bindConsultant(
  consultantProfileId: string,
  ecosystemId: string,
  ecosystem: MockAssignment
) {
  assignmentByKey.set(`${consultantProfileId}::${ecosystemId}`, ecosystem);
}

describe("upsertBriefEditChoiceForConsultant", () => {
  it("happy-path PHRASING_VARIANT upsert returns ok + writes one row", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: ["firm-A1"],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
    expect(result.ok).toBe(true);
    expect(upsertCalls).toHaveLength(1);
  });

  it("happy-path EMPHASIS upsert with comma-joined target ids", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "EMPHASIS",
      choiceValue: "headline,confidence-callout",
    });
    expect(result.ok).toBe(true);
  });

  it("happy-path ORDERING upsert with comma-joined unique tokens", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.action-roadmap",
      choiceType: "ORDERING",
      choiceValue: "item-1,item-2,item-3",
    });
    expect(result.ok).toBe(true);
  });

  it("repeat upsert with same key is idempotent (prisma upsert handles dedupe)", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const input = {
      briefKind: "vendor" as const,
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary" as const,
      choiceType: "PHRASING_VARIANT" as const,
      choiceValue: "v1-measured",
    };
    await upsertBriefEditChoiceForConsultant("c-A", input);
    const result = await upsertBriefEditChoiceForConsultant("c-A", input);
    expect(result.ok).toBe(true);
    // Both calls use the same compound-key where clause — the unique index
    // collapses to one row in real prisma. Our mock just records both calls.
    expect(upsertCalls).toHaveLength(2);
    expect(upsertCalls[0].where).toEqual(upsertCalls[1].where);
  });

  it("invalid-section: unknown sectionKey rejected", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      // @ts-expect-error — intentionally unknown section key
      sectionKey: "vendor.not-a-section",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-measured",
    });
    expect(result).toEqual({ ok: false, reason: "invalid-section" });
  });

  it("invalid-section: choiceType not allowed for section (ORDERING on executive-summary)", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "ORDERING",
      choiceValue: "a,b,c",
    });
    expect(result).toEqual({ ok: false, reason: "invalid-section" });
  });

  it("invalid-choice: PHRASING_VARIANT with unknown variant id", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "unknown-variant",
    });
    expect(result).toEqual({ ok: false, reason: "invalid-choice" });
  });

  it("invalid-choice: EMPHASIS with target id not in section allowlist", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "EMPHASIS",
      choiceValue: "headline,bogus-target",
    });
    expect(result).toEqual({ ok: false, reason: "invalid-choice" });
  });

  it("invalid-choice: ORDERING with duplicate ids", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.action-roadmap",
      choiceType: "ORDERING",
      choiceValue: "a,a,b",
    });
    expect(result).toEqual({ ok: false, reason: "invalid-choice" });
  });

  it("invalid-choice: ORDERING with empty token", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.action-roadmap",
      choiceType: "ORDERING",
      choiceValue: "a,,b",
    });
    expect(result).toEqual({ ok: false, reason: "invalid-choice" });
  });

  it("not-found: consultant has no assignment in this ecosystem (cross-consultant probe)", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    // Consultant B tries to write to A's ecosystem — assignment lookup
    // returns null because no row matches (B, eco-A).
    const result = await upsertBriefEditChoiceForConsultant("c-B", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-measured",
    });
    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(upsertCalls).toHaveLength(0);
  });

  it("not-found: cross-vendor probe (briefId belongs to a different vendor)", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-B", // not eco-A's vendor
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-measured",
    });
    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(upsertCalls).toHaveLength(0);
  });

  it("not-found: cross-ecosystem-firm probe (firm exists in a different ecosystem)", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: ["firm-A1"],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "firm",
      briefId: "firm-B1", // belongs to a different ecosystem
      ecosystemId: "eco-A",
      sectionKey: "firm.alignment-header",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-measured",
    });
    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(upsertCalls).toHaveLength(0);
  });

  it("tenancy beats validation: forged briefId with unknown variant returns not-found, NOT invalid-choice", async () => {
    // Information-disclosure defense: a malformed payload to someone
    // else's brief must not leak the variant-id allowlist via a richer
    // error code. This is the reason-code parity rule.
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-B", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "unknown-variant",
    });
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("empty-string choiceValue accepted as 'clear choice' sentinel", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const result = await upsertBriefEditChoiceForConsultant("c-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "",
    });
    expect(result.ok).toBe(true);
  });
});

describe("getBriefEditChoicesForConsultant", () => {
  it("returns the choice map for the calling consultant's brief", async () => {
    const { getBriefEditChoicesForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    findManyByConsultantAndBriefId.set("c-A::vendor-A", [
      {
        sectionKey: "vendor.executive-summary",
        choiceType: "PHRASING_VARIANT",
        choiceValue: "v1-pointed",
      },
      {
        sectionKey: "vendor.action-roadmap",
        choiceType: "EMPHASIS",
        choiceValue: "bullet-commitment",
      },
    ]);
    const map = await getBriefEditChoicesForConsultant("c-A", "vendor", "vendor-A", "eco-A");
    expect(map.size).toBe(2);
    expect(map.get("vendor.executive-summary::PHRASING_VARIANT")).toEqual({
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
    expect(map.get("vendor.action-roadmap::EMPHASIS")).toEqual({
      choiceType: "EMPHASIS",
      choiceValue: "bullet-commitment",
    });
  });

  it("returns empty Map on tenancy mismatch (read-path leak check)", async () => {
    const { getBriefEditChoicesForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    // Even if there are rows for c-A's brief, c-B can't read them.
    findManyByConsultantAndBriefId.set("c-A::vendor-A", [
      {
        sectionKey: "vendor.executive-summary",
        choiceType: "PHRASING_VARIANT",
        choiceValue: "v1-pointed",
      },
    ]);
    const map = await getBriefEditChoicesForConsultant("c-B", "vendor", "vendor-A", "eco-A");
    expect(map.size).toBe(0);
  });

  it("returns empty Map when briefId is not in the consultant's ecosystem", async () => {
    const { getBriefEditChoicesForConsultant } = await loadAPI();
    bindConsultant("c-A", "eco-A", {
      vendorCompanyId: "vendor-A",
      firmCompanyIds: [],
    });
    const map = await getBriefEditChoicesForConsultant("c-A", "vendor", "vendor-B", "eco-A");
    expect(map.size).toBe(0);
  });
});
