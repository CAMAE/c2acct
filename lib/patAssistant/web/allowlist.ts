/**
 * The web tier's domain allowlist (LADDER-2).
 *
 * Pat cites sources to accounting firms in Patalign's voice. A citation is an
 * implicit endorsement of the source, so the question is not "is this page
 * reachable" but "are we willing to have this domain quoted to a firm as
 * authoritative". That is a much shorter list than the open web.
 *
 * DENY BY DEFAULT: a domain absent from this list is not searched and, if it
 * appears in a result anyway, its citation is dropped. The list starts with
 * federal/government sources, standards bodies, and the accounting trade press,
 * and is extended with PAT_WEB_ALLOWED_DOMAINS (comma-separated) rather than by
 * editing this file for a one-off.
 *
 * Pure and dependency-free so the importer, the rung, and the tests can share
 * one definition without dragging a client or a request context along.
 */

/**
 * Suffix-matched hostnames. An entry matches the host itself and any subdomain,
 * so "gao.gov" covers "www.gao.gov" — but NOT "notgao.gov", because the match is
 * anchored on a label boundary rather than a bare `endsWith`.
 */
export const DEFAULT_ALLOWED_DOMAINS: readonly string[] = Object.freeze([
  // US federal + regulator primary sources (public domain, authoritative).
  "gao.gov",
  "irs.gov",
  "sec.gov",
  "ftc.gov",
  "nist.gov",
  "gpo.gov",
  "federalregister.gov",
  "congress.gov",
  "treasury.gov",
  "dol.gov",
  // Standards and professional bodies.
  "aicpa.org",
  "aicpa-cima.com",
  "fasb.org",
  "gasb.org",
  "coso.org",
  "ifrs.org",
  "pcaobus.org",
  "nasba.org",
  "iia.org",
  "isaca.org",
  // Accounting-industry press.
  "journalofaccountancy.com",
  "accountingtoday.com",
  "cpapracticeadvisor.com",
  "thetaxadviser.com",
  "cpajournal.com",
]);

/** Extra domains from the environment, lowercased and trimmed. */
export function configuredAllowedDomains(
  env: Record<string, string | undefined> = process.env
): string[] {
  const extra = (env.PAT_WEB_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase().replace(/^\.+/, ""))
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_DOMAINS, ...extra];
}

/** The hostname of a URL, lowercased. Null when the URL will not parse. */
export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Is this URL on the allowlist?
 *
 * Matching is label-anchored: `gao.gov` matches `gao.gov` and `data.gao.gov`,
 * and does NOT match `notgao.gov` or `gao.gov.evil.com`. A bare `endsWith` would
 * accept the first of those, and a bare `includes` would accept both — which is
 * how an allowlist becomes decorative.
 */
export function isAllowedUrl(
  url: string,
  env: Record<string, string | undefined> = process.env
): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  return configuredAllowedDomains(env).some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  );
}

/** Keep only allowlisted URLs. The filter every search result passes through. */
export function filterAllowedUrls<T extends { url: string }>(
  results: readonly T[],
  env: Record<string, string | undefined> = process.env
): T[] {
  return results.filter((result) => isAllowedUrl(result.url, env));
}
