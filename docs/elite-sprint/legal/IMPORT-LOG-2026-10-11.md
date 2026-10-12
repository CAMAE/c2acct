# Legal bank import log (legal-load, R64) · 2026-10-11

Import shell: PAT_ENABLE_VERTICAL_PACKS=1 PAT_DEFAULT_VERTICAL=legal; target: the preview database (host printed by the script; no env value appears below). Dry run, then --apply. Scripts: scripts/modules/import-legal-banks.sh, scripts/modules/import-qbank.ts, scripts/import-accounting-taxonomy.ts, scripts/modules/seed-legal-unlock-rules.ts.

```
================ LEGAL BANKS — DRY RUN ================
vertical: legal (PAT_ENABLE_VERTICAL_PACKS=1) · db host: ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech

---- bank operating-model ----

================ IMPORT QBANK v1 — DRY RUN ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-OPERATING-MODEL-V1-2026-09-29-IMPORT.md
Template: qbank-legal-operating-model-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "Matter Intake, Engagement, Conflicts and Scope": 25
  Category "Calendaring, Docketing, Deadlines and Work Assignment": 22
  Category "Time Capture, Billing, Collections and the Trust-Account Interface": 23
  Category "Work Product, Document Handling, Records and Matter Closing": 20
  Anchor items: 6 (A2, A3, A16, A25, B19, C16)
  Source rows: 95 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

DRY RUN — no changes written. Re-run with --apply to seed (as DRAFT).
Rollback (after --apply): delete ModuleTemplate key='qbank-legal-operating-model-v1' (cascades items + sources).

---- bank automation-ai ----

================ IMPORT QBANK v1 — DRY RUN ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-AUTOMATION-AI-V1-2026-09-29-IMPORT.md
Template: qbank-legal-automation-ai-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "Technology Competence and the Duty Framework for Tools": 22
  Category "Generative AI Use, Disclosure, Verification and Billing": 26
  Category "Automation in Discovery, Document Review and Drafting": 22
  Category "Readiness, Data Prerequisites, Guardrails and Rollout": 20
  Anchor items: 6 (A2, B3, B20, D8, D11, D17)
  Source rows: 91 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

DRY RUN — no changes written. Re-run with --apply to seed (as DRAFT).
Rollback (after --apply): delete ModuleTemplate key='qbank-legal-automation-ai-v1' (cascades items + sources).

---- bank data-flow ----

================ IMPORT QBANK v1 — DRY RUN ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-DATA-FLOW-V1-2026-09-29-IMPORT.md
Template: qbank-legal-data-flow-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "System Inventory, Matter-Centric Data Architecture & Integration Design": 24
  Category "Data Quality, Reliability & Reporting": 20
  Category "Data in Motion and at Rest, Records & Evidence Integrity": 26
  Category "Change, Interoperability, Vendor Data Exchange & Portability": 20
  Anchor items: 6 (A1, A23, A24, B6, B11, B14)
  Source rows: 100 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

DRY RUN — no changes written. Re-run with --apply to seed (as DRAFT).
Rollback (after --apply): delete ModuleTemplate key='qbank-legal-data-flow-v1' (cascades items + sources).

---- bank governance ----

================ IMPORT QBANK v1 — DRY RUN ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-GOVERNANCE-V1-2026-09-29-IMPORT.md
Template: qbank-legal-governance-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "Firm Governance, Supervision & Control Environment": 22
  Category "Trust Accounting & Safekeeping Property": 26
  Category "Confidentiality, Security Controls, Incident Response & Breach Duties": 24
  Category "Vendor Risk, Cloud, Outsourcing & Business Continuity": 18
  Anchor items: 6 (A2, A9, A11, A12, B8, C18)
  Source rows: 101 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

DRY RUN — no changes written. Re-run with --apply to seed (as DRAFT).
Rollback (after --apply): delete ModuleTemplate key='qbank-legal-governance-v1' (cascades items + sources).

---- bank strategy ----

================ IMPORT QBANK v1 — DRY RUN ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-STRATEGY-V1-2026-09-29-IMPORT.md
Template: qbank-legal-strategy-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "Objectives, Risk Assessment & Strategic Planning": 22
  Category "Market, Client & Pricing Alignment": 24
  Category "Structure, Ownership & Regulatory Change": 20
  Category "Change Readiness, Adoption & Measurement": 24
  Anchor items: 6 (A1, A14, A15, A19, D13, D16)
  Source rows: 103 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

DRY RUN — no changes written. Re-run with --apply to seed (as DRAFT).
Rollback (after --apply): delete ModuleTemplate key='qbank-legal-strategy-v1' (cascades items + sources).

---- taxonomy legal ----
Accounting taxonomy dry run {
  sourceKey: 'legal-software-taxonomy-v1',
  verticalId: 'legal',
  taxonomyBuckets: 40,
  bucketCapabilityMappings: 24,
  vendors: 0,
  products: 0,
  vendorSignals: 0,
  unresolvedCapabilityKeys: [
    'practice_matter_management',
    'time_billing',
    'trust_accounting',
    'payments',
    'intake_crm',
    'client_portal',
    'document_management',
    'document_automation',
    'knowledge_management',
    'contract_lifecycle',
    'legal_research',
    'legal_analytics',
    'generative_ai',
    'ediscovery',
    'litigation_support',
    'legal_hold',
    'efiling_docketing',
    'calendaring_deadlines',
    'conflicts',
    'records_governance',
    'legal_project_management',
    'esignature',
    'integration_platform',
    'identity_security'
  ],
  unresolvedCompanies: [],
  mode: 'dry-run'
}
{
  "sourceKey": "legal-software-taxonomy-v1",
  "verticalId": "legal",
  "taxonomyBuckets": 40,
  "bucketCapabilityMappings": 24,
  "vendors": 0,
  "products": 0,
  "vendorSignals": 0,
  "unresolvedCapabilityKeys": [
    "practice_matter_management",
    "time_billing",
    "trust_accounting",
    "payments",
    "intake_crm",
    "client_portal",
    "document_management",
    "document_automation",
    "knowledge_management",
    "contract_lifecycle",
    "legal_research",
    "legal_analytics",
    "generative_ai",
    "ediscovery",
    "litigation_support",
    "legal_hold",
    "efiling_docketing",
    "calendaring_deadlines",
    "conflicts",
    "records_governance",
    "legal_project_management",
    "esignature",
    "integration_platform",
    "identity_security"
  ],
  "unresolvedCompanies": [],
  "mode": "dry-run"
}

---- unlock rules legal ----

================ LEGAL UNLOCK RULES — DRY RUN ================
  qbank-legal-operating-model-v1: operations:early, operations:developing, operations:building, operations:established, operations:leading
  qbank-legal-automation-ai-v1: automation:early, automation:developing, automation:building, automation:established, automation:leading
  qbank-legal-data-flow-v1: integration:early, integration:developing, integration:building, integration:established, integration:leading
  qbank-legal-governance-v1: governance:early, governance:developing, governance:building, governance:established, governance:leading
  qbank-legal-strategy-v1: strategy:early, strategy:developing, strategy:building, strategy:established, strategy:leading
  5 templates × 5 bands = 25 rules, quarterOffset 0, vertical legal
ABORT: templates not imported yet: qbank-legal-operating-model-v1, qbank-legal-automation-ai-v1, qbank-legal-data-flow-v1, qbank-legal-governance-v1, qbank-legal-strategy-v1
---- dry run exit: 1 ----
================ LEGAL BANKS — --apply ================
vertical: legal (PAT_ENABLE_VERTICAL_PACKS=1) · db host: ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech

---- bank operating-model ----

================ IMPORT QBANK v1 — APPLY ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-OPERATING-MODEL-V1-2026-09-29-IMPORT.md
Template: qbank-legal-operating-model-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "Matter Intake, Engagement, Conflicts and Scope": 25
  Category "Calendaring, Docketing, Deadlines and Work Assignment": 22
  Category "Time Capture, Billing, Collections and the Trust-Account Interface": 23
  Category "Work Product, Document Handling, Records and Matter Closing": 20
  Anchor items: 6 (A2, A3, A16, A25, B19, C16)
  Source rows: 95 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

APPLYING…

Import complete: template + 90 items + 95 source rows (all DRAFT).
Nothing serves until the approve line flips reviewStatus to APPROVED (scripts/modules/approve-qbank.ts).

---- bank automation-ai ----

================ IMPORT QBANK v1 — APPLY ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-AUTOMATION-AI-V1-2026-09-29-IMPORT.md
Template: qbank-legal-automation-ai-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "Technology Competence and the Duty Framework for Tools": 22
  Category "Generative AI Use, Disclosure, Verification and Billing": 26
  Category "Automation in Discovery, Document Review and Drafting": 22
  Category "Readiness, Data Prerequisites, Guardrails and Rollout": 20
  Anchor items: 6 (A2, B3, B20, D8, D11, D17)
  Source rows: 91 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

APPLYING…

Import complete: template + 90 items + 91 source rows (all DRAFT).
Nothing serves until the approve line flips reviewStatus to APPROVED (scripts/modules/approve-qbank.ts).

---- bank data-flow ----

================ IMPORT QBANK v1 — APPLY ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-DATA-FLOW-V1-2026-09-29-IMPORT.md
Template: qbank-legal-data-flow-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "System Inventory, Matter-Centric Data Architecture & Integration Design": 24
  Category "Data Quality, Reliability & Reporting": 20
  Category "Data in Motion and at Rest, Records & Evidence Integrity": 26
  Category "Change, Interoperability, Vendor Data Exchange & Portability": 20
  Anchor items: 6 (A1, A23, A24, B6, B11, B14)
  Source rows: 100 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

APPLYING…

Import complete: template + 90 items + 100 source rows (all DRAFT).
Nothing serves until the approve line flips reviewStatus to APPROVED (scripts/modules/approve-qbank.ts).

---- bank governance ----

================ IMPORT QBANK v1 — APPLY ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-GOVERNANCE-V1-2026-09-29-IMPORT.md
Template: qbank-legal-governance-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "Firm Governance, Supervision & Control Environment": 22
  Category "Trust Accounting & Safekeeping Property": 26
  Category "Confidentiality, Security Controls, Incident Response & Breach Duties": 24
  Category "Vendor Risk, Cloud, Outsourcing & Business Continuity": 18
  Anchor items: 6 (A2, A9, A11, A12, B8, C18)
  Source rows: 101 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

APPLYING…

Import complete: template + 90 items + 101 source rows (all DRAFT).
Nothing serves until the approve line flips reviewStatus to APPROVED (scripts/modules/approve-qbank.ts).

---- bank strategy ----

================ IMPORT QBANK v1 — APPLY ================
Source: docs/elite-sprint/legal/PATALIGN-QBANK-LEGAL-STRATEGY-V1-2026-09-29-IMPORT.md
Template: qbank-legal-strategy-v1 (reviewStatus DRAFT — nothing serves until approved) · vertical legal (stamped)

Items parsed: 90
  Difficulty: E 27 / M 45 / H 18
  Category "Objectives, Risk Assessment & Strategic Planning": 22
  Category "Market, Client & Pricing Alignment": 24
  Category "Structure, Ownership & Regulatory Change": 20
  Category "Change Readiness, Adoption & Measurement": 24
  Anchor items: 6 (A1, A14, A15, A19, D13, D16)
  Source rows: 103 (every item >= 1)

Validation OK: 90 items, mix 27/45/18, all sourced.

APPLYING…

Import complete: template + 90 items + 103 source rows (all DRAFT).
Nothing serves until the approve line flips reviewStatus to APPROVED (scripts/modules/approve-qbank.ts).

---- taxonomy legal ----
Accounting taxonomy import complete {
  sourceKey: 'legal-software-taxonomy-v1',
  verticalId: 'legal',
  taxonomyBuckets: 40,
  bucketCapabilityMappings: 24,
  vendors: 0,
  products: 0,
  vendorSignals: 0,
  unresolvedCapabilityKeys: [
    'practice_matter_management',
    'time_billing',
    'trust_accounting',
    'payments',
    'intake_crm',
    'client_portal',
    'document_management',
    'document_automation',
    'knowledge_management',
    'contract_lifecycle',
    'legal_research',
    'legal_analytics',
    'generative_ai',
    'ediscovery',
    'litigation_support',
    'legal_hold',
    'efiling_docketing',
    'calendaring_deadlines',
    'conflicts',
    'records_governance',
    'legal_project_management',
    'esignature',
    'integration_platform',
    'identity_security'
  ],
  unresolvedCompanies: [],
  mode: 'apply'
}
{
  "sourceKey": "legal-software-taxonomy-v1",
  "verticalId": "legal",
  "taxonomyBuckets": 40,
  "bucketCapabilityMappings": 24,
  "vendors": 0,
  "products": 0,
  "vendorSignals": 0,
  "unresolvedCapabilityKeys": [
    "practice_matter_management",
    "time_billing",
    "trust_accounting",
    "payments",
    "intake_crm",
    "client_portal",
    "document_management",
    "document_automation",
    "knowledge_management",
    "contract_lifecycle",
    "legal_research",
    "legal_analytics",
    "generative_ai",
    "ediscovery",
    "litigation_support",
    "legal_hold",
    "efiling_docketing",
    "calendaring_deadlines",
    "conflicts",
    "records_governance",
    "legal_project_management",
    "esignature",
    "integration_platform",
    "identity_security"
  ],
  "unresolvedCompanies": [],
  "mode": "apply"
}

---- unlock rules legal ----

================ LEGAL UNLOCK RULES — APPLY ================
  qbank-legal-operating-model-v1: operations:early, operations:developing, operations:building, operations:established, operations:leading
  qbank-legal-automation-ai-v1: automation:early, automation:developing, automation:building, automation:established, automation:leading
  qbank-legal-data-flow-v1: integration:early, integration:developing, integration:building, integration:established, integration:leading
  qbank-legal-governance-v1: governance:early, governance:developing, governance:building, governance:established, governance:leading
  qbank-legal-strategy-v1: strategy:early, strategy:developing, strategy:building, strategy:established, strategy:leading
  5 templates × 5 bands = 25 rules, quarterOffset 0, vertical legal
  found qbank-legal-operating-model-v1 · DRAFT · vertical legal
  found qbank-legal-automation-ai-v1 · DRAFT · vertical legal
  found qbank-legal-data-flow-v1 · DRAFT · vertical legal
  found qbank-legal-governance-v1 · DRAFT · vertical legal
  found qbank-legal-strategy-v1 · DRAFT · vertical legal

Unlock rules upserted: 25; rules on the five legal templates now: 25.

Import shell complete (--apply). Templates stay DRAFT until the approve line runs.
---- apply exit: 0 ----
```
