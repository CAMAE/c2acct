/**
 * Block 19 — the V7 product-native front door. Ships DARK behind
 * PAT_ENABLE_NEW_FRONT_DOOR: the current public front page is untouched until Cam
 * flips this flag. When on, app/page.tsx renders the V7 front door instead.
 */
export const PAT_NEW_FRONT_DOOR_FLAG_ENV = "PAT_ENABLE_NEW_FRONT_DOOR";

export function isNewFrontDoorEnabled(): boolean {
  return process.env[PAT_NEW_FRONT_DOOR_FLAG_ENV] === "1";
}
