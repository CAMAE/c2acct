# AUDIT-WS9-001 — Batch per-firm aggregators

**Status:** Open — Block A re-applied and re-reverted during WS11-J 2026-05-19.
Production-build measurement was clean (no bimodal noise) but the batched
function delivered only a small win (~5–10% at p50) that didn't clear the 60%
ship threshold. Dominant cost on the focal pages lives elsewhere — see
"WS11-J production-build measurement" below.
**Filed:** 2026-05-17 during WS9-EMERGENCY.
**Last touched:** 2026-05-19 (WS11-J revert — production-build measurement
inconclusive at p50; structural argument valid but Postgres + Prisma absorb
the parallel-transaction overhead well enough that batching doesn't show at
warm-render scale on a single-machine demo bench).
**Branch where filed:** fix/local-review-signin-hotfix at HEAD 74d4712b + WS9 deltas.

## Problem

Three consultant-facing pages still fan out N parallel per-firm queries even
after WS9's read-path cleanup. Each per-firm aggregator opens its own Prisma
transaction. At demo-bench scale (15 firms in the focal ecosystem, 47 across
all benchmark ecosystems) this is the dominant cost in warm dev-mode renders
of `/consultants/ecosystems/[id]`.

Measured WS9 warm dev timing for ecosystem detail: 4.4–5.6s per render
(median ~4.7s). Production build will be faster but the per-firm fan-out
remains O(N) where it should be O(1) batched.

## Affected aggregators (file:line anchors at HEAD 74d4712b)

- `getAdminCompanyBriefing(firmId)` — called 15× from `lib/ecosystem.ts:256`,
  `lib/ecosystem.ts:567`, and `lib/briefs.ts:489`.
- `getFirmAssessmentProgress(firmId)` — called 15× from `lib/ecosystem.ts:261`,
  `lib/ecosystem.ts:572`, `lib/firmBriefs.ts:504`, and `lib/firmBriefs.ts:513`.
- `getFirmProductCatalog(firmId)` — called 15× from `lib/ecosystem.ts:579`
  and `lib/firmBriefs.ts:505`.

## Proposed shape

Rewrite each into a batched `companyIds[]`-accepting variant that runs O(1)
queries with `findMany({ where: { companyId: { in: ids } } })` plus in-memory
bucketing, returning a `Map<companyId, AggregateResult>`. Call sites then
become a single `await` plus a `.get(firmId)` per row.

## WS10-C attempt and halt

WS10-C tried to ship Block A (the `getFirmAssessmentProgress` batched
variant) on 2026-05-18 against branch `fix/local-review-signin-hotfix` at
HEAD ddfea553 (WS10-B). The code was drafted and passed `pnpm typecheck`,
`pnpm lint:test`, and `pnpm build`. Tenancy invariants were preserved:
both queries kept `companyId: { in: companyIdList }` AND
`SurveyModule: { key: { in: firmModuleKeys } }`. Fan-out call sites at
`lib/ecosystem.ts:261`/`:572` and `lib/firmBriefs.ts:504`/`:513` were
migrated to the batched function; single-firm callers in
`app/firm/page.tsx`, `app/firm/alignment-assessment/page.tsx`, and
`app/firm/insights/page.tsx` were left on the original.

**Why halted:** the timing measurement in dev mode was inconclusive.
Mac mini system load averaged 5.70 with 255 node processes running,
which produced a bimodal pass distribution (some passes fast, some 2×
slower) on both baseline AND Block A. Block A's *median* warm time was
worse than baseline on `/consultants/ecosystems/[id]` (7.86s vs 4.85s)
and `/firm/[firmId]` (6.17s vs 2.47s); Block A's *best-of-N* was
comparable to baseline best-of-N on every route. Per the WS10-C prompt's
strict halt rule ("median worse than baseline → revert"), the changes
were reverted via `git restore` before any commit.

The structural argument for Block A remains valid (3 queries vs 45),
but the demo machine's dev-mode noise prevented a clean measurement.
Production-build measurement was not attempted in this session.

## Resurrecting Block A (working code, archived)

The reverted Block A function is preserved here so a future session can
re-apply without re-deriving. Insert immediately after
`getFirmAssessmentProgress` in `lib/firmPat.ts`:

