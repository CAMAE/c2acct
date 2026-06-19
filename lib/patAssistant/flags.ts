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
