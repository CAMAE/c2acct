# Vertical Readiness Audit — 2026-08

**Status:** Audit only. No code changed, nothing committed beyond this document.
**Scope:** W1-A. Inventory every accounting assumption, map the existing
`verticalId` plumbing, classify each finding, and propose the Vertical Pack
framework. Implementation is a later box.

---

## 0. Headline

The schema is **further along than the code**. Fourteen models already carry a
`verticalId` column with an `accounting` default and an index — the storage layer
is essentially vertical-ready. The *behaviour* is not: **`app/` contains zero
references to `verticalId`.** No route, page, or component reads it.

Two resolution seams exist and **both are unconsumed**:

| Seam | Location | Consumed by |
|---|---|---|
| `resolveVerticalId(config)` | `lib/agents/vertical-pack.ts:9` | `lib/agents/sdk.ts` — **writes** the column, never filters on it |
| `resolveCurrentVertical()` | `lib/verticals/context.ts:8` | **nothing** — zero callers |

The `lib/verticals/*` pack framework (loader, taxonomy, prompts) is real,
validated, and tested — and behaviourally inert. `getTaxonomyForVertical` and
`getPromptForVertical` are called **only from `tests/vertical-packs.test.ts`**.
`loadVerticalPack` has two production callers, `scripts/agents/internal-knowledge.ts:22`
and `scripts/agents/qa-smoke.ts:38`, and both do nothing with the result except
**log `pack.id`**.

So the honest position is: we have a vertical-shaped *skeleton* with no muscle.
That is good news for the build — the hard schema migration is already paid for —
but it means nobody should read "14 models carry verticalId" as "we are
multi-vertical ready".

---

## 1. Inventory with receipts

### 1.1 The `verticalId` storage layer — already keyed

Fourteen models, each `String @default("accounting")` with an index
(`prisma/schema.prisma`):

`Badge` · `BadgeRule` · `Company` · `CompanyBadge` · `Insight` ·
`InsightUnlockRule` · `Product` · `VendorProfile` · `TaxonomyBucket` ·
`SurveyModule` · `SurveyQuestion` · `AgentDefinition` · `KnowledgeSource` ·
`ModuleTemplate`

**Class (a) — already vertical-keyed.** Nothing to do at the column level.

**Gap worth naming:** several models that would need keying in a multi-vertical
world do *not* carry it — `ModuleItem`, `ModuleUnlockRule`, `ModuleSitting`,
`ItemResponse`, `SurveySubmission`, `CompanyBenchmark`, `CompanyBenchmarkCohort`.
Module content and benchmark cohorts are exactly the things a vertical pack must
separate, so this is class (b).

### 1.2 The pack framework — real but vestigial

| Item | Receipt | Status |
|---|---|---|
| Pack manifest schema + loader | `lib/verticals/loader.ts:34` | Real, validated, tested |
| Taxonomy resolver | `lib/verticals/taxonomy.ts:11` | **Vestigial** — tests only |
| Prompt resolver | `lib/verticals/prompts.ts:6` | **Vestigial** — tests only |
| Request-vertical seam | `lib/verticals/context.ts:8` | **Vestigial** — zero callers |
| Agent pack seam | `lib/agents/vertical-pack.ts:9` | Write-only |
| `verticals/accounting/pack.yaml` | manifest | Real; declares taxonomy filter, workflows, prompts, compliance, signals, eval set |

`verticals/accounting/` also holds `signals/accounting-baselines.json`,
`prompts/vendor-review.md`, two workflow templates, and an `evals/accounting/`
README. The manifest's `taxonomy.filter.verticalId` is the one piece of the pack
that already describes real behaviour we could switch on.

### 1.3 Hardcoded accounting assumptions

**The product-utility registry — the single largest accounting asset.**
`lib/productUtilityRegistry.ts:240`, 18 utilities whose *keys* are accounting
domain terms: `erp_gl_core_ledger`, `tax_workflow_compliance`,
`audit_workflow_workpapers_evidence`, `close_reconciliation_consolidation`,
`ap_payables_spend`, `ar_billing_collections`, `payroll_workforce_support`,
and so on. Version id at `:1` is `2026-08-product-utility-v3`. Every scored
product question hangs off this. **Class (b)** — this is the primary pack payload.

**Taxonomy seeds.** `data/research/accounting-software-taxonomy-v1.json` — 27
`taxonomyBuckets` plus bucket→capability mappings, imported by
`scripts/import-accounting-taxonomy.ts:16`. Rows land in `TaxonomyBucket`, which
already carries `verticalId`. **Class (a) storage, (b) content.**

**qbank source classifier.** `lib/modules/qbankParser.ts:61` hardcodes
US-accounting/security authorities: `Green Book` / `Yellow Book` / `GAGAS` / `GAO`,
`Circular 230` / `IRS`, `NIST`, `FTC` / `Safeguards Rule` / `16 CFR` / `GLBA`,
`COSO`. A legal or healthcare vertical shares NIST and nothing else. **Class (b).**

