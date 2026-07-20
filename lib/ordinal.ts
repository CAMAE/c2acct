/**
 * The ONE ordinal formatter — "1st", "2nd", "3rd", "11th", "23rd". Hoisted from
 * six copy-pasted private definitions (eliteInsightsV2, PercentileBand, the four
 * Elite cards, the benchmark artifact) so ordinal rendering can't drift and no
 * surface can regress to a hardcoded "th" again. Locked by tests/ordinal.test.ts.
 */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
