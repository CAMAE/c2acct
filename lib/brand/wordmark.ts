/**
 * Header wordmark experiment (localhost A/B): PAT_HEADER_WORDMARK=patalign
 * swaps the header's PAT logo for the "Patalign" wordmark drawn in the same
 * typographic style. Default is the existing PAT mark. Hero lockups ("PAT ·
 * Performance Alignment Technology") are intentionally unaffected.
 */

export const HEADER_WORDMARK_FLAG_ENV = "PAT_HEADER_WORDMARK";

export type HeaderWordmarkVariant = "pat" | "patalign";

export function getHeaderWordmarkVariant(env: NodeJS.ProcessEnv = process.env): HeaderWordmarkVariant {
  return env[HEADER_WORDMARK_FLAG_ENV] === "patalign" ? "patalign" : "pat";
}
