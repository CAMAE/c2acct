import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { anthropicApiKeyPresent } from "@/lib/agents/llm";
import { isPatAssistantEnabled } from "@/lib/patAssistant/flags";
import { hasPatConsent } from "@/lib/patAssistant/consent";
import { resolvePatAudience } from "@/lib/patAssistant/audience";
import { buildHelpContext, retrieveHelp } from "@/lib/patAssistant/retrieveHelp";
import { generatePatReply } from "@/lib/patAssistant/model";
import { runAnswerLadder } from "@/lib/patAssistant/ladder";
import { runWebRung } from "@/lib/patAssistant/web/rung";
import { resolveWebSearchProvider } from "@/lib/patAssistant/web/provider";
import { checkWebBudget, recordWebSearch } from "@/lib/patAssistant/web/budget";

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

  // The ladder owns the walk and the gap log. The route owns HTTP: it decides
  // what a decline and a breakage look like on the wire, and nothing else.
  let outcome: Awaited<ReturnType<typeof runAnswerLadder>>;
  try {
    outcome = await runAnswerLadder({
      question,
      audience: resolution.audience,
      // No key present → the ladder declines rather than erroring. The surface
      // is flag-gated anyway, but this keeps a misconfig from 500-ing at the user.
      hasModelKey: anthropicApiKeyPresent,
      retrieve: () =>
        retrieveHelp(question, resolution.audience, 5, {
          unrestricted: resolution.unrestricted,
          // Depth-tier wall: the viewer's server-resolved plan decides whether
          // ELITE corpus depth is readable. Inert today — every source is CORE.
          membershipPlan: resolution.membershipPlan,
        }),
      generate: (chunks) =>
        generatePatReply({ prompt: question, context: buildHelpContext(chunks) }),
      // The web rung (LADDER-2). The route composes it because the route is
      // where the request's identity and the database live — the rung handler
      // itself imports neither, which is what makes the tenant-data firewall
      // provable rather than promised.
      attemptWeb: (scope) =>
        runWebRung({
          question,
          audience: resolution.audience,
          userId: sessionUser.id,
          scope,
          provider: resolveWebSearchProvider(),
          budgetAllows: async () => {
            const verdict = await checkWebBudget(sessionUser.id);
            return { allowed: verdict.allowed, reason: verdict.reason };
          },
          onSearchBilled: (outcome, answered) =>
            recordWebSearch({
              userId: sessionUser.id,
              audience: resolution.audience,
              provider: outcome.provider,
              costUsd: outcome.costUsd,
              answered,
            }),
        }),
    });
  } catch {
    // A generation failure is genuinely exceptional, and distinct from a
    // decline: "we could not answer" is a 200 with fallback copy, "we broke" is
    // a 502. Collapsing them would hide an outage inside a polite message about
    // the help library.
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 502 });
  }

  const citations: PatCitation[] = outcome.chunks.map((chunk) => ({
    path: chunk.sourcePath,
    idx: chunk.chunkIdx,
  }));

  if (outcome.kind === "decline") {
    return fallback(citations);
  }

  if (outcome.kind === "web-answer") {
    // A web answer is shaped differently on the wire because it MUST carry its
    // provenance. The renderer already refused any answer without at least one
    // clickable citation, so `webCitations` is non-empty by construction and
    // `label` is present verbatim — the client cannot render this as if it were
    // Patalign's own documentation.
    return NextResponse.json(
      {
        ok: true,
        answer: outcome.answer.text,
        source: "web",
        webLabel: outcome.answer.label,
        webCitations: outcome.answer.citations,
        insufficientContext: false,
        citations,
      },
      { headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      answer: outcome.reply.text,
      source: "corpus",
      insufficientContext: false,
      escalated: outcome.reply.escalated,
      modelUsed: outcome.reply.modelUsed,
      citations,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
