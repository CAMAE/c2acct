/**
 * Box 2c (R42) — the nudge button's state is derived from the draft route's
 * answer, not from "the request succeeded". The route says whether it CREATED a
 * draft or found one already PENDING for that company; the button must say the
 * same thing the queue will show. Pure so the mapping is unit-testable.
 */
export type NudgeButtonStatus = "idle" | "drafting" | "drafted" | "queued" | "error";

export function nudgeStatusFromResponse(ok: boolean, body: unknown): NudgeButtonStatus {
  if (!ok) return "error";
  const created = body && typeof body === "object" ? (body as { created?: unknown }).created : undefined;
  return created === false ? "queued" : "drafted";
}

export function nudgeButtonText(status: NudgeButtonStatus, idleLabel: string): string {
  switch (status) {
    case "drafted":
      return "Drafted — review in queue ✓";
    case "queued":
      return "Already in your queue ✓";
    case "drafting":
      return "Drafting…";
    case "error":
      return "Couldn't draft — retry";
    default:
      return idleLabel;
  }
}
