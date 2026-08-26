/**
 * Request-correlation IDs.
 *
 * One id is minted per inbound request in proxy.ts and travels three ways:
 *   - forward, on the REQUEST headers, so server components, server actions and
 *     route handlers all read the same id via next/headers;
 *   - back, on the RESPONSE headers, so a browser report or a curl can be tied
 *     to the server-side lines without guessing by timestamp;
 *   - down, into structured error logs and agent audit rows.
 *
 * That last one is the point. A log drain full of stack traces is only useful if
 * you can pivot from "the customer saw this" to "here is every line that request
 * produced" — timestamps alone cannot do that under concurrency.
 *
 * Pure and dependency-free so it is import-safe from the edge proxy, the server,
 * and unit tests alike.
 */

/** Header the id travels on. Lowercase: HTTP/2 headers are case-insensitive but normalize lower. */
export const REQUEST_ID_HEADER = "x-pat-request-id";

/** Length of the generated id. 16 hex chars ≈ 64 bits — ample for per-request uniqueness. */
const ID_BYTES = 8;

/**
 * Mint a request id. Uses Web Crypto, which exists in the edge runtime, Node 18+
 * and the browser — deliberately not node:crypto, so this module stays
 * importable from proxy.ts.
 */
export function generateRequestId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Shape shared by Headers, ReadonlyHeaders, and a plain record. */
type HeaderLike = { get(name: string): string | null | undefined };

/**
 * Read the id an upstream hop already set, if it is well-formed.
 *
 * An inbound value is only trusted when it matches the expected shape. A caller
 * could otherwise inject arbitrary text that lands verbatim in the log drain —
 * newlines would forge log lines, and unbounded length would bloat every row.
 */
export function readRequestId(headers: HeaderLike | null | undefined): string | null {
  const raw = headers?.get(REQUEST_ID_HEADER);
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return /^[0-9a-f]{8,64}$/i.test(trimmed) ? trimmed.toLowerCase() : null;
}

/** The id for this request: reuse a valid upstream one, else mint a fresh one. */
export function resolveRequestId(headers: HeaderLike | null | undefined): string {
  return readRequestId(headers) ?? generateRequestId();
}
