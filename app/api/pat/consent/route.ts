import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isPatAssistantEnabled } from "@/lib/patAssistant/flags";
import { getConsent, setConsent } from "@/lib/patAssistant/consent";

export const dynamic = "force-dynamic";

/**
 * Pat consent read/write (Elite Sprint Block A). Same flag + auth gate as the
 * chat endpoint: 404 when Pat is disabled, 401 when unauthenticated. The body
 * only carries a boolean; the audience/user is derived from the session, never
 * the client.
 */

export async function GET() {
  if (!isPatAssistantEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const state = await getConsent(sessionUser.id);
  return NextResponse.json(
    { ok: true, optedIn: state.optedIn },
    { headers: { "cache-control": "no-store" } }
  );
}

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
  const optedIn =
    body && typeof body === "object" && "optedIn" in body
      ? Boolean((body as { optedIn?: unknown }).optedIn)
      : null;
  if (optedIn === null) {
    return NextResponse.json({ ok: false, error: "missing_optedIn" }, { status: 400 });
  }

  const state = await setConsent(sessionUser.id, optedIn);
  // R1: invalidate the root layout so the next render (the client's
  // router.refresh()) re-evaluates showPatTopBar with the new consent state —
  // the Ask Pat bar then appears/disappears on the same page load.
  revalidatePath("/", "layout");
  return NextResponse.json(
    { ok: true, optedIn: state.optedIn },
    { headers: { "cache-control": "no-store" } }
  );
}
