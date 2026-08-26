# Vertical Packs

Patalign is **Vertical Pack-aware** (Blueprint §6). The product vision is "the
alignment system of all software vendors and all firms" — accounting is **V1 of
N**. A Vertical Pack bundles everything industry-specific; everything structural
stays shared, so adding manufacturing/finance/architecture is *configuration*,
not a rewrite.

## Structural vs descriptive (the core principle)

- **Structural (shared)** — the entities and the scoring math: Company, Product,
  VendorProfile, capability scores, alignment scoring, agent runtime, auth,
  audit. These do **not** verticalize.
- **Descriptive (per-vertical)** — labels, categories, codes, content: the vendor
  taxonomy (TaxonomyBucket), insights, badges, survey modules/questions. These
  carry a `verticalId` column (default `"accounting"`).

`verticalId` was added to: `Company`, `VendorProfile`, `Product`, `SurveyModule`,
`SurveyQuestion`, `Insight`, `InsightUnlockRule`, `Badge`, `CompanyBadge`,
`BadgeRule`, `TaxonomyBucket` (migration `add_vertical_id_layer`), and — in PF-2
W5, migration `add_vertical_id_module_content_and_benchmarks` — `ModuleItem`,
`ModuleUnlockRule`, `ModuleSitting`, `ItemResponse`, `SurveySubmission`,
`CompanyBenchmark` and `CompanyBenchmarkCohort`. Twenty-one models in total, all
defaulting to `"accounting"`, all covered by the freeze rule below.

`BenchmarkCohort` and `BenchmarkRun` are deliberately NOT verticalized: a cohort
is single-vertical **by construction** (see *Benchmark cohort isolation*), and
giving the cohort itself a column would invite a reader to filter a shared pool
instead — which is the failure mode the audit's §5.1 warns about.

> Note: the original spec referenced an `AccountingTaxonomyNode` table to rename
> to `TaxonomyNode`. No such table exists — the real externalized taxonomy is
> **`TaxonomyBucket`**, which is verticalized directly (no rename).

## The framework flag — `PAT_ENABLE_VERTICAL_PACKS`

The framework ships dark. **Off (the default) is byte-identical to
pre-framework behaviour**, and the mechanism is a short-circuit rather than a
carefully-configured accounting pack (VERTICAL-READINESS-AUDIT-2026-08 §3.3):

- `resolveCurrentVertical()` returns the `"accounting"` constant *before* any
  pack load. Not "loads the accounting pack" — returns the constant. A
  pack-loading bug therefore cannot reach a flag-off tenant.
- `lexicon()` returns the literal strings already in the code, from the frozen
  in-code `ACCOUNTING_LEXICON` map, with no filesystem access.
- Content queries gain `verticalId` filters only when the flag is on, so no
  query plan changes for the default tenant.

The proof obligation is a test, not a promise:

| Guarantee | Test |
|---|---|
| Resolution order, short-circuit, pack-id immutability | `tests/vertical-resolver.contract.test.ts` |
| Guarded copy renders character-for-character as before the seam | `tests/vertical-lexicon-byte-identity.contract.test.ts` |
| Pack authorities classify both banks exactly as the deleted branches did | `tests/qbank-source-authorities.contract.test.ts` + a `scripts/modules/qbank-preflight.ts` output diff |
| The scope seam adds no predicate and no column flag-off; the session resolver performs zero reads flag-off; the W5 migration is additive-only | `tests/vertical-scope-and-session.contract.test.ts` |
| No client component resolves its own vertical | `tests/vertical-client-lexicon.contract.test.ts` |
| The accounting pack's question bank deep-equals the in-code registry; the (vertical, version) key is never joined into a string | `tests/vertical-question-bank-registry.contract.test.ts` |
| Cohort isolation: mixed input throws, suppression counts per vertical, accounting cohorts unchanged either way | `tests/vertical-cohort-isolation.contract.test.ts` + `tests/vertical-cohort-isolation-db.contract.test.ts` |

The qbank importer and preflight are the one place a pack loads flag-off: they
are offline scripts with no request path and no query plan, and reading the
accounting pack's authority list there is what keeps a single source of truth.

