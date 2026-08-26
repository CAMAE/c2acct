/**
 * Pat assistant + ping-system feature flags (Phase 0 foundation, 2026-06-18).
 *
 * All default OFF. Same `=== "1"` presence convention as the rest of the PAT
 * flag surface (see lib/consultantAccess.ts, lib/platformRollout.ts). Keeping the
 * customer-facing Pat behind PAT_ENABLE_PAT_ASSISTANT and the ping system behind
 * PAT_ENABLE_PINGS means the whole foundation can ship dark — nothing renders or
 * sends until a flag is explicitly flipped in the runtime env.
 *
 * PAT_PINGS_EMAIL_ENABLED is the third, independent off-switch (mirrors the
 * billing pattern): real outbound email cannot leave the building unless this is
 * set AND a provider key + verified domain exist. Absence keeps the system on
 * the in-app channel only.
 */

export const PAT_ASSISTANT_FLAG_ENV = "PAT_ENABLE_PAT_ASSISTANT";
export const PAT_PINGS_FLAG_ENV = "PAT_ENABLE_PINGS";
export const PAT_PINGS_EMAIL_FLAG_ENV = "PAT_PINGS_EMAIL_ENABLED";
/** 16b — staleness-alert generators. Independent off-switch; also requires pings. */
export const PAT_STALENESS_ALERTS_FLAG_ENV = "PAT_ENABLE_STALENESS_ALERTS";
/**
 * LADDER-1 — the answer-ladder scope gate. Default off.
 *
 * Off, the ladder still runs, but WITHOUT the scope-gate rung: the router's
 * corpus → decline walk is exactly the flow that shipped before it existed, so
 * flag-off behaviour is byte-identical rather than merely similar. On, a cheap
 * classifier runs in front of retrieval and out-of-scope questions decline at
 * the gate instead of burning a retrieval and a generation.
 */
export const PAT_LADDER_FLAG_ENV = "PAT_ENABLE_PAT_LADDER";

function flagEnabled(envName: string): boolean {
  return process.env[envName] === "1";
}

/** Customer-facing Pat chat surface (Phase A). */
export function isPatAssistantEnabled(): boolean {
  return flagEnabled(PAT_ASSISTANT_FLAG_ENV);
}

/** Notification / ping system, in-app channel (Phase B). */
export function isPingsEnabled(): boolean {
  return flagEnabled(PAT_PINGS_FLAG_ENV);
}

/**
 * Real outbound email for pings. Requires BOTH the pings flag and the email
 * flag — the email channel is meaningless without the system that produces the
 * notifications, and this prevents an email-only misconfiguration from sending.
 */
export function isPingsEmailEnabled(): boolean {
  return isPingsEnabled() && flagEnabled(PAT_PINGS_EMAIL_FLAG_ENV);
}

/**
 * 16b — staleness-alert generators (own-module Aging/Stale, product-review
 * month-10, score-change, cohort movement). Requires BOTH the pings system (the
 * notification write path + inbox) and this dedicated switch, so the generators
 * ship dark and can be flipped independently of the rest of the ping system.
 */
export function isStalenessAlertsEnabled(): boolean {
  return isPingsEnabled() && flagEnabled(PAT_STALENESS_ALERTS_FLAG_ENV);
}

/**
 * The answer-ladder scope gate (LADDER-1). Independent of the assistant flag:
 * the gate is a rung, and a rung is meaningless without the surface, but keeping
 * the switches separate means the gate can be turned on and off against a live
 * assistant without taking the assistant down with it.
 */
export function isPatLadderEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[PAT_LADDER_FLAG_ENV] === "1";
}
