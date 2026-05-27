export function compactInsightSummary(
  value: string | null | undefined,
  fallback = "No PAT summary is available yet."
) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  const firstSentence = normalized.match(/^(.{1,180}?[.!?])(?:\s|$)/);
  if (firstSentence?.[1]) {
    return firstSentence[1];
  }

  return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}...` : normalized;
}
