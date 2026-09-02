import { NextResponse } from "next/server";
import { anthropicApiKeyPresent } from "@/lib/agents/llm";
import { PUBLIC_AUDIENCE } from "@/lib/patAssistant/audienceTokens";
import { runAnswerLadder } from "@/lib/patAssistant/ladder";
import { generatePatReply } from "@/lib/patAssistant/model";
import { checkPublicInput } from "@/lib/patAssistant/public/limits";
import { filterPublicAnswer } from "@/lib/patAssistant/public/outputFilter";
import {
  checkPublicUsage,
  publicTierAvailability,
  recordPublicUsage,
} from "@/lib/patAssistant/public/usage";
import { buildHelpContext, retrieveHelp } from "@/lib/patAssistant/retrieveHelp";

export const dynamic = "force-dynamic";

/**
 * PUBLIC Pat endpoint — rungs 1 and 4 only (BOX 3).
 *
 * The unauthenticated half of the answer ladder: the public corpus shelf, or an
 * honest decline with an invitation to sign in. Nothing else is reachable from
 * here, and most of that is by CONSTRUCTION rather than by check.
 *
 * ## Anonymous by construction
 *
 * This route never reads a session and never accepts one. It does not import
 * getSessionUser, does not look at cookies, and passes `audience: "public"` with
 * `publicEntry: true` and nothing else into retrieval. A signed-in visitor who
 * hits this endpoint is simply another anonymous caller — there is no code path
 * by which their privileges could flow in, so there is no code path to get
 * wrong. A contract test pins the absence of those imports.
 *
 * ## The web tier is unreachable, also by construction
 *
 * `runAnswerLadder` reaches rung 3 only through its `attemptWeb` callback. This
 * route does not pass one. The web tier is therefore not "disabled here" — it
 * does not exist on this path, and no flag flip anywhere can make it appear.
 *
 * ## Order of operations is SPEND-SHAPED
 *
 *   availability -> IP / session / input -> retrieval -> answer or decline
 *   -> output filter -> usage row
 *
 * Every cheap refusal happens before the expensive thing. A rate-limited or
 * over-long request costs ZERO model spend, which is the entire point of putting
 * the caps in front rather than behind. The usage row is written last and
 * records refusals with `answered: false`, because a filtered answer still
 * burned tokens and an unrecorded request is a free one — which would hollow out
 * the rate limit that depends on those rows existing.
 */

const FALLBACK_MESSAGE =
  "I don't have that in Patalign's public library yet. Sign in for the full help library, or reach out to support and we'll get you an answer.";

type PublicCitation = { path: string; title: string };

function decline(citations: PublicCitation[] = []) {
  return NextResponse.json(
    { ok: true, answer: null, fallback: FALLBACK_MESSAGE, signInInvited: true, citations },
    { headers: { "cache-control": "no-store" } }
  );
}

/**
 * Caller IP from the proxy chain.
 *
 * Only ever hashed (see usage.ts) and never stored or logged raw. An absent
 * header yields a constant bucket rather than a per-request one: unknown callers
 * must share a rate-limit bucket, or spoofing the header away would be an
 * unlimited-requests exploit.
 */
function callerIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(req: Request) {
  // 1. Availability. Flag off, or flag on with no IP-hash salt, is a 404 —
  //    invisible rather than forbidden, the same shape as the other Pat routes.
  //    A missing salt refuses instead of degrading: see usage.ts.
  if (!publicTierAvailability().available) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const payload = (body ?? {}) as { question?: unknown; sessionId?: unknown };

  // The session id is an OPAQUE conversation key from the client, used only to
  // count messages. It is not an identity, is never resolved to a user, and
  // carries no privilege — a caller inventing one gains nothing but their own
  // fresh message budget, which the IP limit still bounds.
  const sessionId =
    typeof payload.sessionId === "string" && payload.sessionId.trim().length > 0
      ? payload.sessionId.trim().slice(0, 128)
      : "";
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "missing_session" }, { status: 400 });
  }

  // 2. Input cap BEFORE anything expensive. Refuses; never truncates.
  const input = checkPublicInput(payload.question);
  if (!input.ok) {
    return NextResponse.json({ ok: false, error: input.reason }, { status: 400 });
  }

  // 3. Rate limit and caps, still before any model call.
  const usage = await checkPublicUsage({ ip: callerIp(req), sessionId });
  if (!usage.allowed) {
    // A cap is NOT a corpus gap, so it is never written to PatDeclineLog and
    // never dressed up as "we don't have that documented". Conflating the two
    // would corrupt the gap queue with our own throttling.
    return NextResponse.json(
      { ok: false, error: usage.reason },
      { status: 429, headers: { "cache-control": "no-store" } }
    );
  }

  const ip = callerIp(req);
  let sourceTexts: string[] = [];
  let citations: PublicCitation[] = [];

  // 4. Rungs 1 and 4. No attemptWeb is passed, so rung 3 does not exist here.
  let outcome: Awaited<ReturnType<typeof runAnswerLadder>>;
  try {
    outcome = await runAnswerLadder({
      question: input.question,
      // Rung-4 declines land in PatDeclineLog under audience "public", through
      // the same redactor as every other decline, so the public tier feeds the
      // corpus gap queue from its first day.
      audience: PUBLIC_AUDIENCE,
      hasModelKey: anthropicApiKeyPresent,
      retrieve: async () => {
        const chunks = await retrieveHelp(input.question, PUBLIC_AUDIENCE, 5, {
          publicEntry: true,
        });
        sourceTexts = chunks.map((chunk) => chunk.rawText);
        citations = chunks.map((chunk) => ({ path: chunk.sourcePath, title: chunk.sourcePath }));
        return chunks;
      },
      generate: (chunks) =>
        generatePatReply({ prompt: input.question, context: buildHelpContext(chunks) }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 502 });
  }

  const costUsd = outcome.kind === "answer" ? outcome.reply.costUsd : 0;

  if (outcome.kind !== "answer") {
    // Rung 4. The ladder already logged the gap; the ledger records the spend.
    await recordPublicUsage({ ip, sessionId, costUsd, answered: false });
    return decline();
  }

  // 5. Output filter. Refuses rather than scrubbing — a scrubbed answer that
  //    still reads fluently hides the fact that something tried to emit an
  //    address, a link, or a recitation of the corpus.
  const filtered = filterPublicAnswer(outcome.reply.text, sourceTexts);
  if (!filtered.ok) {
    console.warn(`[pat-public] answer refused by output filter: ${filtered.violation}`);
    // 6. Billed anyway: it cost tokens whether or not it was shown.
    await recordPublicUsage({ ip, sessionId, costUsd, answered: false });
    return decline(citations);
  }

  await recordPublicUsage({ ip, sessionId, costUsd, answered: true });

  return NextResponse.json(
    {
      ok: true,
      answer: filtered.text,
      source: "public-corpus",
      signInInvited: false,
      citations,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
