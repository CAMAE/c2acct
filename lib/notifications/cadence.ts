/**
 * Ping cadence governor (Phase B1, 2026-06-18) — pure, dependency-free decision
 * helpers that keep reminders from becoming spam. Used by the notification store
 * (in-app gating) and, later, the trigger engine (B3: frequency caps, max-sends)
 * and the email channel (B4: quiet hours). Kept pure so the anti-annoyance rules
 * are fully unit-testable without a DB or clock injection beyond a passed-in Date.
 *
 * Conventions:
 *   - quiet-hours bounds are minutes-from-local-midnight (0–1439); null = unset.
 *   - kindOptOuts maps a notification kind → true when the user has opted OUT of
 *     that kind. Absent or non-true = still subscribed.
 */

export type CadenceSuppressionReason =
  | "ok"
  | "in_app_disabled"
  | "email_disabled"
  | "kind_opted_out"
  | "quiet_hours"
  | "frequency_capped"
  | "max_sends_reached";

/** Local minutes-from-midnight for `now` in an IANA timezone, via Intl (no deps). */
export function localMinutesOfDay(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/**
 * Is `nowMinutes` inside the quiet-hours window? Handles same-day windows
 * (start < end, e.g. 13:00–17:00) and overnight windows (start > end, e.g.
 * 22:00–08:00). Unset or zero-length windows are never quiet.
 */
export function isWithinQuietHours(
  nowMinutes: number,
  startMinutes: number | null,
  endMinutes: number | null
): boolean {
  if (startMinutes == null || endMinutes == null) return false;
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/** True when the user has explicitly opted out of this notification kind. */
export function isKindOptedOut(
  kindOptOuts: Record<string, unknown> | null | undefined,
  kind: string
): boolean {
  return kindOptOuts?.[kind] === true;
}

/** Frequency cap: have we already sent `recentCount` within the window vs `cap`? */
export function exceedsFrequencyCap(recentCount: number, cap: number): boolean {
  if (cap <= 0) return false;
  return recentCount >= cap;
}

/** Max reminders for one task before we stop (2–3 is the researched sweet spot). */
export function reachedMaxSends(priorSends: number, maxSends: number): boolean {
  if (maxSends <= 0) return false;
  return priorSends >= maxSends;
}

/**
 * Stable dedupe key for "one live notification per (recipient, source, kind)".
 * Mirrors the DB unique index; used to look up an existing notification before
 * creating a duplicate for the same stalled task.
 */
export function dedupeKey(
  recipientUserId: string,
  sourceType: string | null | undefined,
  sourceId: string | null | undefined,
  kind: string
): string {
  return [recipientUserId, sourceType ?? "", sourceId ?? "", kind].join("::");
}
