import prisma from "@/lib/prisma";
import { redactValue } from "@/lib/agents/redact";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";

/**
 * The Pat decline (gap) log — corpus program (c).
 *
 * Every question Pat refuses to answer is written here. A decline is the single
 * most informative event the assistant produces: a real user, a real audience, a
 * real question the corpus could not answer. Discarded, it leaves corpus
 * authoring to guesswork about what people wanted; kept, it is a ranked worklist.
 *
 * THREE rules, all of them load-bearing:
 *
 *   1. The question is REDACTED through the audit redactor before it is stored.
 *      A user who pastes an API key or a connection string into a chat box must
 *      not thereby write it into a second durable table. Same redactor as the
 *      audit trail, so there is one definition of "credential-shaped" and it
 *      cannot drift between the two.
 *   2. NO identity is stored — no userId, companyId or subjectId. This table
 *      answers "what is the corpus missing for firms?", never "what did this
 *      firm ask?". The second is a per-tenant question history, which is a
 *      different product needing different consent.
 *   3. Logging NEVER fails the request. A gap log that can 500 a help answer is
 *      worse than no gap log: the user came for an answer, not for analytics.
 *      Write failures are swallowed after a warn.
 */

/**
 * How far up the answer ladder a question got before it was declined.
 *
 * String rather than an enum so a later rung can be logged without a migration —
 * this is analytics, and a rung name it has never seen should show up in the
 * digest as an unknown rung rather than fail the write that was trying to record
 * it. The known values are pinned by contract test.
 */
export const DECLINE_RUNGS = {
  /** The scope gate rejected the question before any retrieval (LADDER-1). */
  SCOPE_GATE: "scope_gate",
  /** The corpus was searched and had nothing to ground an answer on. */
  CORPUS_MISS: "corpus_miss",
  /** The corpus matched, but no tier could answer confidently from it. */
  CORPUS_INSUFFICIENT: "corpus_insufficient",
  /** Retrieval never ran: no model key present. */
  UNAVAILABLE: "unavailable",
} as const;

export type DeclineRung = (typeof DECLINE_RUNGS)[keyof typeof DECLINE_RUNGS];

export type RecordDeclineInput = {
  question: string;
  audience: string;
  rungReached: string;
  verticalId?: string;
};

/** Redact a question for storage. Exported so the contract test can assert on it. */
export function redactQuestion(question: string): string {
  const redacted = redactValue(question);
  return typeof redacted === "string" ? redacted : String(redacted);
}

/**
 * Record one decline. Fire-and-forget by contract: returns void and never
 * throws, so a caller can `await` it without risking the user's answer.
 */
export async function recordPatDecline(input: RecordDeclineInput): Promise<void> {
  try {
    await prisma.patDeclineLog.create({
      data: {
        questionRedacted: redactQuestion(input.question),
        audience: input.audience,
        rungReached: input.rungReached,
        verticalId: input.verticalId ?? DEFAULT_VERTICAL_ID,
      },
    });
  } catch (error) {
    // Never fail the request for the sake of the gap log.
    console.warn("[pat] decline log write failed", error);
  }
}

export type DeclineDigestRow = {
  audience: string;
  verticalId: string;
  rungReached: string;
  declines: number;
};

export type DeclineDigest = {
  since: Date;
  until: Date;
  total: number;
  /** Counts grouped by (audience, vertical, rung), busiest first. */
  byGroup: DeclineDigestRow[];
  /** The most recent redacted questions, newest first — the authoring worklist. */
  recentQuestions: Array<{ questionRedacted: string; audience: string; rungReached: string; createdAt: Date }>;
};

/** Default digest window: the trailing seven days. */
export function weekAgo(now = new Date()): Date {
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}

/**
 * The weekly digest — small on purpose.
 *
 * Two aggregates and a capped sample, not a browsable log viewer. The question
 * this answers is "where is the corpus thin this week", and that is a handful of
 * rows; anything larger invites reading the table as a transcript, which is
 * exactly the use the no-identity rule exists to prevent.
 *
 * Admin-readable: the caller is responsible for the admin gate, the same way
 * every other admin surface in the app is.
 */
export async function getPatDeclineDigest(
  since: Date = weekAgo(),
  until: Date = new Date(),
  sampleSize = 25
): Promise<DeclineDigest> {
  const window = { gte: since, lte: until };

  const [grouped, recent, total] = await Promise.all([
    prisma.patDeclineLog.groupBy({
      by: ["audience", "verticalId", "rungReached"],
      where: { createdAt: window },
      _count: { _all: true },
    }),
    prisma.patDeclineLog.findMany({
      where: { createdAt: window },
      orderBy: { createdAt: "desc" },
      take: sampleSize,
      select: { questionRedacted: true, audience: true, rungReached: true, createdAt: true },
    }),
    prisma.patDeclineLog.count({ where: { createdAt: window } }),
  ]);

  const byGroup: DeclineDigestRow[] = grouped
    .map((row) => ({
      audience: row.audience,
      verticalId: row.verticalId,
      rungReached: row.rungReached,
      declines: row._count._all,
    }))
    // Busiest first, then a stable tiebreak so the digest is deterministic.
    .sort(
      (left, right) =>
        right.declines - left.declines ||
        left.audience.localeCompare(right.audience) ||
        left.verticalId.localeCompare(right.verticalId) ||
        left.rungReached.localeCompare(right.rungReached)
    );

  return { since, until, total, byGroup, recentQuestions: recent };
}
