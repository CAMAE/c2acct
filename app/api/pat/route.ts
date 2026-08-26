import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { anthropicApiKeyPresent } from "@/lib/agents/llm";
import { isPatAssistantEnabled } from "@/lib/patAssistant/flags";
import { hasPatConsent } from "@/lib/patAssistant/consent";
import { resolvePatAudience } from "@/lib/patAssistant/audience";
import { buildHelpContext, retrieveHelp } from "@/lib/patAssistant/retrieveHelp";
import { generatePatReply, type PatReply } from "@/lib/patAssistant/model";
import { DECLINE_RUNGS, recordPatDecline } from "@/lib/patAssistant/declineLog";

export const dynamic = "force-dynamic";

const MAX_QUESTION_CHARS = 1000;
const FALLBACK_MESSAGE =
  "I don't have that in my help library yet. Please reach out to support and we'll get you an answer.";

type PatCitation = { path: string; idx: number };

function fallback(citations: PatCitation[] = []) {
  return NextResponse.json(
    { ok: true, answer: null, fallback: FALLBACK_MESSAGE, insufficientContext: true, citations },
    { headers: { "cache-control": "no-store" } }
  );
}

/**
 * Decline + log, in one call, so the two can never drift apart (corpus program).
 *
 * Every path that returns the fallback goes through here. A decline that is not
 * logged is a gap the corpus program cannot see, and the only reliable way to
 * guarantee that is to make declining and logging the same act rather than two
 * things a future edit has to remember to do together.
 *
 * The log write is guarded HERE as well as inside recordPatDecline. That is not
 * redundant: recordPatDecline swallowing its own errors is an implementation
 * detail of the logger, while "a gap-log failure never reaches the user" is a
 * property of this route. Depending on the former to get the latter means one
 * refactor of the logger silently turns a database blip into a failed help
 * answer. The user came for an answer, not for analytics.
 */
async function declineAndLog(input: {
  question: string;
  audience: string;
  rungReached: string;
  citations?: PatCitation[];
}) {
  try {
    await recordPatDecline({
      question: input.question,
      audience: input.audience,
      rungReached: input.rungReached,
    });
  } catch {
    // Deliberately swallowed — see the docblock above.
  }
  return fallback(input.citations ?? []);
}

/**
 * Pat chat endpoint (Phase A). Flag-gated, session-scoped, grounded-only.
 * Pipeline: resolve audience server-side → role-scoped help retrieval → if no
 * context, return the contact-support fallback (never guess) → otherwise the
 * Haiku→Sonnet cascade composes a grounded answer with citations. Pat produces
 * text only; it takes no actions.
 */
export async function POST(req: Request) {
  if (!isPatAssistantEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Consent gate: Pat is opt-in. Without it, the endpoint is invisible (404), the
  // same as the flag being off — never a 403 that would confirm the surface exists.
  if (!(await hasPatConsent(sessionUser.id))) {
    return NextResponse.json({ ok: false, error: "consent_required" }, { status: 404 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const raw =
    body && typeof body === "object" && "question" in body
      ? (body as { question?: unknown }).question
      : undefined;
  const question = typeof raw === "string" ? raw.trim().slice(0, MAX_QUESTION_CHARS) : "";
  if (!question) {
    return NextResponse.json({ ok: false, error: "empty_question" }, { status: 400 });
  }

  const resolution = await resolvePatAudience(sessionUser);
  if (!resolution) {
    return NextResponse.json({ ok: false, error: "no_audience" }, { status: 403 });
  }

  // No key present → degrade to the fallback rather than erroring. The surface is
  // flag-gated anyway, but this keeps a misconfig from 500-ing at the user.
  if (!anthropicApiKeyPresent()) {
    return declineAndLog({
      question,
      audience: resolution.audience,
      rungReached: DECLINE_RUNGS.UNAVAILABLE,
    });
  }

  const chunks = await retrieveHelp(question, resolution.audience, 5, {
    unrestricted: resolution.unrestricted,
    // Depth-tier wall: the viewer's server-resolved plan decides whether ELITE
    // corpus depth is readable. Inert today — every source is CORE.
    membershipPlan: resolution.membershipPlan,
  });
  if (chunks.length === 0) {
    return declineAndLog({
      question,
      audience: resolution.audience,
      rungReached: DECLINE_RUNGS.CORPUS_MISS,
    });
  }

  let reply: PatReply;
  try {
    reply = await generatePatReply({ prompt: question, context: buildHelpContext(chunks) });
  } catch {
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 502 });
  }

  const citations: PatCitation[] = chunks.map((chunk) => ({
    path: chunk.sourcePath,
    idx: chunk.chunkIdx,
  }));

  if (reply.insufficientContext) {
    return declineAndLog({
      question,
      audience: resolution.audience,
      rungReached: DECLINE_RUNGS.CORPUS_INSUFFICIENT,
      citations,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      answer: reply.text,
      insufficientContext: false,
      escalated: reply.escalated,
      modelUsed: reply.modelUsed,
      citations,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
