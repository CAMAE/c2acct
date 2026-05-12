import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cross-consultant denial contract — Invariant 3 (docs/tenancy.md).
 *
 * Day-17 Block 5. Proves the BriefEditChoice server-action API holds the
 * tenancy contract end-to-end: a consultant can edit their own brief; a
 * forged briefId or a foreign ecosystemId always returns 'not-found' and
 * never leaks the section-key allowlist or variant allowlist through a
 * richer error code (the reason-code parity rule).
 *
 * Fixture: two consultants (A, B) each owning a distinct ecosystem with
 * a distinct vendor + distinct firm. The mock prisma client records every
 * upsert so cross-write attempts can be verified to leave no rows behind.
 *
 * Convention note: this file uses the repo's mocked-prisma pattern (same
 * as tests/tenancy.contract.test.ts) rather than a real database. The
 * mock is shaped to exercise the same `consultantAssignment.findFirst →
 * briefEditChoice.upsert` sequence the real client would run.
 */

type AssignmentRow = {
  consultantProfileId: string;
  ecosystemId: string;
  ecosystem: {
    vendorCompanyId: string | null;
    firmCompanyIds: string[];
  };
};

const assignments: AssignmentRow[] = [];
const choiceRows: Array<{
  id: string;
  briefId: string;
  sectionKey: string;
  choiceType: string;
  choiceValue: string;
  consultantProfileId: string;
}> = [];

vi.mock("@/lib/prisma", () => ({
  default: {
    consultantAssignment: {
      findFirst: vi.fn(async ({ where }: { where: { consultantProfileId: string; ecosystemId: string } }) => {
        const row = assignments.find(
          (a) =>
            a.consultantProfileId === where.consultantProfileId &&
            a.ecosystemId === where.ecosystemId
        );
        if (!row) return null;
        return {
          Ecosystem: {
            vendorCompanyId: row.ecosystem.vendorCompanyId,
            EcosystemFirm: row.ecosystem.firmCompanyIds.map((firmCompanyId) => ({ firmCompanyId })),
          },
        };
      }),
    },
    briefEditChoice: {
      upsert: vi.fn(
        async ({
          where,
          update,
          create,
        }: {
          where: {
            briefId_sectionKey_consultantProfileId_choiceType: {
              briefId: string;
              sectionKey: string;
              consultantProfileId: string;
              choiceType: string;
            };
          };
          update: { choiceValue: string };
          create: {
            briefId: string;
            sectionKey: string;
            consultantProfileId: string;
            choiceType: string;
            choiceValue: string;
          };
        }) => {
          const key = where.briefId_sectionKey_consultantProfileId_choiceType;
          const existing = choiceRows.find(
            (row) =>
              row.briefId === key.briefId &&
              row.sectionKey === key.sectionKey &&
              row.consultantProfileId === key.consultantProfileId &&
              row.choiceType === key.choiceType
          );
          if (existing) {
            existing.choiceValue = update.choiceValue;
            return {
              id: existing.id,
              choiceValue: existing.choiceValue,
              updatedAt: new Date("2026-05-17T12:00:00Z"),
            };
          }
          const row = {
            id: `choice-${choiceRows.length + 1}`,
            ...create,
          };
          choiceRows.push(row);
          return {
            id: row.id,
            choiceValue: row.choiceValue,
            updatedAt: new Date("2026-05-17T12:00:00Z"),
          };
        }
      ),
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { consultantProfileId: string; briefId: string };
        }) => {
          return choiceRows
            .filter(
              (row) =>
                row.consultantProfileId === where.consultantProfileId &&
                row.briefId === where.briefId
            )
            .map((row) => ({
              sectionKey: row.sectionKey,
              choiceType: row.choiceType,
              choiceValue: row.choiceValue,
            }));
        }
      ),
    },
  },
}));

async function loadAPI() {
  return import("@/lib/briefEditChoice");
}

beforeEach(() => {
  assignments.length = 0;
  choiceRows.length = 0;

  // Consultant A owns ecosystem A with vendor-A and firm-A1.
  assignments.push({
    consultantProfileId: "consultant-A",
    ecosystemId: "eco-A",
    ecosystem: { vendorCompanyId: "vendor-A", firmCompanyIds: ["firm-A1"] },
  });
  // Consultant B owns ecosystem B with vendor-B and firm-B1.
  assignments.push({
    consultantProfileId: "consultant-B",
    ecosystemId: "eco-B",
    ecosystem: { vendorCompanyId: "vendor-B", firmCompanyIds: ["firm-B1"] },
  });
});

