import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gate-ladder unit tests for the notification read route and the nudge route.
 * Every dependency is mocked at the module boundary (no DB). Both routes must
 * fail closed: flag off → 404, unauthenticated → 401, bad input → 400.
 */

vi.mock("@/lib/patAssistant/flags", () => ({ isPingsEnabled: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/notifications/store", () => ({
  listForUser: vi.fn(),
  unreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));
vi.mock("@/lib/notifications/nudge", () => ({ sendCompanyNudge: vi.fn() }));

import { GET, POST as readPost } from "@/app/api/notifications/route";
import { POST as nudgePost } from "@/app/api/notifications/nudge/route";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { getSessionUser } from "@/lib/auth/session";
import { listForUser, unreadCount } from "@/lib/notifications/store";
import { sendCompanyNudge } from "@/lib/notifications/nudge";

const flag = vi.mocked(isPingsEnabled);
const session = vi.mocked(getSessionUser);
const list = vi.mocked(listForUser);
const unread = vi.mocked(unreadCount);
const send = vi.mocked(sendCompanyNudge);

function jsonReq(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  flag.mockReturnValue(true);
  session.mockResolvedValue({ id: "u1", email: "u@x.com", role: "MEMBER", companyId: "c1" });
  list.mockResolvedValue([]);
  unread.mockResolvedValue(0);
  send.mockResolvedValue({ ok: true, recipients: 2, created: 2 });
});

describe("GET /api/notifications", () => {
  it("404 when pings disabled", async () => {
    flag.mockReturnValue(false);
    expect((await GET()).status).toBe(404);
  });
  it("401 when unauthenticated", async () => {
    session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
  it("200 with the caller's inbox", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.notifications).toEqual([]);
  });
});

describe("POST /api/notifications (mark read)", () => {
  it("400 when neither id nor all is provided", async () => {
    const res = await readPost(jsonReq("http://localhost/api/notifications", {}));
    expect(res.status).toBe(400);
  });
  it("200 on mark-all", async () => {
    const res = await readPost(jsonReq("http://localhost/api/notifications", { all: true }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/notifications/nudge", () => {
  it("404 when pings disabled", async () => {
    flag.mockReturnValue(false);
    expect((await nudgePost(jsonReq("http://localhost/api/notifications/nudge", { companyId: "c1", audience: "firm" }))).status).toBe(404);
  });
  it("401 when unauthenticated", async () => {
    session.mockResolvedValue(null);
    expect((await nudgePost(jsonReq("http://localhost/api/notifications/nudge", { companyId: "c1", audience: "firm" }))).status).toBe(401);
  });
  it("400 on a bad audience", async () => {
    const res = await nudgePost(jsonReq("http://localhost/api/notifications/nudge", { companyId: "c1", audience: "nope" }));
    expect(res.status).toBe(400);
  });
  it("403 when the actor isn't authorized", async () => {
    send.mockResolvedValue({ ok: false, reason: "forbidden" });
    const res = await nudgePost(jsonReq("http://localhost/api/notifications/nudge", { companyId: "c1", audience: "firm" }));
    expect(res.status).toBe(403);
  });
  it("200 on a successful nudge", async () => {
    const res = await nudgePost(jsonReq("http://localhost/api/notifications/nudge", { companyId: "c1", audience: "firm" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, recipients: 2, created: 2 });
  });
});
