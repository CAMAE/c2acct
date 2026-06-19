import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTO_KIND } from "@/lib/notifications/planPings";

/**
 * gatherPingTargets query-shape + date-fact coverage (the integration-risk
 * surface). Mocks the prisma boundary and the firm/vendor completion pipelines
 * so we assert the PingTarget this builds: completion routing (firm vs vendor),
 * epoch-ms date facts, the nearest-future-quarter filter (with nowMs injected),
 * the prior-sends / ignored-count query shapes, recipients, and the consultant.
 */

const { db } = vi.hoisted(() => ({
  db: {
    ecosystem: { findMany: vi.fn() },
    surveyModule: { findUnique: vi.fn() },
    surveySubmission: { findFirst: vi.fn() },
    engagementQuarter: { findFirst: vi.fn() },
    nudgeEvent: { count: vi.fn() },
    notification: { count: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/firmPat", () => ({
  getFirmAssessmentProgress: vi.fn(async () => []),
  summarizeFirmAlignmentProgress: vi.fn(() => ({ completionPercent: 40 })),
}));
vi.mock("@/lib/vendorPat", () => ({
  deriveVendorProductAssessmentCompletionStatus: vi.fn(() => ({ completed: true })),
  VENDOR_PRODUCT_MODULE_KEY: "vendor_product_alignment_v1",
}));
vi.mock("@/lib/surveyDrafts", () => ({ getSurveyFinalWhere: (w: unknown) => w }));

import { gatherPingTargets } from "@/lib/notifications/gather";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 18, 12, 0, 0);

beforeEach(() => {
  vi.clearAllMocks();
  db.surveyModule.findUnique.mockResolvedValue({ id: "vm1" });
  db.surveySubmission.findFirst.mockResolvedValue({
    id: "s1",
    score: 90,
    createdAt: new Date(NOW - 3 * DAY),
    answeredCount: 10,
    answers: {},
  });
  db.engagementQuarter.findFirst.mockResolvedValue({ targetPercent: 80, dueDate: new Date(NOW + 10 * DAY) });
  db.nudgeEvent.count.mockResolvedValue(1);
  db.notification.count.mockResolvedValue(2);
  db.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
});

describe("gatherPingTargets", () => {
  it("builds firm + vendor targets with correct facts", async () => {
    db.ecosystem.findMany.mockResolvedValue([
      {
        id: "e1",
        vendorCompanyId: "vendor1",
        ConsultantProfile: { userId: "cuser1" },
        EcosystemFirm: [{ firmCompanyId: "firm1" }],
      },
    ]);

    const targets = await gatherPingTargets(NOW);
    expect(targets).toHaveLength(2);

    const firm = targets.find((t) => t.companyId === "firm1");
    expect(firm).toEqual({
      companyId: "firm1",
      audience: "firm",
      completionPercent: 40, // from summarizeFirmAlignmentProgress
      lastActivityMs: NOW - 3 * DAY, // createdAt.getTime()
      quarterTargetPercent: 80,
      quarterDueMs: NOW + 10 * DAY, // dueDate.getTime()
      priorSends: 1,
      ignoredCount: 2,
      recipientUserIds: ["u1", "u2"],
      consultantUserId: "cuser1",
    });

    const vendor = targets.find((t) => t.companyId === "vendor1");
    expect(vendor?.audience).toBe("vendor");
    expect(vendor?.completionPercent).toBe(100); // completed: true → 100
    expect(vendor?.consultantUserId).toBe("cuser1");
  });

  it("filters the quarter to dueDate >= now and keys counts by AUTO_KIND/manual", async () => {
    db.ecosystem.findMany.mockResolvedValue([
      {
        id: "e1",
        vendorCompanyId: null,
        ConsultantProfile: { userId: "cuser1" },
        EcosystemFirm: [{ firmCompanyId: "firm1" }],
      },
    ]);

    await gatherPingTargets(NOW);

    expect(db.engagementQuarter.findFirst.mock.calls[0][0]).toMatchObject({
      where: { companyId: "firm1", dueDate: { gte: new Date(NOW) } },
      orderBy: { dueDate: "asc" },
    });
    expect(db.nudgeEvent.count).toHaveBeenCalledWith({
      where: { sourceType: "Company", sourceId: "firm1", kind: AUTO_KIND.firm, manual: false },
    });
    expect(db.notification.count).toHaveBeenCalledWith({
      where: { sourceType: "Company", sourceId: "firm1", kind: AUTO_KIND.firm, readAt: null },
    });
  });

  it("handles no quarter, no activity, and no vendor", async () => {
    db.engagementQuarter.findFirst.mockResolvedValue(null);
    db.surveySubmission.findFirst.mockResolvedValue(null);
    db.ecosystem.findMany.mockResolvedValue([
      {
        id: "e1",
        vendorCompanyId: null,
        ConsultantProfile: null,
        EcosystemFirm: [{ firmCompanyId: "firm1" }],
      },
    ]);

    const targets = await gatherPingTargets(NOW);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      quarterTargetPercent: null,
      quarterDueMs: null,
      lastActivityMs: 0,
      consultantUserId: null,
    });
  });
});