```ts
export async function getFirmAssessmentProgressByCompanyIds(
  companyIds: readonly string[]
): Promise<Map<string, FirmModuleProgress[]>> {
  if (companyIds.length === 0) {
    return new Map();
  }

  const firmModuleKeys = FIRM_MODULE_DEFINITIONS.map((definition) => definition.key);
  const companyIdList = [...companyIds];

  const [modules, finalSubmissions, draftSubmissions] = await Promise.all([
    prisma.surveyModule.findMany({
      where: { key: { in: firmModuleKeys } },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        SurveyQuestion: { select: { id: true } },
      },
    }),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        companyId: { in: companyIdList },
        SurveyModule: { key: { in: firmModuleKeys } },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        companyId: true,
        moduleId: true,
        score: true,
        createdAt: true,
      },
    }),
    prisma.surveySubmission.findMany({
      where: getSurveyDraftWhere({
        companyId: { in: companyIdList },
        SurveyModule: { key: { in: firmModuleKeys } },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        companyId: true,
        moduleId: true,
        answeredCount: true,
        createdAt: true,
      },
    }),
  ]);

  const finalsByCompany = new Map<string, typeof finalSubmissions>();
  for (const submission of finalSubmissions) {
    const bucket = finalsByCompany.get(submission.companyId) ?? [];
    bucket.push(submission);
    finalsByCompany.set(submission.companyId, bucket);
  }
  const draftsByCompany = new Map<string, typeof draftSubmissions>();
  for (const submission of draftSubmissions) {
    const bucket = draftsByCompany.get(submission.companyId) ?? [];
    bucket.push(submission);
    draftsByCompany.set(submission.companyId, bucket);
  }

  const result = new Map<string, FirmModuleProgress[]>();
  for (const companyId of companyIdList) {
    const submissions = finalsByCompany.get(companyId) ?? [];
    const drafts = draftsByCompany.get(companyId) ?? [];

    const progress = FIRM_MODULE_DEFINITIONS.map((definition) => {
      const moduleRecord = modules.find((entry) => entry.key === definition.key);
      if (!moduleRecord) {
        return {
          key: definition.key,
          badgeId: definition.badgeId,
          title: definition.title,
          description: definition.description,
          summary: definition.summary,
          href: `/survey/${definition.key}`,
          questionCount: 0,
          completedCount: 0,
          draftAnsweredCount: 0,
          status: "not-started",
          statusLabel: "Not Started",
          statusDescription:
            "This canonical firm module is not available in the local survey catalog yet.",
          latestScore: null,
          latestSubmittedAt: null,
          draftUpdatedAt: null,
        } satisfies FirmModuleProgress;
      }

      const latestSubmission =
        submissions.find((s) => s.moduleId === moduleRecord.id) ?? null;
      const latestDraft =
        drafts.find((d) => d.moduleId === moduleRecord.id) ?? null;
      const progressStatus = getFirmModuleProgressStatus({
        questionCount: moduleRecord.SurveyQuestion.length,
        latestSubmittedAt: latestSubmission?.createdAt ?? null,
        draftAnsweredCount: latestDraft?.answeredCount ?? 0,
      });

      return {
        key: moduleRecord.key,
        badgeId: definition.badgeId,
        title: moduleRecord.title,
        description: moduleRecord.description ?? "",
        summary: definition.summary,
        href: `/survey/${moduleRecord.key}`,
        questionCount: moduleRecord.SurveyQuestion.length,
        completedCount: progressStatus.completedCount,
        draftAnsweredCount: latestDraft?.answeredCount ?? 0,
        status: progressStatus.status,
        statusLabel: progressStatus.statusLabel,
        statusDescription: progressStatus.statusDescription,
        latestScore: latestSubmission?.score ?? null,
        latestSubmittedAt: latestSubmission?.createdAt ?? null,
        draftUpdatedAt: latestDraft?.createdAt ?? null,
      } satisfies FirmModuleProgress;
    });

    result.set(companyId, progress);
  }

  return result;
}
```

Migrate fan-out sites to this batched function (see WS10-C session
prompt for the exact call-site replacements; pattern is `Promise.all(ids.map(...))`
→ `(async () => { const map = await getFirmAssessmentProgressByCompanyIds(ids); return ids.map(id => derive(map.get(id) ?? [])); })()`).

## WS11-J production-build measurement (2026-05-19)

WS11-J resurrected Block A from "Resurrecting Block A" above and migrated
the fan-out call sites in `lib/ecosystem.ts` (×2) and `lib/firmBriefs.ts`
(×1). Tenancy invariants held (both `companyId in companyIdList` and
`SurveyModule.key in firmModuleKeys` filters preserved on both
`surveySubmission.findMany` calls — `grep` verified 4 hits). Typecheck +
lint + production build all clean.

