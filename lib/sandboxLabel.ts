/**
 * R24 (box 2b, 2026-09-14): "Alignment Sandbox" / "Alignment Board" read
 * "Tech Stack Sandbox" behind PAT_ENABLE_NEW_FRONT_DOOR. Flag-off every
 * surface keeps production's words (byte-identical); the flag flips once, on
 * deploy night. Reads the env directly (no lib/frontDoor import) because
 * lib/insightContent.ts reaches client bundles through lib/vendorPat.ts, and
 * there the env is absent — the client falls back to production's label
 * while every rendered string is resolved on the server.
 */
const FLAG_ENV = "PAT_ENABLE_NEW_FRONT_DOOR";

function enabled(): boolean {
  return typeof process !== "undefined" && process.env?.[FLAG_ENV] === "1";
}

export function sandboxLabel(): string {
  return enabled() ? "Tech Stack Sandbox" : "Alignment Sandbox";
}

export function boardLabel(): string {
  return enabled() ? "Tech Stack Sandbox" : "Alignment Board";
}
