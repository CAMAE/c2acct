import { resolveDbExec, runJsonQuery } from "./db-verify-helpers.ts";

type MigrationHealth = {
  failedMigrations: Array<{
    migration_name: string;
    started_at: string;
    finished_at: string | null;
    logs: string | null;
  }>;
  recentMigrations: Array<{
    migration_name: string;
    applied: boolean;
    rolledBack: boolean;
  }>;
  expectedState: {
    opsMigrationApplied: boolean;
    uniquenessMigrationApplied: boolean;
    uniquenessIndexPresent: boolean;
    finalizedDuplicateGroups: number;
  };
};

function main() {
  const dbExec = resolveDbExec();

  const failedMigrations = runJsonQuery<MigrationHealth["failedMigrations"]>(`
    SELECT COALESCE(json_agg(t), '[]'::json)::text
    FROM (
      SELECT
        migration_name,
        started_at::text,
        finished_at::text,
        logs
      FROM _prisma_migrations
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
      ORDER BY started_at DESC
    ) t;
  `);

  const recentMigrations = runJsonQuery<MigrationHealth["recentMigrations"]>(`
    SELECT COALESCE(json_agg(t), '[]'::json)::text
    FROM (
      SELECT
        migration_name,
        finished_at IS NOT NULL AS applied,
        rolled_back_at IS NOT NULL AS "rolledBack"
      FROM _prisma_migrations
      ORDER BY started_at DESC
      LIMIT 10
    ) t;
  `);

  const expectedState = runJsonQuery<MigrationHealth["expectedState"]>(`
    SELECT json_build_object(
      'opsMigrationApplied',
      EXISTS (
        SELECT 1
        FROM _prisma_migrations
        WHERE migration_name = '20260316143000_add_ops_audit_and_rate_limit'
          AND finished_at IS NOT NULL
      ),
      'uniquenessMigrationApplied',
      EXISTS (
        SELECT 1
        FROM _prisma_migrations
        WHERE migration_name = '20260316160000_external_review_finalized_uniqueness'
          AND finished_at IS NOT NULL
      ),
      'uniquenessIndexPresent',
      to_regclass('"ExternalReviewSubmission_single_finalized_identity_idx"') IS NOT NULL,
      'finalizedDuplicateGroups',
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT
            "reviewerCompanyId",
            COALESCE("reviewerUserId", '__NONE__'),
            "subjectCompanyId",
            COALESCE("subjectProductId", '__NONE__'),
            "moduleId"
          FROM "ExternalReviewSubmission"
          WHERE "reviewStatus" = 'FINALIZED'
          GROUP BY 1, 2, 3, 4, 5
          HAVING COUNT(*) > 1
        ) duplicates
      )
    )::text;
  `);

  const ok =
    failedMigrations.length === 0 &&
    expectedState.opsMigrationApplied &&
    expectedState.uniquenessMigrationApplied &&
    expectedState.uniquenessIndexPresent &&
    expectedState.finalizedDuplicateGroups === 0;

  const result = {
    ok,
    dbExecution: dbExec,
    failedMigrations,
    recentMigrations,
    expectedState,
  };

  if (!ok) {
    console.error("VERIFY_MIGRATION_HEALTH_ERROR", JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(
    "VERIFY_MIGRATION_HEALTH_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
