import type { ProbeResult, RouteId } from "./types";

/** Narrow an unknown (e.g. parsed JSON / Prisma JsonValue) to a record. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Detect a GitHub OAuth affordance in the /sign-in HTML. The live page renders
 * zero "github" mentions today (GitHub auth is not exposed until LAUNCH-002), so
 * any appearance — the "Continue with GitHub" button most of all — is a
 * regression worth alerting on.
 */
export function detectGithubButton(html: string): boolean {
  return /continue with github/i.test(html) || /sign in with github/i.test(html) || /\bgithub\b/i.test(html);
}

function emptyProbe(route: RouteId, url: string): ProbeResult {
  return {
    route,
    url,
    status: null,
    ok: null,
    githubButtonPresent: null,
    fingerprintPresent: null,
    commitShort: null,
    releaseId: null,
    releaseHeaderMatches: null,
    error: null,
  };
}

export function unreachableProbe(route: RouteId, url: string, error: string): ProbeResult {
  return { ...emptyProbe(route, url), error };
}

export function buildSignInProbe(url: string, status: number, html: string): ProbeResult {
  return { ...emptyProbe("sign-in", url), status, githubButtonPresent: detectGithubButton(html) };
}

export function buildHealthProbe(url: string, status: number, body: unknown): ProbeResult {
  const record = asRecord(body);
  const ok = typeof record?.ok === "boolean" ? record.ok : null;
  return { ...emptyProbe("health-db", url), status, ok };
}

export function buildFingerprintProbe(
  url: string,
  status: number,
  body: unknown,
  releaseHeader: string | null
): ProbeResult {
  const record = asRecord(body);
  const ok = typeof record?.ok === "boolean" ? record.ok : null;
  const fingerprint = asRecord(record?.fingerprint);
  const commitShort = typeof fingerprint?.commitShort === "string" ? fingerprint.commitShort : null;
  const releaseId = typeof fingerprint?.releaseId === "string" ? fingerprint.releaseId : null;
  const fingerprintPresent = commitShort !== null;
  const releaseHeaderMatches =
    releaseHeader && releaseId ? releaseHeader === releaseId : null;

  return {
    ...emptyProbe("release-fingerprint", url),
    status,
    ok,
    fingerprintPresent,
    commitShort,
    releaseId,
    releaseHeaderMatches,
  };
}
