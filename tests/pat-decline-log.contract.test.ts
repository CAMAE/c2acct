import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { REDACTED_KEYNAME, REDACTED_SECRET } from "@/lib/agents/redact";
import {
  DECLINE_RUNGS,
  getPatDeclineDigest,
  recordPatDecline,
  redactQuestion,
  weekAgo,
} from "@/lib/patAssistant/declineLog";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";

/**
 * The Pat decline (gap) log — corpus program (c).
 *
 * Two properties matter and neither is provable by inspection:
 *   1. what is stored is REDACTED, so a pasted credential does not become a row;
 *   2. logging NEVER fails the request.
 *
 * The redaction half runs with no database. The digest half runs against real
 * Postgres and SKIPS visibly when none is reachable, matching the Block A suites.
 */

applyRepoEnv();

const NS = "test-decline-log";
const DB_TIMEOUT_MS = 60_000;

let prisma: typeof import("@/lib/prisma").default;
let dbAvailable = false;

async function cleanup() {
  if (!dbAvailable) return;
  await prisma.patDeclineLog.deleteMany({ where: { audience: { startsWith: NS } } });
}

beforeAll(async () => {
  prisma = (await import("@/lib/prisma")).default;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    return;
  }
  await cleanup();
}, DB_TIMEOUT_MS);

afterAll(async () => {
  await cleanup();
  if (dbAvailable) await prisma.$disconnect();
}, DB_TIMEOUT_MS);

describe("questions are redacted before storage", () => {
  it("redacts a pasted credential", () => {
    // The realistic failure: a user pastes a key into the chat box while asking
    // why their integration is failing. Without this, the gap log becomes a
    // second durable home for live credentials.
    const redacted = redactQuestion(
      "why does my key sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAA not work"
    );
    expect(redacted).toBe(REDACTED_SECRET);
    expect(redacted).not.toContain("sk-ant-");
  });

  it("redacts a connection string", () => {
    const redacted = redactQuestion("is postgres://user:hunter2@db.example.com/app reachable?");
    expect(redacted).not.toContain("hunter2");
  });

  it("leaves an ordinary question intact", () => {
    // Redaction is lossy on purpose, but a corpus author still needs to read the
    // question. An ordinary one must survive verbatim.
    const question = "where do I find the alignment board?";
    expect(redactQuestion(question)).toBe(question);
  });

  it("uses the SAME redactor as the audit trail", () => {
    // One definition of "credential-shaped", so the two cannot drift apart.
    expect([REDACTED_SECRET, REDACTED_KEYNAME]).toContain(redactQuestion("sk-ant-" + "x".repeat(24)));
  });
});

describe("the rung vocabulary", () => {
  it("pins the known rungs", () => {
    expect(DECLINE_RUNGS).toEqual({
      SCOPE_GATE: "scope_gate",
      CORPUS_MISS: "corpus_miss",
      CORPUS_INSUFFICIENT: "corpus_insufficient",
      // LADDER-2: the web rung was attempted and still produced nothing citable.
      WEB: "web",
      UNAVAILABLE: "unavailable",
    });
  });
});

describe("the log and its weekly digest (DB-backed)", () => {
  it("stores a redacted row carrying no identity", async (ctx) => {
    if (!dbAvailable) return ctx.skip();

    await recordPatDecline({
      question: "how do I export sk-ant-api03-BBBBBBBBBBBBBBBBBBBBBBBB",
      audience: `${NS}-vendor`,
      rungReached: DECLINE_RUNGS.CORPUS_MISS,
    });

    const row = await prisma.patDeclineLog.findFirst({
      where: { audience: `${NS}-vendor` },
      orderBy: { createdAt: "desc" },
    });
    expect(row).not.toBeNull();
    expect(row!.questionRedacted).not.toContain("sk-ant-");
    expect(row!.rungReached).toBe(DECLINE_RUNGS.CORPUS_MISS);
    expect(row!.verticalId).toBe(DEFAULT_VERTICAL_ID);
    // No identity columns exist to populate — the table answers "what is the
    // corpus missing for this audience?", never "what did this tenant ask?".
    expect(Object.keys(row!)).toEqual(
      expect.arrayContaining(["id", "questionRedacted", "audience", "verticalId", "rungReached", "createdAt"])
    );
    expect(Object.keys(row!)).not.toContain("userId");
    expect(Object.keys(row!)).not.toContain("companyId");
    expect(Object.keys(row!)).not.toContain("subjectId");
  }, DB_TIMEOUT_MS);

  it("never throws, even when the write fails", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    // A gap log that can 500 a help answer is worse than no gap log. The column
    // is NOT NULL, so a null audience is a guaranteed write failure.
    await expect(
      recordPatDecline({
        question: "anything",
        audience: null as unknown as string,
        rungReached: DECLINE_RUNGS.CORPUS_MISS,
      })
    ).resolves.toBeUndefined();
  }, DB_TIMEOUT_MS);

  it("groups the digest by audience, vertical and rung, busiest first", async (ctx) => {
    if (!dbAvailable) return ctx.skip();

    for (let i = 0; i < 3; i += 1) {
      await recordPatDecline({
        question: `question ${i}`,
        audience: `${NS}-firm`,
        rungReached: DECLINE_RUNGS.CORPUS_MISS,
      });
    }
    await recordPatDecline({
      question: "a scope-gated question",
      audience: `${NS}-firm`,
      rungReached: DECLINE_RUNGS.SCOPE_GATE,
    });

    const digest = await getPatDeclineDigest(weekAgo());
    const mine = digest.byGroup.filter((row) => row.audience.startsWith(NS));
    const miss = mine.find((row) => row.rungReached === DECLINE_RUNGS.CORPUS_MISS);
    const gate = mine.find((row) => row.rungReached === DECLINE_RUNGS.SCOPE_GATE);

    expect(miss?.declines).toBeGreaterThanOrEqual(3);
    expect(gate?.declines).toBe(1);
    // Busiest first, so the digest reads as a ranked worklist.
    const counts = digest.byGroup.map((row) => row.declines);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  }, DB_TIMEOUT_MS);

  it("returns a capped sample of recent redacted questions", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const digest = await getPatDeclineDigest(weekAgo(), new Date(), 2);
    expect(digest.recentQuestions.length).toBeLessThanOrEqual(2);
    for (const entry of digest.recentQuestions) {
      expect(entry.questionRedacted).not.toContain("sk-ant-");
    }
  }, DB_TIMEOUT_MS);

  it("windows on the requested range", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    // A window entirely in the past holds nothing this run just wrote.
    const longAgo = new Date(Date.UTC(2020, 0, 1));
    const alsoLongAgo = new Date(Date.UTC(2020, 0, 2));
    const digest = await getPatDeclineDigest(longAgo, alsoLongAgo);
    expect(digest.total).toBe(0);
    expect(digest.byGroup).toEqual([]);
  }, DB_TIMEOUT_MS);
});
