import { resolveDbExec, runJsonQuery } from "./db-verify-helpers.ts";

type IntegritySummary = {
  duplicateFinalizedReviews: Array<{
    reviewerCompanyId: string;
    reviewerUserId: string;
    subjectCompanyId: string;
    subjectProductId: string;
    moduleId: string;
    duplicateCount: number;
  }>;
  orphanCounts: {
    unlockEvidenceMissingBadge: number;
    unlockEvidenceMissingSubmission: number;
    unlockEvidenceMissingRollup: number;
    capabilityMissingSubmission: number;
    capabilityMissingRollup: number;
  };
  targetScopeCollisions: {
    companyBadge: number;
    capabilityScore: number;
    observedRollup: number;
    blankTargetScopeKeys: number;
  };
  sponsorInviteIssues: {
    sponsorTypeMismatches: number;
    inviteVendorTypeMismatches: number;
    inviteOverClaimed: number;
    inviteNegativeClaimCount: number;
    inviteExhaustionStatusDrift: number;
  };
  opsSanity: {
    apiRateLimitBucketExists: boolean;
    auditEventExists: boolean;
    negativeRequestCount: number;
    nonPositiveWindowMs: number;
    blankEventKeys: number;
    blankOutcomes: number;
  };
};

function fail(message: string): never {
  throw new Error(message);
}

function totalFailures(summary: IntegritySummary) {
  return (
    summary.duplicateFinalizedReviews.length +
    Object.values(summary.orphanCounts).reduce((sum, value) => sum + value, 0) +
    Object.values(summary.targetScopeCollisions).reduce((sum, value) => sum + value, 0) +
    Object.values(summary.sponsorInviteIssues).reduce((sum, value) => sum + value, 0) +
    (summary.opsSanity.apiRateLimitBucketExists ? 0 : 1) +
    (summary.opsSanity.auditEventExists ? 0 : 1) +
    summary.opsSanity.negativeRequestCount +
    summary.opsSanity.nonPositiveWindowMs +
    summary.opsSanity.blankEventKeys +
    summary.opsSanity.blankOutcomes
  );
}