## Resolution order

`resolveCurrentVertical({ verticalId, session })` — first hit wins:

1. **Explicit argument** — an operator or job naming a vertical outright.
2. **Tenant** — `Company.verticalId` for the signed-in company, passed as
   `session.company.verticalId`. The normal path.
3. **`PAT_DEFAULT_VERTICAL`** env override.
4. The **`"accounting"`** constant.

Blank and whitespace-only values count as absent at every step.
`resolveCurrentVerticalWithSource()` returns the same answer plus which step
produced it — `"flag-off"` is distinct from `"constant"` on purpose, because
"returned accounting" and "short-circuited to accounting" are the same string
and very different guarantees.

> **Pack ids are frozen.** Every verticalized model defaults `verticalId` to
> `"accounting"`, on rows written before any vertical existed. Renaming a pack
> silently orphans them — the column keeps a valid-looking string pointing at a
> pack that no longer exists. A rename is a data migration, never a config edit.
> `FROZEN_VERTICAL_IDS` and its contract test make the config-only version fail.

## Pack format

A pack lives at `verticals/<id>/pack.yaml` (block-style YAML — parsed by the
in-repo loader, no flow maps):

```yaml
id: accounting
name: Accounting
version: 2
description: Accounting firm + vendor alignment pack
lexicon:                     # class (d) — display-layer nouns
  ecosystem: "accounting ecosystem"
  firm: "accounting firm"
  firmArticle: "an"          # English does not derive this
  firmPlural: "accounting firms"
  firmMarket: "accounting-firm market"
  vendorAudience: "software for accounting firms"
taxonomy:
  source: db                 # taxonomy lives in TaxonomyBucket
  filter:
    verticalId: accounting
questionBank:                # class (b)
  sourceAuthorities:         # ORDER IS SIGNIFICANT — one ref per match, in order
    - org: GAO
      match: ["Green Book", "Yellow Book", "GAGAS", "GAO"]
      license: PUBLIC_DOMAIN
    - org: COSO
      match: ["COSO"]
      license: CITED
workflows:
  - templates/vendor-review.yaml
  - templates/firm-alignment-assessment.yaml
agent_prompts:
  vendor-review-assistant: prompts/vendor-review.md
compliance:
  audit_retention_days: 365
  data_residency: us-east
reference_signals: signals/accounting-baselines.json
eval_set: evals/accounting/
```

Paths in `workflows` / `agent_prompts` / `reference_signals` / `eval_set` are
relative to the pack directory.

## The lexicon (class d)

A pack supplies **industry nouns, never sentences**. Structure, punctuation and
casing stay in the surface:

```ts
eyebrow: `GUIDED INSIGHTS FOR THE ${lexicon("ecosystem").toUpperCase()}`
title:   `I run or work at ${lexicon("firmArticle")} ${lexicon("firm")}`
```

The accounting pack's values *are* the literal strings that shipped before the
seam existed, and `ACCOUNTING_LEXICON` (the in-code map the flag-off path
returns) is pinned to the pack's `lexicon:` block by contract test, so the two
cannot drift.

`lexicon()` is synchronous — it has to be a drop-in for a string literal — while
pack loading is async. Flag-on callers therefore hand a loaded pack's lexicon to
`primeVerticalLexicon(id, values)` at the request/job boundary. A pack lexicon
missing any key is rejected outright rather than filled in per key: a partial
lexicon renders one vertical's nouns inside another vertical's copy, which reads
as correct and is not. For the same reason, an unprimed **non-accounting**
vertical throws rather than falling back.

Guarded surfaces today: `lib/patContent.ts`, `lib/selfSignupWizard.ts`,
`lib/publicOnboarding.ts`. Each builds its copy in a function rather than a
module-scope const — a const would freeze the lexicon at import time, which is
correct flag-off and wrong the moment a request resolves elsewhere.

## The scope seam — how flag-off stays byte-identical in the database

`lib/verticals/scope.ts` is the one place a verticalized query or write becomes
vertical-aware:

```ts
where: { companyId, ...verticalFilter({ verticalId }) }   // reads
data:  { ...row,   ...verticalStamp({ verticalId }) }     // writes
```

