# Accounting Taxonomy Ingestion Phase 1

## Diagnosis

`Product.category` is not a usable substrate for PAT.

It cannot express:

- hybrid products across multiple categories
- products spanning multiple workflow stages
- vendor-level versus product-level signals
- capability comparisons
- uncertainty in research coverage

The repo also did not contain the referenced vendor/product sheet, so vendor and product research coverage cannot be truthfully seeded yet.

## Phase 1 implemented now

Phase 1 adds a real taxonomy and ingestion substrate:

- `VendorProfile`
- `ResearchSource`
- `TaxonomyBucket`
- `ProductTaxonomyAssignment`
- `TaxonomyBucketCapability`
- `ProductCapabilityMap`
- `VendorSignal`
- `ProductSignal`

`Product` remains in place for compatibility, but it now has:

- optional `vendorId`
- optional `companyId`
- optional `slug`
- explicit deployment model
- taxonomy and capability mapping relations

This means PAT can reason about:

- function overlap
- workflow-stage overlap
- vendor-level signals
- product-level signals
- future displacement and benchmark analysis

without collapsing everything into one free-text category.

## Canonical taxonomy artifact

The repo now includes:

- `data/research/accounting-software-taxonomy-v1.json`

This artifact currently seeds:

- canonical accounting software buckets
- workflow-stage buckets
- compliance and delivery-model buckets
- initial bucket-to-capability mappings with low confidence where capability keys are not yet confirmed

It intentionally does **not** seed vendors or products yet because the grounded source sheet was not present in the workspace.

## Import path

Importer:

- `scripts/import-accounting-taxonomy.ts`

Modes:

- dry run: validates artifact structure and reports unresolved capability/company bindings
- apply: upserts research source, buckets, mappings, vendors, products, and signals

Commands:

- `pnpm seed:accounting-taxonomy:dry-run`
- `pnpm seed:accounting-taxonomy`

Baseline seed:

- `prisma/seed.ts` now imports the taxonomy artifact as part of the default baseline seed.

## Future research ingestion shape

When the vendor/product sheet is available, convert it into the same structured artifact format instead of writing one-off spreadsheet code.

Required ingestion steps:

1. Add or update `vendors[]`.
2. Add `products[]` with:
   - `vendorKey`
   - `taxonomy[]`
   - `capabilities[]`
   - `signals[]`
3. Add `vendorSignals[]` for vendor-level observations.
4. Mark confidence explicitly:
   - `UNKNOWN`
   - `LOW`
   - `MEDIUM`
   - `HIGH`

Unknowns should stay unknown. Do not force mappings just to fill the grid.

## Migration direction

Near term:

- backfill real vendor profiles for `Company.type = VENDOR`
- bind researched products to `vendorId`
- resolve capability keys against actual `CapabilityNode.key` inventory

Later:

- compare products by shared taxonomy buckets and capability coverage
- add fit scoring by firm profile, portal audience, and capability maturity
- attach benchmark logic to bucket and capability overlap instead of free text
