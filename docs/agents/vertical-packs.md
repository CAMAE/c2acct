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
`BadgeRule`, `TaxonomyBucket` (migration `add_vertical_id_layer`). Derived tables
(scores, submissions) inherit the vertical from their parent Company/Product, so
they are not duplicated with a column.

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
5. No runtime/schema change: the structural entities and scoring math are shared;
   `loadVerticalPack("manufacturing")` and `getTaxonomyForVertical("manufacturing")`
   work immediately.

Still framework-side, not yet built (PF-2 and later): module-content keying,
benchmark cohort isolation, the pack-declared product-utility registry, and a
per-vertical demo cohort. Scoring, bands and suppression stay cross-vertical
identical by design — see the audit's class (c).

The agent runtime stays untouched — agents resolve their pack from their config's
`vertical_id` (see `scripts/agents/qa-smoke.ts` for the reference integration).
