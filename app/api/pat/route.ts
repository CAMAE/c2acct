import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { anthropicApiKeyPresent } from "@/lib/agents/llm";
import { isPatAssistantEnabled } from "@/lib/patAssistant/flags";
import { resolvePatAudience } from "@/lib/patAssistant/audience";
import { buildHelpContext, retrieveHelp } from "@/lib/patAssistant/retrieveHelp";
import { generatePatReply, type PatReply } from "@/lib/patAssistant/model";

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
    return fallback();
  }

  const chunks = await retrieveHelp(question, resolution.audience, 5, {
    unrestricted: resolution.unrestricted,
  });
  if (chunks.length === 0) {
    return fallback();
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
    return fallback(citations);
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
