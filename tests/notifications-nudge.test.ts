import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Authorization + fan-out unit test for the manual nudge path. Mocks the prisma
 * boundary, the consultant-access lookup, and the store (no DB). isAdminRole is
 * real (pure). The trust boundary under test: only admins or in-scope consultants
 * can nudge a company; everyone else is denied.
 */

const { db } = vi.hoisted(() => ({ db: { user: { findMany: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/consultantAccess", () => ({ getConsultantAccessStateForUser: vi.fn() }));
vi.mock("@/lib/notifications/store", () => ({ createNotification: vi.fn(), recordNudge: vi.fn() }));

import { authorizeCompanyNudge, sendCompanyNudge } from "@/lib/notifications/nudge";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { createNotification, recordNudge } from "@/lib/notifications/store";

const consultant = vi.mocked(getConsultantAccessStateForUser);
const create = vi.mocked(createNotification);
const record = vi.mocked(recordNudge);

function user(role: SessionUser["role"]): SessionUser {
  return { id: "actor1", email: "a@x.com", role, companyId: null };
}

function consultantState(firmId: string) {
  return {
    sessionUser: user("MEMBER"),
    consultantProfileId: "cp1",
    consultantLabel: "Jane Consultant",
    ecosystems: [
      {
        assignmentId: "a1",
        ecosystemId: "e1",
        ecosystemName: "Eco",
        vendorCompanyId: "v1",
        vendorCompanyName: "Vendor",
        firmCompanies: [{ id: firmId, name: "Firm" }],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
  create.mockResolvedValue({ created: true, notification: { id: "n" } } as Awaited<ReturnType<typeof createNotification>>);
  record.mockResolvedValue(undefined);
  consultant.mockResolvedValue(null);
});

describe("authorizeCompanyNudge", () => {
  it("admins may nudge any company (no consultant lookup)", async () => {
    const res = await authorizeCompanyNudge(user("ADMIN"), "firm1");
    expect(res).toEqual({ kind: "admin" });
    expect(consultant).not.toHaveBeenCalled();
  });

  it("consultants may nudge a company in their ecosystem scope", async () => {
    consultant.mockResolvedValue(consultantState("firm1"));
    const res = await authorizeCompanyNudge(user("MEMBER"), "firm1");
    expect(res).toEqual({ kind: "consultant", consultantLabel: "Jane Consultant" });
  });

  it("denies a consultant nudging a company outside their scope", async () => {
    consultant.mockResolvedValue(consultantState("firm1"));
    expect(await authorizeCompanyNudge(user("MEMBER"), "other")).toEqual({ kind: "denied" });
  });

  it("denies a plain member with no consultant access", async () => {
    expect(await authorizeCompanyNudge(user("MEMBER"), "firm1")).toEqual({ kind: "denied" });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("sendCompanyNudge", () => {
  it("refuses when unauthorized (no recipients touched)", async () => {
    const res = await sendCompanyNudge({ actor: user("MEMBER"), companyId: "firm1", audience: "firm" });
    expect(res).toEqual({ ok: false, reason: "forbidden" });
    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns no_recipients when the company has no users", async () => {
    db.user.findMany.mockResolvedValue([]);
    const res = await sendCompanyNudge({ actor: user("ADMIN"), companyId: "firm1", audience: "firm" });
    expect(res).toEqual({ ok: false, reason: "no_recipients" });
    expect(create).not.toHaveBeenCalled();
  });

  it("fans out to every recipient and records each nudge", async () => {
    const res = await sendCompanyNudge({ actor: user("ADMIN"), companyId: "firm1", audience: "firm" });
    expect(res).toEqual({ ok: true, recipients: 2, created: 2 });
    expect(create).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledTimes(2);
  });
});
