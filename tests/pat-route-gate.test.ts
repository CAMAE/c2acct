import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gate-ladder unit test for app/api/pat/route.ts. Every dependency is mocked at
 * the module boundary (no DB, no network). Proves the route fails closed —
 * flag → auth → input → audience → key → grounded answer — and never takes an
 * action, only returns text.
 */

vi.mock("@/lib/patAssistant/flags", () => ({ isPatAssistantEnabled: vi.fn() }));
vi.mock("@/lib/patAssistant/consent", () => ({ hasPatConsent: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/agents/llm", () => ({ anthropicApiKeyPresent: vi.fn() }));
vi.mock("@/lib/patAssistant/audience", () => ({ resolvePatAudience: vi.fn() }));
vi.mock("@/lib/patAssistant/retrieveHelp", () => ({
  retrieveHelp: vi.fn(),
  buildHelpContext: vi.fn(() => "ctx"),
}));
vi.mock("@/lib/patAssistant/model", () => ({ generatePatReply: vi.fn() }));

import { POST } from "@/app/api/pat/route";
import { isPatAssistantEnabled } from "@/lib/patAssistant/flags";
import { hasPatConsent } from "@/lib/patAssistant/consent";
import { getSessionUser } from "@/lib/auth/session";
import { anthropicApiKeyPresent } from "@/lib/agents/llm";
import { resolvePatAudience } from "@/lib/patAssistant/audience";
import { retrieveHelp } from "@/lib/patAssistant/retrieveHelp";
import { generatePatReply } from "@/lib/patAssistant/model";

const flag = vi.mocked(isPatAssistantEnabled);
const consent = vi.mocked(hasPatConsent);
const session = vi.mocked(getSessionUser);
const keyPresent = vi.mocked(anthropicApiKeyPresent);
const audience = vi.mocked(resolvePatAudience);
const retrieve = vi.mocked(retrieveHelp);
const generate = vi.mocked(generatePatReply);

function call(question: unknown) {
  const req = new Request("http://localhost/api/pat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return POST(req);
}

const aChunk = { text: "t", sourceKind: "help_doc", sourcePath: "help/x.md", chunkIdx: 0, rank: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  flag.mockReturnValue(true);
  consent.mockResolvedValue(true);
  session.mockResolvedValue({ id: "u1", email: "u@x.com", role: "MEMBER", companyId: "c1" });
  audience.mockResolvedValue({ audience: "vendor", unrestricted: false });
  keyPresent.mockReturnValue(true);
  retrieve.mockResolvedValue([aChunk]);
  generate.mockResolvedValue({ text: "Go to Settings.", modelUsed: "fast", escalated: false, insufficientContext: false });
});

describe("POST /api/pat — fails closed", () => {
  it("404 when the flag is off", async () => {
    flag.mockReturnValue(false);
    expect((await call("hi")).status).toBe(404);
  });

  it("401 when unauthenticated", async () => {
    session.mockResolvedValue(null);
    expect((await call("hi")).status).toBe(401);
  });

  it("404 when the user has not consented", async () => {
    consent.mockResolvedValue(false);
    const res = await call("hi");
    expect(res.status).toBe(404);
    expect(generate).not.toHaveBeenCalled();
  });

  it("400 on an empty question", async () => {
    expect((await call("   ")).status).toBe(400);
  });

  it("403 when no audience resolves", async () => {
    audience.mockResolvedValue(null);
    expect((await call("hi")).status).toBe(403);
  });

  it("degrades to fallback (200) when no API key is present", async () => {
    keyPresent.mockReturnValue(false);
    const res = await call("hi");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insufficientContext).toBe(true);
    expect(body.answer).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns the contact-support fallback when retrieval finds nothing", async () => {
    retrieve.mockResolvedValue([]);
    const res = await call("hi");
    const body = await res.json();
    expect(body.insufficientContext).toBe(true);
    expect(generate).not.toHaveBeenCalled();
  });
});

describe("POST /api/pat — happy path", () => {
  it("returns a grounded answer with citations", async () => {
    const res = await call("where do I review an assessment?");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.answer).toBe("Go to Settings.");
    expect(body.insufficientContext).toBe(false);
    expect(body.citations).toEqual([{ path: "help/x.md", idx: 0 }]);
  });

  it("passes the unrestricted flag through for consultant/admin callers", async () => {
    audience.mockResolvedValue({ audience: "consultant", unrestricted: true });
    await call("anything");
    expect(retrieve).toHaveBeenCalledWith("anything", "consultant", 5, { unrestricted: true });
  });
});