Measurement methodology was the WS10-C recommendation: production build
(`pnpm build` then `node .next/standalone/server.js` via `startup-guard`,
port 3002), warm 3 + measure 17 per route, report p10/p50/p90. Server
host: Mac mini, 42-day uptime, load avg 6.19 (steady-state for this
machine — fseventsd / TCC / FileProvider / Metadata indexing are the
top CPU consumers, not anything from Node).

Results (n=17 per row):

| Route                                       | Baseline p50 | Block A p50 | % of baseline |
|---|---|---|---|
| `/consultants/ecosystems/[id]`              | 1.533s       | 1.403s      | **91.5%**     |
| `/consultants/ecosystems/[id]/firm/[firmId]`| 0.663s       | 0.625s      | **94.3%**     |

Full distribution:

| Route       | min   | p10   | p50   | p90   | max   |
|---|---|---|---|---|---|
| Eco — base  | 1.220 | 1.357 | 1.533 | 1.939 | 2.202 |
| Eco — A     | 1.285 | 1.299 | 1.403 | 1.617 | 1.619 |
| Firm — base | 0.573 | 0.598 | 0.663 | 0.785 | 0.879 |
| Firm — A    | 0.572 | 0.585 | 0.625 | 0.847 | 0.854 |

Block A's p90 on the ecosystem route is meaningfully tighter (1.617 vs
1.939) — the batched function does smooth the tail. But p10 and p50 are
near-identical to baseline, and neither route clears the prompt's ≤60%
ship threshold. Both routes sit comfortably inside the prompt's ±20%
"inconclusive — revert" band. Reverted via `git restore` per the
WS11-J prompt's "no commit if perf doesn't win" rule.

### Why the structural win didn't materialize

WS9 measured ecosystem detail at 4.4–5.6s warm in dev mode (median ~4.7s).
By WS11-J the same route measured 1.533s p50 in production build — a
3× improvement was already in the bag before Block A ran. Likely sources
of the missing latency: the WS9 `ensureFirmAlignmentSystem` removal from
the read path, plus the WS10/11 round of additional read-path cleanups
(briefings + insights split). The remaining ~1.5s is probably dominated
by `getAdminCompanyBriefing` (called 15× per ecosystem detail render, each
firm building its own briefing snapshot through several subqueries) and
`getVendorProductInsightCatalog` (the vendor-side aggregator that builds
a snapshot per product). Neither is touched by Block A.

The 47-firm benchmark ecosystem cited in the original problem statement
may still benefit from batching — at 15 firms the fan-out overhead is
~2-3× smaller than the actual aggregator work. A future session that
exercises the larger ecosystem scale (or measures a single firm with
heavier briefing data) could re-test.

## Next-session recommendations

1. **Profile the briefing aggregator before touching it.** WS9 + WS10 +
   WS11 collectively already cut the dominant read-path cost by ~3×. The
   remaining ~1.5s on `/consultants/ecosystems/[id]` and ~0.66s on
   `/consultants/.../firm/[firmId]` is the cost to beat. Add a
   `Performance.now()`-style trace around `getAdminCompanyBriefing`
   (15× calls per ecosystem detail) and `getVendorProductInsightCatalog`
   to identify the actual bottleneck. Don't batch what isn't slow.
2. **Re-test at 47-firm benchmark ecosystem scale.** WS9 cited 47 firms
   across all benchmark ecosystems. WS11-J only measured against the
   15-firm focal ecosystem. The fan-out overhead grows linearly while
   the per-firm work is constant — at 3× the firm count, batching
   should show more clearly. If a 47-firm benchmark page exists in
   the seed (or can be added without polluting the demo seed), re-run
   the harness there.
3. **Block A code is archived above, ready to re-apply.** It's known-
   working and tenancy-safe. If a future measurement justifies the
   refactor, the function body and call-site migration pattern don't
   need to be re-derived.
4. **Block B (`getFirmProductCatalog`)** — skip. WS11-J would have
   gated Block B on Block A's win materializing; it didn't, so
   batching `getFirmProductCatalog` (also a per-firm × 15 fan-out)
   would face the same wall.
5. **Block C (`getAdminCompanyBriefing`)** — this remains the
   highest-impact target. It does materially more work per call than
   the assessment-progress function. A batched variant would need
   careful tenancy review since `AdminCompanyBriefing` carries vendor-
   side product layer data joined per firm. Defer to a session with
   profiling data in hand.

## Estimated effort to ship cleanly

Post-WS11-J: not estimated. The ship decision depends on profiling data
that doesn't exist yet (which aggregator is actually hot) and on whether
the larger benchmark-ecosystem scale changes the calculus. If neither
condition materializes, leaving the per-firm fan-out as-is is the
correct call — the demo bench runs comfortably under 2s warm.