**Flag off, both return `{}`.** An empty spread adds no predicate to a `where`
and names no column in a `data` payload, so Postgres plans the statement it
planned before this framework existed and the W5 `DEFAULT 'accounting'` supplies
the value on insert. That default is the *true* value, not a fallback: every row
that exists today was written before any vertical did.

The shape is `{}` and not `{ verticalId: undefined }`. Prisma treats both as "no
filter", but only the first is provable — `toEqual({})` can tell them apart, and
"no filter for a default tenant" has to be checkable rather than trusted.

Two call sites deserve their own note, because a `findUnique` cannot take a
non-unique filter:

- `lib/modules/portal.ts` `readSittingRow()` selects `verticalId` **only when
  the flag is on**, and asserts the vertical against the selected column. Flag
  off the emitted statement is column-for-column the one that shipped.
- `requireFirmModuleAccess()` adds `verticalId` to the Company `select` it was
  already issuing rather than opening a second round trip. A surface that
  already loads its Company row should do the same; §3.3 forbids a *new* read
  for a default tenant, not a wider one.

## Resolving the tenant's vertical at the session boundary

`lib/verticals/session.ts` is the production caller PF-1 deferred.

```ts
const verticalId = await resolveVerticalForRequest();   // React-cached per request
```

- **Flag off** it returns the `"accounting"` constant having read *nothing* —
  no session, no company row. The contract test proves this by counting calls to
  injected readers and asserting both are zero, because "no new DB reads" is
  only credible as a counted fact.
- **Flag on** it reads `Company.verticalId` once per request and runs the full
  resolution order around it.
- A request that resolves to a **synthetic** vertical (`SYNTHETIC_VERTICAL_IDS`)
  throws. A mis-seeded tenant column pointing at a test fixture fails loudly
  instead of quietly serving fixture nouns.

`resolveVerticalForCompany(companyId)` is the same thing for jobs and operators.

### The client lexicon

**A client component receives the lexicon; it never resolves one.** Two reasons,
and the second is the one that bites:

1. `process.env.PAT_ENABLE_VERTICAL_PACKS` read from client code is inlined at
   **build** time. One build serves every tenant, so a build-time flag read
   cannot be per-tenant however carefully it is written — it freezes whatever
   value the builder happened to have.
2. Pack loading is filesystem access. There is no filesystem in a browser, and
   shipping packs to the client would ship every vertical's nouns to every
   tenant.

So resolve server-side and pass down — props for one component, context when the
value would otherwise be threaded through several layers:

```tsx
// page.tsx (server component)
const lexicon = await resolveLexiconForRequest();
return (
  <VerticalLexiconProvider value={lexicon}>
    <SomeInteractiveThing />
  </VerticalLexiconProvider>
);

// SomeInteractiveThing.tsx ("use client")
const t = useLexicon();
<h2>Built for {t("firmPlural")}</h2>
```

`resolveLexiconForRequest()` returns a frozen record of plain strings, which
crosses the RSC boundary as-is. There is deliberately no default context value:
a missing provider throws rather than quietly rendering accounting nouns, for
the same reason an unprimed non-accounting lexicon throws.

`tests/vertical-client-lexicon.contract.test.ts` scans every `"use client"` file
and fails if one reads the flag, reads `PAT_DEFAULT_VERTICAL`, or imports the
resolver, the loader, the scope seam or the session module at runtime.

## The pack-declared question bank — keyed by a PAIR

Audit §5.5 raised that `2026-08-product-utility-v3` encodes no vertical, so two
verticals could not both version their banks. **The ruling: the version string
stays unqualified, and a bank's identity is the pair**

```
(verticalId, versionId)
```

`verticalId` comes from the W5 column — one source of truth — and never from
parsing a compound string. There is **no slash-joined form of this key anywhere**:
a joined id would be a second spelling of a fact the column already holds, it
would have to be split apart at every read, and it would change every stored
question id. Accounting's ids stay byte-identical precisely because the version
half is untouched.

The store is therefore a **map of maps** — vertical → version → bundle — rather
than a flat map under a composed string. The nesting is the point: there is no
string to build and no string to split. Two verticals can register the *same*
unqualified version id without colliding.