**Front-door and portal copy.** **Class (d)** — needs a display-layer lexicon:
- `lib/patContent.ts:3` — `"GUIDED INSIGHTS FOR THE ACCOUNTING ECOSYSTEM"`, plus
  four more "accounting ecosystem" strings in the hero and about copy.
- `lib/selfSignupWizard.ts:158` — `"I build software for accounting firms"`,
  `"I run or work at an accounting firm"`, and a goal option
  `"Prove product–market fit with accounting firms"`.
- `lib/publicOnboarding.ts:89` — `"…where the product fits the accounting-firm market."`

**Brand.** `app/globals.css:168` (`.brand-c2-accounting`) and
`app/components/brand/BrandMarks.tsx:24,33` (`accountingLabel`). The *brand* is
"C2 Accounting" — this is an identity decision, not a lexicon one, and is called
out below as an open question rather than classified.

**Demo/pilot seed data.** `data/demo-seed/expansion-catalog.json` — vendors
("Northwind Practice OS", "Tessera Tax Suite", "Cadence Close", "Ironclad
Assurance") and firms ("Alderwood CPAs", "Brightmoor LLP"). Accounting-flavoured
throughout. **Class (b)** — a demo cohort per vertical, or the demo stays
accounting-only and is labelled as such.

### 1.4 Things that look vertical-specific and are NOT

Worth recording, because the instinct is to sweep them and that would be wrong:

- **`FIRM_MODULE_DEFINITIONS`** (`lib/firmPat.ts:29`). The five pillars are
  **Operations, Automation, Integration, Governance, Strategy** with titles like
  "Operating Model and Workflow Discipline" and "Integration and Data Flow
  Maturity". Not one is accounting-specific. The pillar layer is reusable across
  verticals as-is. **Class (c).** The 100 question *stems* underneath were not
  audited for domain language in this pass — see §5.
- **`FIRM_CAPABILITY_DEFINITIONS`** (`lib/firmCapabilities.ts:98`) — same shape,
  same verdict pending a stem-level read.
- **The Ask Pat help corpus.** 36 articles in `scripts/index-help.ts:23`. A
  keyword scan for accounting/CPA/ledger/audit/tax returns **zero content hits**;
  the only matches are the two `verticalId: "accounting"` assignments at `:318`
  and `:332`. The articles describe PAT's own mechanics (bands, suppression,
  membership, portals) and are vertical-neutral. **Class (a) keyed, (c) content.**
- **Scoring, bands, suppression, cost accounting.** `lib/scoring.ts`,
  `lib/bandLexicon.ts`, `lib/benchmarkSuppression.ts`, `lib/agents/cost.ts:31` —
  pure arithmetic and policy. **Class (c).**

---

## 2. Classification summary

| Class | Meaning | Findings |
|---|---|---|
| **(a) already vertical-keyed** | Column exists and defaults correctly | 14 models; help corpus rows |
| **(b) needs `verticalId` keying** | Content or logic that must split per vertical | Product-utility registry · taxonomy seeds + buckets · qbank source classifier · module content models (`ModuleItem`, `ModuleUnlockRule`, `ModuleSitting`, `ItemResponse`) · benchmark cohorts · demo seed |
| **(c) global / vertical-neutral** | Leave alone | Scoring, bands, suppression, cost rates, firm pillars, help-article content, agent runtime, eval harness |
| **(d) display-layer lexicon** | Same structure, different words | `patContent` hero/about · `selfSignupWizard` role + goal copy · `publicOnboarding` vendor copy · any surface saying "firm"/"vendor" where a vertical says otherwise |

---

## 3. Proposed Vertical Pack framework

### 3.1 Data shapes

Extend the existing manifest rather than inventing a second format —
`verticals/<id>/pack.yaml` already validates through `lib/verticals/loader.ts`.

```yaml
id: accounting
name: Accounting
version: 2
lexicon:                      # class (d) — display layer
  ecosystem: "accounting ecosystem"
  firm: "accounting firm"
  firmPlural: "accounting firms"
  vendorAudience: "software for accounting firms"
taxonomy:                     # class (b) — already db-filtered
  source: db
  filter: { verticalId: accounting }
questionBank:                 # class (b) — NEW
  utilityRegistry: registry/product-utility-v3.json
  sourceAuthorities:          # replaces the hardcoded qbank classifier
    - { match: ["Green Book", "GAO"], org: GAO, license: PUBLIC_DOMAIN }
    - { match: ["NIST"],              org: NIST, license: PUBLIC_DOMAIN }
    - { match: ["COSO"],              org: COSO, license: CITED }
moduleContent:                # class (b) — banks scoped to the vertical
  banks: [governance-v1, integration-v1]
benchmarkCohort:              # class (b) — cohorts never cross verticals
  isolation: strict
```

Two shapes deliberately **not** in the pack: scoring/bands/suppression (class c,
must stay identical across verticals or cross-vertical comparison becomes
meaningless) and the eval harness (the goldens test arithmetic, not vocabulary).

