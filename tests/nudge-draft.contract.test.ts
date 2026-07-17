import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/session";

/**
 * 16c — Pat-drafted nudges + approval queue. HITL is absolute: draft → consultant
 * approves/edits/dismisses → only THEN a firm Notification. These pin: (1) drafting
 * never sends; (2) approve is the single send path (fans out + records + marks
 * APPROVED, edits applied); (3) dismiss sends nothing; (4) already-decided drafts
 * never re-send; (5) source-scan — no auto-send path exists in the code.
 */

const { db } = vi.hoisted(() => ({
  db: {
    nudgeDraft: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/consultantAccess", () => ({ getConsultantAccessStateForUser: vi.fn() }));
vi.mock("@/lib/notifications/store", () => ({ createNotification: vi.fn(), recordNudge: vi.fn() }));

import { createNudgeDraft, decideNudgeDraft } from "@/lib/notifications/nudgeDraft";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { createNotification, recordNudge } from "@/lib/notifications/store";

const consultant = vi.mocked(getConsultantAccessStateForUser);
const create = vi.mocked(createNotification);
const record = vi.mocked(recordNudge);

const ROOT = path.resolve(__dirname, "..");
function admin(): SessionUser {
  return { id: "admin1", email: "a@x.com", role: "ADMIN", companyId: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  consultant.mockResolvedValue(null);
  db.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
  create.mockResolvedValue({ created: true, notification: { id: "n" } } as Awaited<ReturnType<typeof createNotification>>);
  record.mockResolvedValue(undefined);
});

describe("createNudgeDraft — never sends", () => {
  it("forbidden when unauthorized", async () => {
    const res = await createNudgeDraft({ actor: { ...admin(), role: "MEMBER" }, companyId: "c1", audience: "firm" });
    expect(res).toEqual({ ok: false, reason: "forbidden" });
    expect(db.nudgeDraft.create).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("is idempotent per (company, audience) — reuses an existing PENDING draft", async () => {
    db.nudgeDraft.findFirst.mockResolvedValue({ id: "existing" });
    const res = await createNudgeDraft({ actor: admin(), companyId: "c1", audience: "firm" });
    expect(res).toEqual({ ok: true, draftId: "existing", created: false });
    expect(db.nudgeDraft.create).not.toHaveBeenCalled();
  });

  it("creates a PENDING draft and sends NOTHING", async () => {
    db.nudgeDraft.findFirst.mockResolvedValue(null);
    db.nudgeDraft.create.mockResolvedValue({ id: "new1" });
    const res = await createNudgeDraft({ actor: admin(), companyId: "c1", audience: "firm" });
    expect(res).toEqual({ ok: true, draftId: "new1", created: true });
    expect(db.nudgeDraft.create).toHaveBeenCalledTimes(1);
    expect(db.nudgeDraft.create.mock.calls[0][0].data).toMatchObject({ status: "PENDING", aiGenerated: true });
    expect(create).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
});

describe("decideNudgeDraft — the single send path", () => {
  const pending = { id: "d1", companyId: "c1", audience: "firm", title: "T", body: "B", ctaLabel: "Go", ctaHref: "/firm", aiGenerated: true, status: "PENDING", actorUserId: "admin1" };

  it("not_found for an unknown draft", async () => {
    db.nudgeDraft.findUnique.mockResolvedValue(null);
    expect(await decideNudgeDraft({ actor: admin(), draftId: "x", decision: "approve" })).toEqual({ ok: false, reason: "not_found" });
    expect(create).not.toHaveBeenCalled();
  });

  it("already_decided drafts never re-send", async () => {
    db.nudgeDraft.findUnique.mockResolvedValue({ ...pending, status: "APPROVED" });
    expect(await decideNudgeDraft({ actor: admin(), draftId: "d1", decision: "approve" })).toEqual({ ok: false, reason: "already_decided" });
    expect(create).not.toHaveBeenCalled();
  });

  it("dismiss marks DISMISSED and sends nothing", async () => {
    db.nudgeDraft.findUnique.mockResolvedValue({ ...pending });
    const res = await decideNudgeDraft({ actor: admin(), draftId: "d1", decision: "dismiss" });
    expect(res).toEqual({ ok: true, status: "DISMISSED", recipientsNotified: 0 });
    expect(create).not.toHaveBeenCalled();
    expect(db.nudgeDraft.update.mock.calls[0][0].data).toMatchObject({ status: "DISMISSED" });
  });

  it("approve fans out to every firm user, records each, and marks APPROVED", async () => {
    db.nudgeDraft.findUnique.mockResolvedValue({ ...pending });
    const res = await decideNudgeDraft({ actor: admin(), draftId: "d1", decision: "approve" });
    expect(res).toEqual({ ok: true, status: "APPROVED", recipientsNotified: 2 });
    expect(create).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0]).toMatchObject({ kind: "CONSULTANT_FIRM_NUDGE", sourceType: "NudgeDraft", sourceId: "d1", aiGenerated: true });
    expect(db.nudgeDraft.update.mock.calls[0][0].data).toMatchObject({ status: "APPROVED", edited: false, recipientsNotified: 2 });
  });

  it("approve applies a consultant edit and flags it", async () => {
    db.nudgeDraft.findUnique.mockResolvedValue({ ...pending });
    await decideNudgeDraft({ actor: admin(), draftId: "d1", decision: "approve", body: "Edited body" });
    expect(create.mock.calls[0][0]).toMatchObject({ body: "Edited body" });
    expect(db.nudgeDraft.update.mock.calls[0][0].data).toMatchObject({ edited: true, body: "Edited body" });
  });
});

describe("HITL — no auto-send path exists in the code", () => {
  it("lib/notifications/nudge.ts exports no direct-send helper", () => {
    const text = readFileSync(path.join(ROOT, "lib/notifications/nudge.ts"), "utf8");
    expect(text).not.toMatch(/export\s+(async\s+)?function\s+sendCompanyNudge/);
    // The message helpers live here, but no notification is created in this module.
    expect(text).not.toMatch(/createNotification\s*\(/);
  });

  it("only nudgeDraft.ts turns a nudge into a firm Notification (approve branch)", () => {
    const route = readFileSync(path.join(ROOT, "app/api/notifications/nudge/route.ts"), "utf8");
    // The public nudge route creates a DRAFT, never sends.
    expect(route).toMatch(/createNudgeDraft/);
    expect(route).not.toMatch(/createNotification/);
    const draftLib = readFileSync(path.join(ROOT, "lib/notifications/nudgeDraft.ts"), "utf8");
    expect(draftLib).toMatch(/createNotification\s*\(/); // the send lives here, gated by approve
  });
});