**The freeze rule covers both halves.** `FROZEN_REGISTRY_KEYS` pins
`(accounting, 2026-08-product-utility-v3)`: the version half is embedded in
every stored question id and the vertical half is on every row, so renaming
either is a data migration, exactly as renaming a pack id is.

A pack declares its bank with `questionBank.utilityRegistry`, a path relative to
the pack dir. Accounting's bank is **in-code truth**
(`lib/productUtilityRegistry.ts`); `verticals/accounting/registry/` holds its
mirror so the pack declares its own bank the way a second vertical would, and a
contract test deep-equals the two. Regenerate the mirror with
`scripts/verticals/export-product-utility-registry.ts` — never hand-edit it.

Flag off, `resolveProductUtilityRegistry()` returns the in-code bundle before
resolving anything: the same object graph the module-level import always
produced. Flag on, a non-accounting vertical with no registered bank **throws**
rather than falling back — serving accounting's utilities inside another
vertical's assessment reads as correct and is not.

> **Known limit.** A few consumers still capture the bank in a module-scope
> const (`VENDOR_UTILITY_CATALOG` in `lib/vendorPat.ts`, the open-ended runtime
> map in `lib/adminBriefingEngine.ts`). A const freezes the registry at import
> time — correct flag-off and correct flag-on-with-only-accounting, wrong the
> moment a *second* vertical's product assessment is built. Converting those to
> functions is the first task of any real second vertical; until then the
> unregistered-vertical throw above is what stops a silent wrong answer.

## Benchmark cohort isolation

Audit §5.1 is the only risk in this framework that can corrupt **published**
numbers, and the reason it needs an invariant rather than care is that *nothing
fails* when it goes wrong: suppression's 5-contributor floor and 25% dominance
cap both pass for a cross-vertical pool, because five firms are five firms. The
benchmark silently changes meaning and every downstream check stays green.

The invariant, in `lib/benchmarkCohortIsolation.ts`:

> A benchmark cohort contains exactly one vertical's contributors, and a mixed
> contributor set is a **thrown error, never a filtered one**.

Throwing rather than filtering is the whole design. A filter would "handle" the
mixed input: drop the foreign rows, publish a plausible number, and leave no
trace of the caller that mixed them. An exception is the only outcome that makes
the defect visible when it is introduced. The same reasoning covers an unknown
or packless vertical — that is a caller with a bad id, not an empty cohort, so
`assertVerticalPackInstalled()` throws. **Silent acceptance is the bug.**

Three further rules:

- **Cohort keys.** Accounting keeps today's literal keys (`firm:real`,
  `vendor:demo`). `BenchmarkCohort.key` is unique and already stored, so
  qualifying accounting's would orphan every existing cohort row and every
  `CompanyBenchmark` pointing at it. Another vertical gets its id appended, so
  its cohorts are separate **rows** rather than a filtered view of a shared one.
  The key is only ever constructed, never parsed back apart.
- **Suppression counts per vertical.** The thresholds stay vertical-neutral
  (class c) — 5 and 25% — but the *denominator* is one vertical's contributors.
  Three accounting firms plus three second-vertical firms is three, not six, and
  stays suppressed for both.
- **A mix that is legitimately expected** (a cross-vertical job) uses
  `partitionByVertical()`, which produces separate cohorts. That is the only
  sanctioned way to handle rows from more than one vertical.

### The synthetic fixture vertical

Isolation cannot be proved with one vertical installed: "accounting never mixes
with another vertical" is vacuously true while accounting is the only vertical
there is. So `verticals/test-fixture/` exists — a real, loadable second pack
whose every value is deliberate nonsense.

It is walled off from production by four guards, each with a test: it is **not**
in `FROZEN_VERTICAL_IDS` (nothing stored may reference it); it **is** in
`SYNTHETIC_VERTICAL_IDS`, so `resolveVerticalForSession()` throws if a real
request ever resolves to it; it declares no `utilityRegistry`, so no product
assessment can be built for it; and a contract test fails if any shipping source
file outside `tests/` names it.

Never add real content to it. A genuine second vertical gets its own pack.

## lib/verticals API

