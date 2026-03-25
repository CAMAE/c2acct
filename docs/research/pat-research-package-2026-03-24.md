# PAT Research Package

Date: 2026-03-24

## 1. Executive synthesis

PAT now has the beginnings of a usable substrate, but not a complete institutional research layer.

Grounded repo facts:

- the live assessment runtime is still one narrow module: `firm_alignment_v1`
- current module scope support in schema is `FIRM`, `VENDOR`, `PRODUCT`, `ENTERPRISE`
- the taxonomy substrate exists and is structurally stronger than the old free-text `Product.category`
- the referenced vendor/product breakdown, style guide assets, and platform briefing were **not** present in the workspace at execution time, so this package cannot truthfully claim source-backed vendor-by-vendor coverage

What PAT can already support:

- category and sub-category taxonomy
- product-to-taxonomy many-to-many assignments
- product-to-capability mappings
- vendor-level and product-level signals
- research source tracking with confidence scoring
- subject-aware platform direction for organization and product attachment

What PAT cannot support honestly yet:

- grounded vendor/product seed coverage from the missing uploaded sheet
- benchmark logic beyond company-rooted score tables
- role-specific module rollout for talent, HR, and higher ed without schema extension
- strong capability-to-market comparisons because seeded capability keys are still only partially reconciled

The correct short-term strategy is:

1. stabilize the market taxonomy and ingestion contract
2. map actor needs to observable and non-observable signals
3. seed only what the repo can support without pretending the missing research artifacts exist
4. add role-specific modules in the order the schema and data model can actually carry

## 2. Taxonomy

### 2.1 Canonical market buckets

The current repo already seeds these top-level buckets in [data/research/accounting-software-taxonomy-v1.json](/Users/camerongarrett/work/C2Acct/data/research/accounting-software-taxonomy-v1.json):

| Bucket family | Current seeded buckets | PAT use |
| --- | --- | --- |
| Function | Tax, Audit, Client Management, Practice Management, Workflow, Document Management, Payroll, CAS, ERP / GL, Analytics, Compliance, Billing, Payments, Advisory | core market fit, overlap, displacement, module targeting |
| Workflow stage | Acquire, Onboard, Deliver, Review, File / Close, Bill / Collect, Advise | journey mapping, friction analysis, handoff analysis |
| Compliance domain | Tax Compliance, Payroll Compliance, Audit Compliance | regulated workflow burden, trust/risk framing |
| Delivery model | Cloud Delivery, Hybrid Delivery, Managed Service | implementation friction, operating model fit, vendor comparison |

### 2.2 Recommended sub-buckets

The current taxonomy is directionally right but still too coarse for ingestion-grade market analysis. Recommended sub-buckets:

| Top bucket | Recommended sub-buckets | Confidence |
| --- | --- | --- |
| Tax | compliance prep, entity returns, workflow/orchestration, tax research, tax planning, resolution/notices | medium |
| Audit | audit workflow, workpapers, evidence collection, confirmations, review/signoff, methodology/compliance | medium |
| Client Management | CRM, onboarding/intake, communication hub, client portal, relationship intelligence | medium |
| Practice Management | scheduling, resource planning, WIP, internal ops, profitability, firm governance | medium |
| Workflow | task orchestration, job tracking, due dates, review routing, automation rules | high |
| Document Management | storage, retrieval, request lists, e-signature, version control, retention | high |
| Payroll | payroll processing, payroll tax, employee self-service, benefits adjacencies | medium |
| CAS | close, bookkeeping, controller workflows, AP/AR support, outsourced finance operations | medium |
| ERP / GL | general ledger, close stack, subledgers, consolidations, entity management | medium |
| Analytics | BI/reporting, KPI dashboards, forecasting, scenario analysis, management reporting | medium |
| Compliance | policy control, audit trail, monitoring, approvals, evidence retention | medium |
| Billing | time capture, invoice generation, pricing, collections, realization | high |
| Payments | AP automation, payment execution, cash application, receivables collection | medium |
| Advisory | planning, benchmarking, business insight, recommendation workflow, decision support | low |

### 2.3 Overlap and hybrid handling

PAT should treat overlap as normal, not exceptional.

Rules:

- every product can have multiple taxonomy assignments
- one assignment can be `PRIMARY`
- additional assignments can be `SECONDARY` or `ADJACENT`
- workflow-stage mappings should be independent of function mappings
- delivery model should not be confused with function
- compliance domain should not be treated as a function substitute

Examples of structurally ambiguous cases:

- practice management + workflow hybrids
- CAS + ERP/GL hybrids
- document management + client portal hybrids
- analytics + advisory hybrids
- payroll + HR-service hybrids

PAT implication:

- “What does this product do?” is a product-taxonomy question.
- “What is this vendor strong or weak at?” is a vendor-signal question.
- “What capabilities does this product materially support?” is a capability mapping question.

### 2.4 Vendor-level vs product-level vs capability-level analysis

