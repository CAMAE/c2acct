export type AudienceTitleSegment = {
  text: string;
  emphasized: boolean;
};

export const PAT_PRODUCT_NAME = "PAT | Performance Alignment Technology";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitAudienceTitleSegments(
  title: string,
  audienceTerms: readonly string[]
): AudienceTitleSegment[] {
  const normalizedTerms = Array.from(new Set(audienceTerms.map((term) => term.trim()).filter(Boolean))).sort(
    (left, right) => right.length - left.length
  );

  if (normalizedTerms.length === 0) {
    return [{ text: title, emphasized: false }];
  }

  const emphasisPattern = new RegExp(`(${normalizedTerms.map(escapeRegExp).join("|")})`, "gi");

  return title
    .split(emphasisPattern)
    .filter((segment) => segment.length > 0)
    .map((segment) => ({
      text: segment,
      emphasized: normalizedTerms.some((term) => term.toLowerCase() === segment.toLowerCase()),
    }));
}

export function replaceUtilityTermsForDisplay(value: string) {
  return value
    .replace(/\bUtilities\b/g, "Features")
    .replace(/\bUtility\b/g, "Feature")
    .replace(/\butilities\b/g, "features")
    .replace(/\butility\b/g, "feature");
}

export function formatFeatureCountLabel(count: number) {
  return `${count} ${count === 1 ? "feature" : "features"}`;
}