describe("BriefEditChoice cross-consultant denial (Invariant 3)", () => {
  it("[1] Consultant A writes a PHRASING_VARIANT for their own vendor brief — succeeds, one row in DB", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    const result = await upsertBriefEditChoiceForConsultant("consultant-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
    expect(result.ok).toBe(true);
    expect(choiceRows).toHaveLength(1);
    expect(choiceRows[0]).toMatchObject({
      briefId: "vendor-A",
      consultantProfileId: "consultant-A",
      choiceValue: "v1-pointed",
    });
  });

  it("[2] Consultant A reads their own brief's choices — returns the row from [1]", async () => {
    const { upsertBriefEditChoiceForConsultant, getBriefEditChoicesForConsultant } =
      await loadAPI();
    await upsertBriefEditChoiceForConsultant("consultant-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
    const map = await getBriefEditChoicesForConsultant(
      "consultant-A",
      "vendor",
      "vendor-A",
      "eco-A"
    );
    expect(map.size).toBe(1);
    expect(map.get("vendor.executive-summary::PHRASING_VARIANT")).toEqual({
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
  });

  it("[3] Consultant B tries to write to A's vendor brief — not-found, no row leaks", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    // Pre-existing row from A so we can prove B's attempt doesn't add a second.
    await upsertBriefEditChoiceForConsultant("consultant-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
    expect(choiceRows).toHaveLength(1);

    // B tries to write to A's vendor brief via A's ecosystem id (forged).
    const result1 = await upsertBriefEditChoiceForConsultant("consultant-B", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
    expect(result1).toEqual({ ok: false, reason: "not-found" });

    // B tries to write A's brief id under B's own ecosystem (foreign briefId).
    const result2 = await upsertBriefEditChoiceForConsultant("consultant-B", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-B",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
    expect(result2).toEqual({ ok: false, reason: "not-found" });

    // Still only A's original row.
    expect(choiceRows).toHaveLength(1);
  });

  it("[4] Consultant B tries to write using A's ecosystemId — assignment lookup rejects (not-found)", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    const result = await upsertBriefEditChoiceForConsultant("consultant-B", {
      briefKind: "firm",
      briefId: "firm-B1", // B's own firm
      ecosystemId: "eco-A", // but A's ecosystem
      sectionKey: "firm.alignment-header",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-measured",
    });
    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(choiceRows).toHaveLength(0);
  });

  it("[5] Consultant B reads choices for A's brief — empty Map, no leak", async () => {
    const { upsertBriefEditChoiceForConsultant, getBriefEditChoicesForConsultant } =
      await loadAPI();
    await upsertBriefEditChoiceForConsultant("consultant-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-pointed",
    });
    const map = await getBriefEditChoicesForConsultant(
      "consultant-B",
      "vendor",
      "vendor-A",
      "eco-A"
    );
    expect(map.size).toBe(0);
  });

  it("[6] Consultant A with unknown variant id — invalid-choice (tenancy passes, validation rejects)", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    const result = await upsertBriefEditChoiceForConsultant("consultant-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      sectionKey: "vendor.executive-summary",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "unknown-variant-id",
    });
    expect(result).toEqual({ ok: false, reason: "invalid-choice" });
  });

  it("[7] Consultant A with unknown section key — invalid-section", async () => {
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();
    const result = await upsertBriefEditChoiceForConsultant("consultant-A", {
      briefKind: "vendor",
      briefId: "vendor-A",
      ecosystemId: "eco-A",
      // @ts-expect-error — intentionally unknown sectionKey
      sectionKey: "vendor.not-a-real-section",
      choiceType: "PHRASING_VARIANT",
      choiceValue: "v1-measured",
    });
    expect(result).toEqual({ ok: false, reason: "invalid-section" });
  });

  it("[8] reason-code parity: every (forged-briefId, ANY payload) tuple returns not-found — tenancy short-circuits before validation", async () => {
    // The information-disclosure defense. A forged briefId must NEVER
    // leak the section-key allowlist or variant-id allowlist via a
    // richer error code. Tenancy MUST beat validation to the punch.
    const { upsertBriefEditChoiceForConsultant } = await loadAPI();

    // Permutations: consultant B attacking A's brief with valid AND
    // invalid section/choice values. Every one must return not-found.
    const probes = [
      // valid section + valid choice value
      {
        sectionKey: "vendor.executive-summary" as const,
        choiceType: "PHRASING_VARIANT" as const,
        choiceValue: "v1-measured",
      },
      // valid section + INVALID choice value — would normally return invalid-choice
      {
        sectionKey: "vendor.executive-summary" as const,
        choiceType: "PHRASING_VARIANT" as const,
        choiceValue: "unknown-variant-id",
      },
      // INVALID section + valid choice value — would normally return invalid-section
      {
        sectionKey: "vendor.does-not-exist" as unknown as
          | "vendor.executive-summary"
          | "vendor.self-vs-market-delta"
          | "vendor.action-roadmap"
          | "firm.alignment-header"
          | "firm.stack-fit-analysis"
          | "firm.six-quarter-roadmap",
        choiceType: "PHRASING_VARIANT" as const,
        choiceValue: "v1-measured",
      },
      // INVALID section + INVALID choice value
      {
        sectionKey: "vendor.does-not-exist" as unknown as
          | "vendor.executive-summary"
          | "vendor.self-vs-market-delta"
          | "vendor.action-roadmap"
          | "firm.alignment-header"
          | "firm.stack-fit-analysis"
          | "firm.six-quarter-roadmap",
        choiceType: "EMPHASIS" as const,
        choiceValue: "bogus-target",
      },
      // valid section + INVALID choiceType for that section
      {
        sectionKey: "vendor.executive-summary" as const,
        choiceType: "ORDERING" as const,
        choiceValue: "a,b,c",
      },
    ];

    for (const probe of probes) {
      const result = await upsertBriefEditChoiceForConsultant("consultant-B", {
        briefKind: "vendor",
        briefId: "vendor-A", // A's brief, B is attacker
        ecosystemId: "eco-A", // A's ecosystem id, forged
        ...probe,
      });
      expect(result).toEqual({ ok: false, reason: "not-found" });
    }

    // No rows leaked from B's attack attempts.
    expect(choiceRows.filter((r) => r.consultantProfileId === "consultant-B")).toHaveLength(0);
  });
});
