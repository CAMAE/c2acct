/**
 * R17 (box 2d, 2026-09-25): "Consultant" reads "Guide" everywhere a user reads
 * it — portal, briefs, sign-in, nav, admin copy, nudges. Flag-on only
 * (PAT_ENABLE_NEW_FRONT_DOOR=1); flag-off every string is the production word.
 * Route paths (/consultants), identifiers, emails and flags never change.
 * Server-only: it reads process.env, so client components take the word as a prop.
 * Reads the flag directly (same `=== "1"` law as lib/frontDoor) instead of importing
 * frontDoor: that module reaches node:crypto and this helper is imported by lib
 * modules that client bundles also pull in (lib/auth/localReview via membership).
 */
const GUIDE_WORDS = {
  Consultant: "Guide",
  consultant: "guide",
  Consultants: "Guides",
  consultants: "guides",
  CONSULTANT: "GUIDE",
} as const;

export type RoleWordForm = keyof typeof GUIDE_WORDS;

export function guideWord(form: RoleWordForm = "Consultant"): string {
  return process.env.PAT_ENABLE_NEW_FRONT_DOOR === "1" ? GUIDE_WORDS[form] : form;
}
