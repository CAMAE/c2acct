/**
 * Block 19 — the V7 product-native front door. Ships DARK behind
 * PAT_ENABLE_NEW_FRONT_DOOR: the current public front page is untouched until Cam
 * flips this flag. When on, app/page.tsx renders the V7 front door instead.
 */
import { publicTierAvailability } from "@/lib/patAssistant/public/usage";

export const PAT_NEW_FRONT_DOOR_FLAG_ENV = "PAT_ENABLE_NEW_FRONT_DOOR";

export function isNewFrontDoorEnabled(): boolean {
  return process.env[PAT_NEW_FRONT_DOOR_FLAG_ENV] === "1";
}

/**
 * Ask Pat entry on the V7 door. The door may only link to /ask when /ask would
 * actually render: publicTierAvailability() is the SAME check the /ask page and
 * the /api/pat/public route run (flag on AND the IP-hash salt configured). A flag
 * that is on without its salt still 404s /ask, so the link stays hidden — the
 * door can never carry a dead link to its own headline feature.
 */
export function isAskPatDoorEntryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return publicTierAvailability(env).available;
}

/**
 * 21c — Meet PAT under the V7 door keeps the hero plus the first N sections
 * ("What PAT does", "Why it matters") and drops "How PAT grows" and the
 * "Instant value" block. Cut by omission only: no sentence is re-voiced, every
 * locale drops the same blocks. -43% en / -43% es / -46% fr of the copy
 * (contract-tested at <= 60% of the full text per locale).
 */
export const MEET_PAT_V7_SECTION_COUNT = 2;
