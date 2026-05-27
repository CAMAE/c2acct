import { formatAlertMessage } from "./alert";
import type { AlertDecision, Evaluation, Expectations, Finding, ProbeResult } from "./types";

/**
 * Evaluator step. Compares each probe against expectations and emits drift
 * findings. One finding per route (cascade stops at the first failure) except
 * the fingerprint content checks, which can co-report a header and a commit
 * mismatch. `drift` is true iff any finding fired.
 */
export function evaluate(probes: ProbeResult[], expectations: Expectations): Evaluation {
  const findings: Finding[] = [];

  for (const probe of probes) {
    if (probe.route === "sign-in") {
      findings.push(...evaluateSignIn(probe, expectations));
    } else if (probe.route === "health-db") {
      findings.push(...evaluateHealthDb(probe));
    } else if (probe.route === "release-fingerprint") {
      findings.push(...evaluateFingerprint(probe, expectations));
    }
  }

  return {
    findings,
    drift: findings.length > 0,
    checkedRoutes: probes.map((probe) => probe.route),
  };
}

function evaluateSignIn(probe: ProbeResult, expectations: Expectations): Finding[] {
  if (probe.status === null) {
    return [{ code: "signin_unreachable", route: "sign-in", detail: probe.error ?? "no response" }];
  }
  if (probe.status !== 200) {
    return [{ code: "signin_bad_status", route: "sign-in", detail: `status ${probe.status}` }];
  }
  if (probe.githubButtonPresent && !expectations.signInGithubButtonAllowed) {
    return [
      {
        code: "signin_github_button_regression",
        route: "sign-in",
        detail: "GitHub OAuth button present on /sign-in (LAUNCH-002 not shipped)",
      },
    ];
  }
  return [];
}

function evaluateHealthDb(probe: ProbeResult): Finding[] {
  if (probe.status === null) {
    return [{ code: "health_db_unreachable", route: "health-db", detail: probe.error ?? "no response" }];
  }
  if (probe.status !== 200) {
    return [{ code: "health_db_bad_status", route: "health-db", detail: `status ${probe.status}` }];
  }
  if (probe.ok !== true) {
    return [{ code: "health_db_not_ok", route: "health-db", detail: `body.ok = ${String(probe.ok)}` }];
  }
  return [];
}

function evaluateFingerprint(probe: ProbeResult, expectations: Expectations): Finding[] {
  if (probe.status === null) {
    return [
      { code: "fingerprint_unreachable", route: "release-fingerprint", detail: probe.error ?? "no response" },
    ];
  }
  if (probe.status !== 200) {
    return [{ code: "fingerprint_bad_status", route: "release-fingerprint", detail: `status ${probe.status}` }];
  }
  if (probe.ok !== true) {
    return [{ code: "fingerprint_not_ok", route: "release-fingerprint", detail: `body.ok = ${String(probe.ok)}` }];
  }
  if (!probe.fingerprintPresent) {
    return [{ code: "fingerprint_missing", route: "release-fingerprint", detail: "no fingerprint in body" }];
  }

  const findings: Finding[] = [];
  if (probe.releaseHeaderMatches === false) {
    findings.push({
      code: "fingerprint_header_mismatch",
      route: "release-fingerprint",
      detail: `x-pat-release-id != body releaseId (${probe.releaseId})`,
    });
  }
  if (
    expectations.expectedCommit &&
    probe.commitShort &&
    probe.commitShort !== expectations.expectedCommit
  ) {
    findings.push({
      code: "fingerprint_commit_mismatch",
      route: "release-fingerprint",
      detail: `live ${probe.commitShort} != expected ${expectations.expectedCommit}`,
    });
  }
  return findings;
}

/** Decide whether to alert and render the operator-facing message. */
export function decideAlert(evaluation: Evaluation): AlertDecision {
  if (!evaluation.drift) {
    return { shouldAlert: false, message: "" };
  }
  return { shouldAlert: true, message: formatAlertMessage(evaluation.findings) };
}
