import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { decideNudgeDraft } from "@/lib/notifications/nudgeDraft";

export const dynamic = "force-dynamic";

const noStore = { headers: { "cache-control": "no-store" } } as const;

/**
 * 16c — the consultant's HITL decision on a Pat-drafted nudge. approve (with an
 * optional edited title/body) sends one Notification per firm user — the single
 * send path; dismiss sends nothing. Authorization + PENDING-guard resolved
 * server-side in decideNudgeDraft.
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
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const draftId = typeof obj.draftId === "string" ? obj.draftId : null;
  const decision = obj.decision === "approve" || obj.decision === "dismiss" ? obj.decision : null;
  const editTitle = typeof obj.title === "string" ? obj.title : undefined;
  const editBody = typeof obj.body === "string" ? obj.body : undefined;

  if (!draftId || !decision) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const result = await decideNudgeDraft({
    actor: sessionUser,
    draftId,
    decision,
    title: editTitle,
    body: editBody,
  });
  if (!result.ok) {
    const status = result.reason === "forbidden" ? 403 : result.reason === "not_found" ? 404 : 409;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  return NextResponse.json(
    { ok: true, status: result.status, recipientsNotified: result.recipientsNotified },
    noStore
  );
}