- `loadVerticalPack(id)` — load + zod-validate `verticals/<id>/pack.yaml`; throws
  a clean error if missing/invalid.
- `getTaxonomyForVertical(id)` — `TaxonomyBucket[]` filtered by the pack's vertical.
- `getPromptForVertical(id, key)` — markdown for an `agent_prompts` key.
- `listVerticalPacks()` / `listVerticalIds()` — every installed pack.
- `resolveCurrentVertical({ verticalId?, session? })` (`context.ts`) — the current
  vertical for a request, per the resolution order above.
- `resolveCurrentVerticalWithSource(...)` — the same, with provenance.
- `isVerticalPacksEnabled()` (`flag.ts`) — the `PAT_ENABLE_VERTICAL_PACKS` read.
- `lexicon(key)` / `resolveLexicon()` / `primeVerticalLexicon(id, values)`
  (`lexicon.ts`) — the class-(d) display layer.
- `loadQbankSourceAuthorities()` (`lib/modules/qbankSourceAuthorities.ts`) — the
  resolved pack's question-bank citation authorities.
- `verticalFilter()` / `verticalStamp()` (`scope.ts`) — the read/write scope
  seam. `{}` with the flag off.
- `resolveVerticalForRequest()` / `resolveVerticalForSession()` /
  `resolveVerticalForCompany()` (`session.ts`) — the tenant step's production
  callers. Zero reads flag-off.
- `resolveLexiconForRequest()` (`requestLexicon.ts`) — resolve + load + prime the
  lexicon at a request boundary, for handing to client components.
- `resolveProductUtilityRegistry()` / `getProductUtilityRegistry(vertical,
  version)` / `loadPackProductUtilityRegistry(id)` (`questionBankRegistry.ts`) —
  the (vertical, version)-keyed product-utility bank.
- `SYNTHETIC_VERTICAL_IDS` / `isSyntheticVerticalId()` (`context.ts`) — packs
  that exist only for tests and may never serve a request.
- `assertSingleVerticalCohort()` / `assertVerticalPackInstalled()` /
  `evaluateBenchmarkSuppressionForVertical()` / `benchmarkCohortKey()` /
  `partitionByVertical()` (`lib/benchmarkCohortIsolation.ts`) — the W6 invariant.

## Adding a new Vertical Pack (e.g. manufacturing v1)

1. `verticals/manufacturing/pack.yaml` with `id: manufacturing` + its files
   (templates, prompts, signals, evals).
2. Seed `TaxonomyBucket` rows with `verticalId = "manufacturing"` (manufacturing
   categories — ERP, MES, quality, …).
3. Create the descriptive rows (Insights, SurveyModules, Badges) with
   `verticalId = "manufacturing"`.
4. Give the manifest a complete `lexicon:` block — every key in `LEXICON_KEYS`,
   or the pack is rejected — and its own `questionBank.sourceAuthorities`
   (a non-accounting vertical shares NIST and little else).
5. Author its product-utility bank and point `questionBank.utilityRegistry` at
   it, then load it with `loadPackProductUtilityRegistry()` at the request/job
   boundary. An unregistered non-accounting vertical throws rather than
   borrowing accounting's utilities.
6. Its benchmark cohorts are its own rows, keyed `firm:real:manufacturing` and
   so on. Never add its firms to an accounting cohort — the isolation invariant
   throws, and it is meant to.
7. Convert the module-scope registry consts listed under *Known limit* above to
   functions; a const freezes the bank at import time.
8. No runtime/schema change beyond that: the structural entities and scoring math
   are shared; `loadVerticalPack("manufacturing")` and
   `getTaxonomyForVertical("manufacturing")` work immediately.

PF-2 delivered module-content keying (W5), the pack-declared product-utility
registry (W3) and benchmark cohort isolation (W6). Still not built: a
per-vertical demo/pilot seed (W7), and the module-scope-const consumers noted
under the question bank above. Scoring, bands and suppression stay cross-vertical
identical by design — see the audit's class (c).

The agent runtime stays untouched — agents resolve their pack from their config's
`vertical_id` (see `scripts/agents/qa-smoke.ts` for the reference integration).
