# AUDIT-WS9-001 — Batch per-firm aggregators

**Status:** Open. Block A drafted and reverted during WS10-C 2026-05-18.
**Filed:** 2026-05-17 during WS9-EMERGENCY.
**Last touched:** 2026-05-18 (WS10-C halt — see "WS10-C attempt and halt").
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

## Next-session recommendations

1. **Measure against production build, not dev.** Run `pnpm build && pnpm start`
   and time warm renders with the same curl harness. Dev-mode webpack +
   HMR + background bundling fights for CPU and makes timing bimodal on
   loaded machines. Production renders are stable.
2. **If load on the Mac mini is unavoidable, run 20-pass measurements and
   compare p50 *and* p10**, not just median. The p10 is closer to "real
   warm" timing and is less sensitive to noise.
3. **Block B (`getFirmProductCatalog`) is straightforward IF Block A
   actually wins.** Block C (`getAdminCompanyBriefing`) is the largest
   and riskiest — defer until A+B are proven.

## Estimated effort to ship cleanly

2–3 hours: re-apply Block A from this doc, build+start production locally,
measure with `pnpm start` + curl, commit if win is real, then Block B
following the same pattern. Block C remains a separate session.
