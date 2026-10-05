import prisma from "@/lib/prisma";

/**
 * hotfix-demo-1 (R59, change 9, audit E4): the preview briefing read "Latest update
 * 5/5/2027" and the Meridian ecosystem "Last full assessment Oct 14, 2026" — demo
 * rows carrying timestamps in the future. Both readers are plain max() reducers
 * (adminBriefingEngine latestDate over SurveySubmission.createdAt; firmPat
 * summarizeFirmAlignmentProgress lastFullAssessmentAt), so the data is the fault.
 *
 * One-off, data only, no schema: every timestamp column in the public schema is
 * scanned; a value in the future is moved to today minus the same offset
 * (now - (value - now)). Dry run by default; --apply writes. Prints what changed.
 * No seed re-run (audit E6).
 *
 *   DATABASE_URL=... node --import tsx scripts/demo/shift-future-timestamps.ts [--apply]
 */
const APPLY = process.argv.includes("--apply");
const PRINT_CAP = 40;

type ColumnRow = { table_name: string; column_name: string };
type FutureRow = { id: string | null; value: Date };

async function main() {
  const columns = await prisma.$queryRawUnsafe<ColumnRow[]>(
    `select table_name, column_name
       from information_schema.columns
      where table_schema = 'public'
        and data_type in ('timestamp without time zone', 'timestamp with time zone')
        and table_name not like '\\_prisma%'
      order by table_name, column_name`
  );
  console.log(`\n================ SHIFT FUTURE TIMESTAMPS — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  console.log(`scanning ${columns.length} timestamp columns`);
  const now = new Date();
  let totalFuture = 0;
  let totalShifted = 0;
  for (const column of columns) {
    const table = `"${column.table_name}"`;
    const col = `"${column.column_name}"`;
    const hasId = await prisma.$queryRawUnsafe<Array<{ ok: number }>>(
      `select 1 as ok from information_schema.columns where table_schema='public' and table_name=$1 and column_name='id'`,
      column.table_name
    );
    const idExpr = hasId.length ? `"id"::text` : `null`;
    const future = await prisma.$queryRawUnsafe<FutureRow[]>(
      `select ${idExpr} as id, ${col} as value from ${table} where ${col} > now() order by ${col} desc`
    );
    if (future.length === 0) continue;
    totalFuture += future.length;
    console.log(`\n${column.table_name}.${column.column_name}: ${future.length} future value(s)`);
    for (const row of future.slice(0, PRINT_CAP)) {
      const mirrored = new Date(now.getTime() - (row.value.getTime() - now.getTime()));
      console.log(`  ${row.id ?? "(no id)"}  ${row.value.toISOString()}  ->  ${mirrored.toISOString()}`);
    }
    if (future.length > PRINT_CAP) console.log(`  ... ${future.length - PRINT_CAP} more`);
    if (APPLY) {
      const updated = await prisma.$executeRawUnsafe(
        `update ${table} set ${col} = now() - (${col} - now()) where ${col} > now()`
      );
      totalShifted += updated;
      console.log(`  applied: ${updated} row(s) shifted`);
    }
  }
  console.log(`\nfuture values found: ${totalFuture}; shifted: ${APPLY ? totalShifted : 0}${APPLY ? "" : " (dry run; re-run with --apply)"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
