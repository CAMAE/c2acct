import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { sendCompanyNudge, type NudgeAudience } from "@/lib/notifications/nudge";

export const dynamic = "force-dynamic";

const noStore = { headers: { "cache-control": "no-store" } } as const;

function isNudgeAudience(value: unknown): value is NudgeAudience {
  return value === "firm" || value === "vendor";
}

/**
 * Manual nudge endpoint (Phase B2b). A consultant/admin nudges a firm/vendor.
 * Flag-gated; authorization resolved server-side in sendCompanyNudge.
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

  const result = await sendCompanyNudge({ actor: sessionUser, companyId, audience: audienceRaw });
  if (!result.ok) {
    const status = result.reason === "forbidden" ? 403 : 409;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, recipients: result.recipients, created: result.created }, noStore);
}
