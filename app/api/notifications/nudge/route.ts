import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { type NudgeAudience } from "@/lib/notifications/nudge";
import { createNudgeDraft } from "@/lib/notifications/nudgeDraft";

export const dynamic = "force-dynamic";

const noStore = { headers: { "cache-control": "no-store" } } as const;

function isNudgeAudience(value: unknown): value is NudgeAudience {
  return value === "firm" || value === "vendor";
}

/**
 * 16c — draft a Pat-composed nudge for a firm/vendor. This NEVER sends: it only
 * creates a PENDING draft that lands in the consultant approval queue. The nudge
 * reaches the firm only after a consultant approves it (see /decide). Flag-gated;
 * authorization resolved server-side in createNudgeDraft.
 */
export async function POST(req: Request) {
  if (!isPingsEnabled()) {
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
  const companyId =
    body && typeof body === "object" && typeof (body as { companyId?: unknown }).companyId === "string"
      ? (body as { companyId: string }).companyId
      : null;
  const audienceRaw =
    body && typeof body === "object" ? (body as { audience?: unknown }).audience : undefined;

  if (!companyId || !isNudgeAudience(audienceRaw)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const result = await createNudgeDraft({ actor: sessionUser, companyId, audience: audienceRaw });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 403 });
  }

  return NextResponse.json(
    { ok: true, draftId: result.draftId, created: result.created, status: "PENDING" },
    noStore
  );
}