### 3.2 Resolution order

One resolver, consulted in this order, with the *first* hit winning:

1. **Explicit argument** — an operator or job naming a vertical outright.
2. **Tenant** — `Company.verticalId` for the signed-in company. This is the
   normal path and the reason the column already exists.
3. **`PAT_DEFAULT_VERTICAL`** env override — already read by
   `lib/verticals/context.ts:9`, currently by nothing else.
4. **`"accounting"`** constant.

`resolveCurrentVertical()` is the right home; it needs a session argument it does
not currently take, and it needs callers.

### 3.3 Flag strategy — `PAT_ENABLE_VERTICAL_PACKS`

**Off (default) must be byte-identical to today.** The mechanism that makes that
credible, rather than merely intended:

- Flag off ⇒ the resolver **short-circuits to the constant `"accounting"`**
  before any pack load. Not "loads the accounting pack" — returns the constant.
  A pack-loading bug therefore cannot reach a flag-off tenant.
- Flag off ⇒ lexicon lookups return the **literal strings already in the code**.
  The seam is introduced by replacing `"accounting ecosystem"` with
  `lexicon("ecosystem")`, where the accounting pack's value *is that string*.
- The proof obligation is a test, not a promise: a contract test that renders the
  guarded copy surfaces with the flag off and asserts the output equals the
  current strings **character for character**. That test is cheap and it is the
  thing that lets accounting ship unchanged.
- Content queries gain `verticalId` filters only when the flag is on; flag off
  keeps today's unfiltered queries, so no query plan changes for the default
  tenant.

### 3.4 How accounting stays byte-identical

| Layer | Flag off | Flag on |
|---|---|---|
| Resolver | returns `"accounting"` constant, no pack load | tenant → env → constant |
| Lexicon | literal strings, unchanged code paths | pack `lexicon` map |
| Taxonomy | current unfiltered query | `verticalId` filter |
| Question bank | `PRODUCT_UTILITY_REGISTRY` import | pack-declared registry |
| qbank sources | hardcoded classifier | pack `sourceAuthorities` |
| Benchmarks | current cohort logic | cohort isolation per vertical |

---

## 4. Build estimate

Sizing the *framework*, not the content of a second vertical.

| Workstream | Est. | Notes |
|---|---|---|
| W1 Resolver + flag + byte-identical contract test | **S** | Seams exist; needs a session arg, callers, and the character-for-character test |
| W2 Lexicon seam + copy migration (class d) | **M** | ~10 strings across 3 files; the work is the seam and its test, not the strings |
| W3 Registry → pack-declared question bank | **L** | Largest single item. 18 utilities × 4 subcategories × 5 questions, plus the v3 wording pins in the eval golden |
| W4 qbank `sourceAuthorities` (class b) | **S** | Replace 5 hardcoded branches with pack data; parser is already isolated and tested |
| W5 Module-content keying (`ModuleItem`/`ModuleUnlockRule`/`ModuleSitting`/`ItemResponse`) | **M** | Additive migration + resolver filters; Block A/B code is fresh and well-tested |
| W6 Benchmark cohort isolation | **M–L** | Highest correctness risk — see §5 |
| W7 Demo/pilot seed per vertical | **M** | Or scope demo to accounting and label it |

**Sequencing:** W1 → W2 (proves the flag-off guarantee on the cheapest surface)
→ W4 → W5 → W3 → W6 → W7. W6 last, deliberately: it is the one that can corrupt
published numbers.

---

## 5. Open questions and risks

1. **Benchmark cohort isolation is the real risk.** Suppression already enforces
   a 5-contributor floor and a 25% dominance cap. If a second vertical's firms
   enter the same cohort pool, every published benchmark silently changes
   meaning — and the suppression rules would not flag it, because the counts
   still pass. This needs an explicit isolation invariant and a contract test
   before any second vertical holds data, not after.
2. **The 100 firm question stems were not audited.** The pillar layer is neutral;
   the stems underneath were held out of this sweep because that wording is
   already frozen pending a founders' voice decision. They need a domain-language
   read before W3 is scoped confidently.
3. **Brand identity is not a lexicon problem.** `.brand-c2-accounting` and
   `accountingLabel` encode "C2 Accounting" as the product's name. Whether a
   second vertical is a rebrand, a sub-brand, or the same brand is a founder
   decision, not an engineering seam.
4. **Stored `verticalId` values are all `"accounting"` today**, by default, on
   rows written before any vertical existed. If a vertical is ever *renamed*,
   those defaults become wrong silently. A pack id should be treated as
   immutable once data references it.
5. **The registry version id encodes no vertical.** `2026-08-product-utility-v3`
   would need to become vertical-qualified, or two verticals cannot both version
   their banks.

---

## 6. What this audit did not do

No code changed. No migration written. No flag added. The framework in §3 is a
proposal, and the estimates in §4 are ranges over work that has not been scoped
line-by-line. `PAT_ENABLE_VERTICAL_PACKS` does not exist in the codebase.
