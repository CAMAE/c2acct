/** Routes the QA + Smoke agent probes on production. */
export type RouteId = "sign-in" | "health-db" | "release-fingerprint";

export interface RoutePlan {
  route: RouteId;
  url: string;
}

/**
 * Normalized result of probing one route. Fields not relevant to a given route
 * are null. `status: null` means the route was unreachable (network error /
 * timeout) — the evaluator treats that as drift, not a crash.
 */
export interface ProbeResult {
  route: RouteId;
  url: string;
  status: number | null;
  ok: boolean | null; // body.ok for the JSON health/fingerprint endpoints
  githubButtonPresent: boolean | null; // /sign-in only
  fingerprintPresent: boolean | null; // /api/release-fingerprint only
  commitShort: string | null;
  releaseId: string | null;
  releaseHeaderMatches: boolean | null; // x-pat-release-id header == body releaseId
  error: string | null;
}

export interface Expectations {
  /** Commit the live release should report; null = no baseline yet (skip check). */
  expectedCommit: string | null;
  /** Whether a GitHub OAuth button on /sign-in is allowed (false until LAUNCH-002). */
  signInGithubButtonAllowed: boolean;
}

export type FindingCode =
  | "signin_unreachable"
  | "signin_bad_status"
  | "signin_github_button_regression"
  | "health_db_unreachable"
  | "health_db_bad_status"
  | "health_db_not_ok"
  | "fingerprint_unreachable"
  | "fingerprint_bad_status"
  | "fingerprint_not_ok"
  | "fingerprint_missing"
  | "fingerprint_header_mismatch"
  | "fingerprint_commit_mismatch";

export interface Finding {
  code: FindingCode;
  route: RouteId;
  detail: string;
}

export interface Evaluation {
  findings: Finding[];
  drift: boolean;
  checkedRoutes: RouteId[];
}

export interface AlertDecision {
  shouldAlert: boolean;
  message: string;
}