function main() {
  const dbExec = resolveDbExec();

  const duplicateFinalizedReviews = runJsonQuery<IntegritySummary["duplicateFinalizedReviews"]>(`
    SELECT COALESCE(json_agg(t), '[]'::json)::text
    FROM (
      SELECT
        "reviewerCompanyId",
        COALESCE("reviewerUserId", '__NONE__') AS "reviewerUserId",
        "subjectCompanyId",
        COALESCE("subjectProductId", '__NONE__') AS "subjectProductId",
        "moduleId",
        COUNT(*)::int AS "duplicateCount"
      FROM "ExternalReviewSubmission"
      WHERE "reviewStatus" = 'FINALIZED'
      GROUP BY 1, 2, 3, 4, 5
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, 1, 2, 3, 4, 5
    ) t;
  `);

  const orphanCounts = runJsonQuery<IntegritySummary["orphanCounts"]>(`
    SELECT json_build_object(
      'unlockEvidenceMissingBadge',
      (
        SELECT COUNT(*)::int
        FROM "UnlockEvidence" ue
        LEFT JOIN "CompanyBadge" cb ON cb.id = ue."companyBadgeId"
        WHERE cb.id IS NULL
      ),
      'unlockEvidenceMissingSubmission',
      (
        SELECT COUNT(*)::int
        FROM "UnlockEvidence" ue
        LEFT JOIN "SurveySubmission" ss ON ss.id = ue."surveySubmissionId"
        WHERE ue."surveySubmissionId" IS NOT NULL
          AND ss.id IS NULL
      ),
      'unlockEvidenceMissingRollup',
      (
        SELECT COUNT(*)::int
        FROM "UnlockEvidence" ue
        LEFT JOIN "ExternalObservedSignalRollup" eosr ON eosr.id = ue."externalObservedSignalRollupId"
        WHERE ue."externalObservedSignalRollupId" IS NOT NULL
          AND eosr.id IS NULL
      ),
      'capabilityMissingSubmission',
      (
        SELECT COUNT(*)::int
        FROM "CompanyCapabilityScore" ccs
        LEFT JOIN "SurveySubmission" ss ON ss.id = ccs."surveySubmissionId"
        WHERE ccs."surveySubmissionId" IS NOT NULL
          AND ss.id IS NULL
      ),
      'capabilityMissingRollup',
      (
        SELECT COUNT(*)::int
        FROM "CompanyCapabilityScore" ccs
        LEFT JOIN "ExternalObservedSignalRollup" eosr ON eosr.id = ccs."externalObservedSignalRollupId"
        WHERE ccs."externalObservedSignalRollupId" IS NOT NULL
          AND eosr.id IS NULL
      )
    )::text;
  `);

  const targetScopeCollisions = runJsonQuery<IntegritySummary["targetScopeCollisions"]>(`
    SELECT json_build_object(
      'companyBadge',
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT "targetScopeKey", "badgeId", "moduleId"
          FROM "CompanyBadge"
          GROUP BY 1, 2, 3
          HAVING COUNT(*) > 1
        ) collisions
      ),
      'capabilityScore',
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT "targetScopeKey", "moduleId", "nodeId", "scoreVersion", "sourceType"
          FROM "CompanyCapabilityScore"
          GROUP BY 1, 2, 3, 4, 5
          HAVING COUNT(*) > 1
        ) collisions
      ),
      'observedRollup',
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT "targetScopeKey", "moduleId", "rollupVersion"
          FROM "ExternalObservedSignalRollup"
          GROUP BY 1, 2, 3
          HAVING COUNT(*) > 1
        ) collisions
      ),
      'blankTargetScopeKeys',
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT "targetScopeKey" FROM "CompanyBadge"
          UNION ALL
          SELECT "targetScopeKey" FROM "CompanyCapabilityScore"
          UNION ALL
          SELECT "targetScopeKey" FROM "ExternalObservedSignalRollup"
        ) scopes
        WHERE "targetScopeKey" IS NULL OR btrim("targetScopeKey") = ''
      )
    )::text;
  `);

  const sponsorInviteIssues = runJsonQuery<IntegritySummary["sponsorInviteIssues"]>(`
    SELECT json_build_object(
      'sponsorTypeMismatches',
      (
        SELECT COUNT(*)::int
        FROM "SponsorRelationship" sr
        JOIN "Company" vendor ON vendor.id = sr."vendorCompanyId"
        JOIN "Company" firm ON firm.id = sr."firmCompanyId"
        WHERE vendor.type <> 'VENDOR' OR firm.type <> 'FIRM'
      ),
      'inviteVendorTypeMismatches',
      (
        SELECT COUNT(*)::int
        FROM "InviteCode" ic
        JOIN "Company" vendor ON vendor.id = ic."vendorCompanyId"
        WHERE vendor.type <> 'VENDOR'
      ),
      'inviteOverClaimed',
      (
        SELECT COUNT(*)::int
        FROM "InviteCode"
        WHERE "claimCount" > "maxClaims"
      ),
      'inviteNegativeClaimCount',
      (
        SELECT COUNT(*)::int
        FROM "InviteCode"
        WHERE "claimCount" < 0
      ),
      'inviteExhaustionStatusDrift',
      (
        SELECT COUNT(*)::int
        FROM "InviteCode"
        WHERE "claimCount" >= "maxClaims"
          AND status = 'ACTIVE'
      )
    )::text;
  `);

  const opsSanity = runJsonQuery<IntegritySummary["opsSanity"]>(`
    SELECT json_build_object(
      'apiRateLimitBucketExists',
      to_regclass('"ApiRateLimitBucket"') IS NOT NULL,
      'auditEventExists',
      to_regclass('"AuditEvent"') IS NOT NULL,
      'negativeRequestCount',
      (
        SELECT COUNT(*)::int
        FROM "ApiRateLimitBucket"
        WHERE "requestCount" < 0
      ),
      'nonPositiveWindowMs',
      (
        SELECT COUNT(*)::int
        FROM "ApiRateLimitBucket"
        WHERE "windowMs" <= 0
      ),
      'blankEventKeys',
      (
        SELECT COUNT(*)::int
        FROM "AuditEvent"
        WHERE btrim("eventKey") = ''
      ),
      'blankOutcomes',
      (
        SELECT COUNT(*)::int
        FROM "AuditEvent"
        WHERE btrim("outcome") = ''
      )
    )::text;
  `);

  const summary: IntegritySummary = {
    duplicateFinalizedReviews,
    orphanCounts,
    targetScopeCollisions,
    sponsorInviteIssues,
    opsSanity,
  };

  const failureCount = totalFailures(summary);
  const result = {
    ok: failureCount === 0,
    dbExecution: dbExec,
    summary,
    failureCount,
  };

  if (failureCount > 0) {
    console.error("VERIFY_DB_INTEGRITY_ERROR", JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(
    "VERIFY_DB_INTEGRITY_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