| Layer | What it answers | Current repo support | Risk if collapsed |
| --- | --- | --- | --- |
| Vendor | market posture, status, breadth, implementation model, ecosystem credibility | `VendorProfile`, `VendorSignal` | weakens product-level truth; large vendors look artificially coherent |
| Product | use case, workflow fit, overlap, category placement, delivery mode | `Product`, `ProductTaxonomyAssignment`, `ProductSignal` | hybrids disappear into vague vendor labels |
| Capability | what operational ability the product supports | `ProductCapabilityMap`, `TaxonomyBucketCapability`, capability graph | PAT cannot reason about adoption friction or alignment logic |

## 3. Cross-actor framework

### 3.1 Actor mapping

| Actor | Primary concern | What PAT can observe now | What PAT cannot observe yet |
| --- | --- | --- | --- |
| Firm leadership | operating alignment, execution consistency, current posture | survey responses, score, integrity, badges, insights | actual stack usage, workflow telemetry, benchmark placement |
| Vendor | implementation fit, workflow support, capability claims, market overlap | taxonomy assignments and vendor/product signals once seeded | customer-level adoption quality, displacement risk evidence |
| User / employee | friction, clarity, handoff burden, usability, confidence | only self-reported signals if new modules are added | behavior analytics, task telemetry, satisfaction history |
| HR / talent | skill readiness, role fit, onboarding friction, formation pathway | almost none on current schema | role-path data, competency evidence, training completion |
| Higher ed / associations | program-to-practice alignment, curriculum relevance, capability gaps | almost none on current schema | program outcomes, employer adoption linkage, cohort data |

### 3.2 Where PAT signals are meaningful

Strong now:

- self-reported organizational alignment posture
- response quality and integrity
- current unlock state from explicit score/badge logic
- category-level market structure

Weak or noisy now:

- vendor efficacy claims without source-backed product data
- user experience quality without employee-side modules
- benchmark conclusions without robust cohort math
- capability maturity inference without subject-native capability writes

### 3.3 Alignment signal ladder

| Signal type | Reliability now | Why |
| --- | --- | --- |
| structured survey response | medium | real input, but narrow module set and self-report bias |
| signal integrity score | medium | useful calibration, not a truth detector |
| explicit badge/unlock result | high | deterministic and code-traceable |
| product taxonomy assignment | medium | structurally supported, but unseeded for real vendors today |
| product capability map | low to medium | needs capability-key reconciliation and real product data |
| benchmark percentile | low | table exists, but not yet backed by robust cohorts |
| cross-actor alignment inference | low | requires data collection beyond current beta |

## 4. PAT data-model implications

### 4.1 What the current schema can already support

Already usable:

- `VendorProfile`
- `Product`
- `TaxonomyBucket`
- `ProductTaxonomyAssignment`
- `TaxonomyBucketCapability`
- `ProductCapabilityMap`
- `VendorSignal`
- `ProductSignal`
- `ResearchSource`
- `SurveyModule`
- `SurveyQuestion`
- `SurveyQuestionCapability`
- `Subject(kind=ORGANIZATION|PRODUCT|PERSON|PORTAL)`

### 4.2 What remains strategically missing

Needed for future institutional work:

| Need | Why | Status |
| --- | --- | --- |
| subject-native capability score table | compare organizations, products, and later people on one identity model | missing |
| module scope support for `PERSON`, `HIGHER_ED`, `ASSOCIATION`, `HR` or equivalent | current `ModuleScope` enum cannot express later actor classes directly | missing |
| benchmark attachment beyond `CompanyType` | current cohorts assume company-rooted worldview | missing |
| product-to-workflow friction or implementation burden signals | needed for fit and adoption analysis | missing |
| actor-type-specific module targeting metadata | needed to avoid route-level branching hacks | missing |

### 4.3 Recommended structural additions later

Not to implement blindly now, but to stage next:

- `SubjectCapabilityScore(subjectId, nodeId, scoreVersion, score, computedAt)`
- `ModuleAudience` or expanded `ModuleScope` values for people/institutions beyond firm/vendor/product
- `ProductWorkflowSignal` only if product-level workflow evidence actually arrives
- benchmark cohorts that can attach to `subjectKind`, portal audience, or maturity archetype rather than only `CompanyType`

## 5. Recommended modules/assessments

### 5.1 Sequence

Recommended build order:

1. firm operating alignment v2
2. vendor delivery and fit profile
3. product implementation-fit profile
4. talent readiness baseline
5. higher-ed practice alignment baseline

### 5.2 Module matrix

| Module | Primary audience | Current schema fit | Start now? | Why |
| --- | --- | --- | --- | --- |
| Firm operating alignment | firms | high | yes | current module path already exists |
| Vendor delivery alignment | vendors | medium to high | yes | `ModuleScope.VENDOR` already exists |
| Product implementation fit | products / vendor operators | medium | later phase 1 | needs better product seed coverage first |
| Talent readiness | talent / HR | low | no | missing scope model and person-side identity rules |
| HR workforce alignment | HR | low | no | same issue; would become fake abstraction now |
| Higher-ed program-to-practice alignment | higher ed | low | no | missing scope, cohort, and institution-side data model |
| Association member capability pulse | associations | low | no | requires membership and cohort semantics first |

