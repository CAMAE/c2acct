import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

/**
 * R24 (box 2b, 2026-09-14): "Alignment Sandbox" / "Alignment Board" read
 * "Tech Stack Sandbox" behind PAT_ENABLE_NEW_FRONT_DOOR. Flag-off every
 * surface keeps production's words (byte-identical); the flag flips once, on
 * deploy night. Server-side only — client components receive the label as a
 * prop.
 */
export function sandboxLabel(): string {
  return isNewFrontDoorEnabled() ? "Tech Stack Sandbox" : "Alignment Sandbox";
}

export function boardLabel(): string {
  return isNewFrontDoorEnabled() ? "Tech Stack Sandbox" : "Alignment Board";
}
