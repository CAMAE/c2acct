import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gate-ladder unit test for app/api/pat/route.ts. Every dependency is mocked at
 * the module boundary (no DB, no network). Proves the route fails closed —
 * flag → auth → input → audience → key → grounded answer — and never takes an
 * action, only returns text.
 */

vi.mock("@/lib/patAssistant/flags", () => ({
  isPatAssistantEnabled: vi.fn(),
  // The ladder reads this. A partial module mock leaves it undefined, which
  // throws inside the ladder and surfaces as a 502 — the route's "we broke"
  // branch — so an omission here looks like a routing bug rather than a mock gap.
  isPatLadderEnabled: vi.fn(() => false),
  // Same lesson as isPatLadderEnabled above, one box later: the web rung reads
  // this, and a partial module mock leaves it undefined, which throws and
  // surfaces as a 502.
  isPatWebTierEnabled: vi.fn(() => false),
}));
// The web tier is mocked out entirely here: this suite is "no DB, no network",
// and resolveWebSearchProvider / checkWebBudget reach both. The rung's own
// behaviour is proved in tests/pat-web-tier.contract.test.ts.
vi.mock("@/lib/patAssistant/web/provider", () => ({ resolveWebSearchProvider: vi.fn(() => null) }));
vi.mock("@/lib/patAssistant/web/budget", () => ({
  checkWebBudget: vi.fn(async () => ({ allowed: false, reason: "global_cap_exhausted" })),
  recordWebSearch: vi.fn(async () => {}),
}));
vi.mock("@/lib/patAssistant/consent", () => ({ hasPatConsent: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/agents/llm", () => ({ anthropicApiKeyPresent: vi.fn() }));
vi.mock("@/lib/patAssistant/audience", () => ({ resolvePatAudience: vi.fn() }));
vi.mock("@/lib/patAssistant/retrieveHelp", () => ({
  retrieveHelp: vi.fn(),
  buildHelpContext: vi.fn(() => "ctx"),
}));
vi.mock("@/lib/patAssistant/model", () => ({ generatePatReply: vi.fn() }));
// The gap log is mocked, not exercised: this suite is "no DB, no network", and a
// real write here would put junk rows in the dev database. Its CONTENT is proved
// in tests/pat-decline-log.contract.test.ts; what matters here is that every
// decline path calls it, which is asserted below.
vi.mock("@/lib/patAssistant/declineLog", async () => {
  const actual = await vi.importActual<typeof import("@/lib/patAssistant/declineLog")>(
    "@/lib/patAssistant/declineLog"
  );
  return { ...actual, recordPatDecline: vi.fn(async () => {}) };
});

import { POST } from "@/app/api/pat/route";
import { isPatAssistantEnabled, isPatLadderEnabled } from "@/lib/patAssistant/flags";
import { hasPatConsent } from "@/lib/patAssistant/consent";
import { getSessionUser } from "@/lib/auth/session";
import { anthropicApiKeyPresent } from "@/lib/agents/llm";
import { resolvePatAudience } from "@/lib/patAssistant/audience";
import { retrieveHelp } from "@/lib/patAssistant/retrieveHelp";
import { generatePatReply } from "@/lib/patAssistant/model";
import { DECLINE_RUNGS, recordPatDecline } from "@/lib/patAssistant/declineLog";

const flag = vi.mocked(isPatAssistantEnabled);
const ladderFlag = vi.mocked(isPatLadderEnabled);
const consent = vi.mocked(hasPatConsent);
const session = vi.mocked(getSessionUser);
const keyPresent = vi.mocked(anthropicApiKeyPresent);
const audience = vi.mocked(resolvePatAudience);
const retrieve = vi.mocked(retrieveHelp);
const generate = vi.mocked(generatePatReply);
const decline = vi.mocked(recordPatDecline);

function call(question: unknown) {
  const req = new Request("http://localhost/api/pat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return POST(req);
}

const aChunk = {
  text: "t",
  rawText: "t",
  sourceKind: "help_doc",
  sourcePath: "help/x.md",
  chunkIdx: 0,
  rank: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  flag.mockReturnValue(true);
  ladderFlag.mockReturnValue(false);
  consent.mockResolvedValue(true);
  session.mockResolvedValue({ id: "u1", email: "u@x.com", role: "MEMBER", companyId: "c1" });
  audience.mockResolvedValue({ audience: "vendor", unrestricted: false, membershipPlan: "PRO" });
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
    audience.mockResolvedValue({ audience: "consultant", unrestricted: true, membershipPlan: "NO_MEMBERSHIP" });
    await call("anything");
    expect(retrieve).toHaveBeenCalledWith("anything", "consultant", 5, {
      unrestricted: true,
      membershipPlan: "NO_MEMBERSHIP",
    });
  });
});

/**
 * Corpus program (c) — a decline that is not logged is a gap the corpus program
 * cannot see. Every path that returns the fallback must record one, so the
 * assertion is per-path rather than "logging exists somewhere".
 */
describe("POST /api/pat — every decline is logged", () => {
  it("logs a corpus miss when retrieval returns nothing", async () => {
    retrieve.mockResolvedValue([]);
    await call("something we have no help for");
    expect(decline).toHaveBeenCalledWith({
      question: "something we have no help for",
      audience: "vendor",
      rungReached: DECLINE_RUNGS.CORPUS_MISS,
    });
  });

  it("logs an unavailable decline when no model key is present", async () => {
    keyPresent.mockReturnValue(false);
    await call("anything");
    expect(decline).toHaveBeenCalledWith({
      question: "anything",
      audience: "vendor",
      rungReached: DECLINE_RUNGS.UNAVAILABLE,
    });
  });

  it("logs an insufficient-context decline when the model cannot ground an answer", async () => {
    generate.mockResolvedValue({
      text: "INSUFFICIENT_CONTEXT",
      modelUsed: "strong",
      escalated: true,
      insufficientContext: true,
    });
    await call("a question the corpus half-matches");
    expect(decline).toHaveBeenCalledWith({
      question: "a question the corpus half-matches",
      audience: "vendor",
      rungReached: DECLINE_RUNGS.CORPUS_INSUFFICIENT,
    });
  });

  it("does NOT log when Pat actually answers", async () => {
    // The gap log is a record of failure. Logging a success would make the
    // digest's "what is the corpus missing" question unanswerable.
    await call("where do I find settings");
    expect(decline).not.toHaveBeenCalled();
  });

  it("never lets a gap-log failure reach the user", async () => {
    // recordPatDecline swallows its own errors; this proves the route does not
    // reintroduce the failure by awaiting it unguarded.
    decline.mockRejectedValueOnce(new Error("db down"));
    retrieve.mockResolvedValue([]);
    const res = await call("anything");
    expect(res.status).toBe(200);
  });
});
