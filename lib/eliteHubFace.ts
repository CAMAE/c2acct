/**
 * Client-safe Elite hub face types (Block 12g). The rich face — hero number +
 * colored chip + micro-visual + sub — is rendered by the "use client"
 * InsightSurfaceCardGrid, so its types live apart from lib/eliteInsightsV2 (which
 * pulls the server graph → node:crypto). eliteInsightsV2 re-exports these; the
 * formatters that BUILD faces stay server-side there.
 */

export type EliteHubChip = { label: string; tone: "positive" | "amber" | "neutral"; arrow?: "up" | "down" };

export type EliteHubMicro =
  | { kind: "percentile-band"; percentile: number }
  | { kind: "band-dots"; total: number; filled: number }
  | { kind: "two-segment"; confirmed: number; lower: number }
  // 15b: trajectory sparkline — recent snapshots + an optional dashed projection point.
  | { kind: "sparkline"; points: number[]; projection?: number | null };

export type EliteHubFace = {
  /** The single hero number. */
  hero: string;
  heroTone?: "positive" | "negative" | "amber";
  chip?: EliteHubChip;
  micro?: EliteHubMicro;
  sub: string;
};
