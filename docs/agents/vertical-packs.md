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

## Pack format

A pack lives at `verticals/<id>/pack.yaml` (block-style YAML — parsed by the
in-repo loader, no flow maps):

```yaml
id: accounting
name: Accounting
version: 1
description: Accounting firm + vendor alignment pack
taxonomy:
  source: db                 # taxonomy lives in TaxonomyBucket
  filter:
    verticalId: accounting
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

## lib/verticals API

- `loadVerticalPack(id)` — load + zod-validate `verticals/<id>/pack.yaml`; throws
  a clean error if missing/invalid.
- `getTaxonomyForVertical(id)` — `TaxonomyBucket[]` filtered by the pack's vertical.
- `getPromptForVertical(id, key)` — markdown for an `agent_prompts` key.
- `listVerticalPacks()` / `listVerticalIds()` — every installed pack.
- `resolveCurrentVertical()` (`context.ts`) — the current vertical for a request;
  V1 returns `"accounting"` (future: from session/org).

## Adding a new Vertical Pack (e.g. manufacturing v1)

1. `verticals/manufacturing/pack.yaml` with `id: manufacturing` + its files
   (templates, prompts, signals, evals).
2. Seed `TaxonomyBucket` rows with `verticalId = "manufacturing"` (manufacturing
   categories — ERP, MES, quality, …).
3. Create the descriptive rows (Insights, SurveyModules, Badges) with
   `verticalId = "manufacturing"`.
4. No runtime/schema change: the structural entities and scoring math are shared;
   `loadVerticalPack("manufacturing")` and `getTaxonomyForVertical("manufacturing")`
   work immediately.

The agent runtime stays untouched — agents resolve their pack from their config's
`vertical_id` (see `scripts/agents/qa-smoke.ts` for the reference integration).