### 5.3 First question themes

Firm:

- operating model clarity
- execution consistency
- workflow handoff quality
- review discipline
- visibility into delivery risk

Vendor:

- implementation model clarity
- customer onboarding discipline
- workflow coverage honesty
- integration burden
- proof of outcome vs sales narrative

Talent:

- role clarity
- workflow confidence
- tool fluency
- escalation readiness
- learning path visibility

Higher ed:

- curriculum-to-practice alignment
- workflow realism
- tool exposure relevance
- employer-signal alignment
- placement readiness confidence

### 5.4 What should remain staged off

- talent and higher-ed modules should not be shoved into current `FIRM` or `VENDOR` scope values
- member briefings should not go live until person-side modules exist
- product modules should not use fake vendor/product data

## 6. Seed/import recommendations

### 6.1 What should be hand-curated

Hand-curate:

- taxonomy bucket hierarchy
- capability-to-bucket mappings
- initial module definitions
- question-to-capability mappings
- unlock-rule semantics

Reason:

- these define PAT’s worldview and should not be delegated to weak source material or noisy imports

### 6.2 What should be machine-ingested

Machine-ingest once source materials are actually available:

- vendor rows
- product rows
- product-to-bucket assignments
- product-level and vendor-level research signals
- source metadata

Use:

- `ResearchSource`
- `VendorProfile`
- `Product`
- `ProductTaxonomyAssignment`
- `ProductCapabilityMap`
- `VendorSignal`
- `ProductSignal`

### 6.3 What should be user-provided

User-provided through platform workflows:

- assessment answers
- role/context declarations
- stack composition and current-tool selections
- implementation friction ratings
- perceived workflow handoff quality

### 6.4 Seed file suggestions

Recommended artifacts:

| Artifact | Purpose | Suggested path |
| --- | --- | --- |
| canonical taxonomy | current bucket hierarchy and seeded capability mappings | existing `data/research/accounting-software-taxonomy-v1.json` |
| vendor-product research import | grounded vendor/product sheet converted into repo-native JSON | `data/research/accounting-vendor-product-research-v1.json` |
| firm module seed | curated firm question bank and metadata | `data/modules/firm-operating-alignment-v2.json` |
| vendor module seed | curated vendor delivery/fit question bank | `data/modules/vendor-delivery-alignment-v1.json` |
| future module registry | index of module keys, audience, source status | `data/modules/module-registry-v1.json` |

### 6.5 Suggested import structure for missing vendor/product research

The repo already supports the right ingestion pattern. The missing artifact should look like:

- `source`
- `taxonomyBuckets`
- `bucketCapabilityMappings`
- `vendors`
- `products`
- `vendorSignals`

`products[]` should include:

- `vendorKey`
- `name`
- `slug`
- `deploymentModel`
- `taxonomy[]`
- `capabilities[]`
- `signals[]`

### 6.6 Ingestion backlog

| Backlog item | Why it matters | Confidence |
| --- | --- | --- |
| reconcile seeded `capabilityKey` strings with real `CapabilityNode.key` values | current taxonomy mappings are still unresolved | high |
| convert vendor/product breakdown into repo-native JSON | blocks grounded market seeding | high |
| define vendor signal keys | needed for comparable vendor-level analysis | medium |
| define product signal keys | needed for overlap, fit, and displacement analysis | medium |
| add module registry artifact | prevents bespoke module seeding | medium |
| add module scope expansion plan | required before talent/higher-ed work becomes real | high |

## 7. Confidence gaps and what to research next

### 7.1 Confidence gaps

Known missing source material at execution time:

- uploaded vendor/product breakdown
- uploaded C2 style guide assets
- uploaded PAT/C2Acct platform briefing

Repo-level uncertainty:

- seeded capability mappings use placeholder capability keys with low confidence
- no real vendor/product rows are currently seeded
- no evidence-backed benchmark cohorts exist yet
- no current module inventory exists beyond the firm alignment path

### 7.2 What to research next

Highest priority:

1. obtain the vendor/product breakdown and convert it into the import artifact
2. inventory real `CapabilityNode.key` values and reconcile taxonomy mappings
3. define a controlled signal-key dictionary for:
   - vendor breadth
   - implementation model
   - integration posture
   - buyer fit
   - workflow-stage coverage
4. define the next two modules:
   - vendor delivery alignment
   - firm operating alignment v2

Next after that:

1. decide whether `ModuleScope` should be expanded or replaced for person/institution classes
2. define what higher-ed and talent data PAT can ethically and structurally collect
3. design subject-native benchmark and capability write bridges
