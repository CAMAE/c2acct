export const PRODUCT_UTILITY_REGISTRY_VERSION = "2026-03-product-utility-v2";
export const PRODUCT_UTILITY_SUBCATEGORY_COUNT = 4;
export const PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY = 5;
export const PRODUCT_UTILITY_SCORED_QUESTION_COUNT =
  PRODUCT_UTILITY_SUBCATEGORY_COUNT * PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY;
export const PRODUCT_GENERAL_QUESTION_COUNT = 10;
export const PRODUCT_OPEN_ENDED_QUESTION_COUNT = 10;
export const PRODUCT_SCORE_GUIDE = [
  "0 = no usable support or no credible evidence in this area",
  "1 = weak or mostly manual support",
  "2 = limited and uneven support",
  "3 = workable support with visible gaps",
  "4 = strong practical support",
  "5 = strong practical support with clear current-state evidence",
] as const;

export type ProductQuestionBasisKey =
  | "workflow-fit"
  | "integration-readiness"
  | "implementation-friction"
  | "configuration-depth"
  | "training-onboarding"
  | "support-trust"
  | "reporting-visibility"
  | "operational-dependence"
  | "adoption-ease"
  | "value-clarity";

export type ProductProfileFieldKey =
  | "productName"
  | "productDescription"
  | "logoReference"
  | "positioning"
  | "targetCustomer"
  | "targetUseContext"
  | "implementationStyle"
  | "operatingModelFit"
  | "primaryBuyer"
  | "integrationPosture";

export type ProductScoredQuestionDefinition = {
  key: string;
  basisKey: ProductQuestionBasisKey;
  prompt: string;
};

export type ProductTextQuestionDefinition = {
  key: string;
  prompt: string;
  fieldKey?: ProductProfileFieldKey;
};

export type ProductUtilitySubcategoryDefinition = {
  key: string;
  label: string;
  description: string;
  questions: ProductScoredQuestionDefinition[];
};

export type ProductUtilityDefinition = {
  key: string;
  label: string;
  description: string;
  taxonomyBucketKeys: string[];
  sourceNotes: string[];
  subcategories: ProductUtilitySubcategoryDefinition[];
};

export type ProductQuestionModuleDefinition = {
  key: string;
  title: string;
  description: string;
  questions: ProductTextQuestionDefinition[] | ProductScoredQuestionDefinition[];
};

function makeExecutionSubcategory(input: {
  key: string;
  label: string;
  description: string;
  focus: string;
}) {
  return {
    key: input.key,
    label: input.label,
    description: input.description,
    questions: [
      {
        key: "day_to_day_fit",
        basisKey: "workflow-fit" as const,
        prompt: `How well does this product support ${input.focus} in day-to-day use?`,
      },
      {
        key: "exception_handling",
        basisKey: "operational-dependence" as const,
        prompt: `How dependable does this product feel when ${input.focus} gets messy, urgent, or exception-heavy?`,
      },
      {
        key: "status_visibility",
        basisKey: "reporting-visibility" as const,
        prompt: `How clearly does this product show status, ownership, and next actions for ${input.focus}?`,
      },
      {
        key: "frontline_adoption",
        basisKey: "adoption-ease" as const,
        prompt: `How easy is it for real users to adopt ${input.focus} in this product without extra handholding?`,
      },
      {
        key: "practical_outcome",
        basisKey: "value-clarity" as const,
        prompt: `How clearly could this product improve speed, accuracy, or consistency in ${input.focus}?`,
      },
    ],
  } satisfies ProductUtilitySubcategoryDefinition;
}

function makeIntegrationSubcategory(input: {
  key: string;
  label: string;
  description: string;
  focus: string;
}) {
  return {
    key: input.key,
    label: input.label,
    description: input.description,
    questions: [
      {
        key: "stack_fit",
        basisKey: "integration-readiness" as const,
        prompt: `How well does this product connect ${input.focus} to the surrounding systems and data it depends on?`,
      },
      {
        key: "admin_control",
        basisKey: "configuration-depth" as const,
        prompt: `How manageable is the configuration and admin setup required to keep ${input.focus} aligned?`,
      },
      {
        key: "implementation_burden",
        basisKey: "implementation-friction" as const,
        prompt: `How manageable is the implementation or migration burden for ${input.focus}?`,
      },
      {
        key: "data_visibility",
        basisKey: "reporting-visibility" as const,
        prompt: `How clearly can teams see sync status, exceptions, and downstream impact around ${input.focus}?`,
      },
      {
        key: "runtime_reliability",
        basisKey: "support-trust" as const,
        prompt: `How trustworthy does this product feel when ${input.focus} depends on integrations, mappings, or data movement?`,
      },
    ],
  } satisfies ProductUtilitySubcategoryDefinition;
}

function makeControlSubcategory(input: {
  key: string;
  label: string;
  description: string;
  focus: string;
}) {
  return {
    key: input.key,
    label: input.label,
    description: input.description,
    questions: [
      {
        key: "control_confidence",
        basisKey: "support-trust" as const,
        prompt: `How much confidence does this product create around control, traceability, and reliability for ${input.focus}?`,
      },
      {
        key: "policy_flexibility",
        basisKey: "configuration-depth" as const,
        prompt: `How well can this product adapt rules, approvals, or policy settings for ${input.focus} without becoming fragile?`,
      },
      {
        key: "evidence_visibility",
        basisKey: "reporting-visibility" as const,
        prompt: `How clearly does this product surface evidence, exceptions, and review history for ${input.focus}?`,
      },
      {
        key: "criticality_pressure",
        basisKey: "operational-dependence" as const,
        prompt: `How ready does this product feel for the real-world pressure that comes with ${input.focus}?`,
      },
      {
        key: "assurance_value",
        basisKey: "value-clarity" as const,
        prompt: `How clearly could this product reduce risk or raise operating assurance in ${input.focus}?`,
      },
    ],
  } satisfies ProductUtilitySubcategoryDefinition;
}

function makeEnablementSubcategory(input: {
  key: string;
  label: string;
  description: string;
  focus: string;
}) {
  return {
    key: input.key,
    label: input.label,
    description: input.description,
    questions: [
      {
        key: "onboarding_speed",
        basisKey: "training-onboarding" as const,
        prompt: `How quickly could new teams become productive in ${input.focus} with this product?`,
      },
      {
        key: "change_load",
        basisKey: "adoption-ease" as const,
        prompt: `How manageable is the change burden required to make ${input.focus} stick in practice?`,
      },
      {
        key: "rollout_effort",
        basisKey: "implementation-friction" as const,
        prompt: `How manageable is rollout, process redesign, or enablement effort for ${input.focus}?`,
      },
      {
        key: "near_term_payoff",
        basisKey: "value-clarity" as const,
        prompt: `How likely is this product to produce practical near-term gains in ${input.focus}?`,
      },
      {
        key: "workflow_alignment",
        basisKey: "workflow-fit" as const,
        prompt: `How well does ${input.focus} align to the way real teams already work, review, and hand off work?`,
      },
    ],
  } satisfies ProductUtilitySubcategoryDefinition;
}

function defineUtility(input: ProductUtilityDefinition) {
  return input;
}

export const PRODUCT_UTILITY_REGISTRY: ProductUtilityDefinition[] = [
  defineUtility({
    key: "erp_gl_core_ledger",
    label: "ERP / GL / core ledger",
    description: "Core accounting system coverage for ledger, entities, journals, period management, and downstream financial foundation.",
    taxonomyBucketKeys: ["function-erp-gl", "function-cas", "workflow-deliver", "workflow-review", "workflow-file"],
    sourceNotes: ["Core finance system family grounded in the repo taxonomy's ERP / GL and CAS buckets."],
    subcategories: [
      makeExecutionSubcategory({
        key: "journal_processing",
        label: "Journal processing and ledger activity",
        description: "Daily journal entry, posting, and subledger-to-ledger flow.",
        focus: "journal processing and ledger activity",
      }),
      makeIntegrationSubcategory({
        key: "entity_and_dimension_alignment",
        label: "Entity and dimension alignment",
        description: "Entity structure, dimensions, mappings, and downstream ledger alignment.",
        focus: "entity, dimension, and ledger alignment",
      }),
      makeControlSubcategory({
        key: "period_controls_and_auditability",
        label: "Period controls and auditability",
        description: "Period open-close control, approvals, and traceability.",
        focus: "period controls and ledger auditability",
      }),
      makeEnablementSubcategory({
        key: "close_foundation_and_handoffs",
        label: "Close foundation and handoffs",
        description: "How the core ledger supports close readiness and downstream financial workflows.",
        focus: "close foundation and downstream handoffs",
      }),
    ],
  }),
  defineUtility({
    key: "ap_payables_spend",
    label: "AP / payables / spend",
    description: "Supplier invoice intake, coding, approvals, payment workflow, and spend control.",
    taxonomyBucketKeys: ["function-payments", "function-workflow", "workflow-deliver", "workflow-review", "workflow-bill-collect"],
    sourceNotes: ["Expands the legacy AP automation bucket into payables, spend, and supplier control coverage."],
    subcategories: [
      makeExecutionSubcategory({
        key: "invoice_capture_and_coding",
        label: "Invoice capture and coding",
        description: "Capture, classify, and code supplier invoices.",
        focus: "invoice capture and coding",
      }),
      makeIntegrationSubcategory({
        key: "supplier_and_payment_data_alignment",
        label: "Supplier and payment data alignment",
        description: "Supplier master data, payment rails, and ERP alignment.",
        focus: "supplier, payment, and ERP data alignment",
      }),
      makeControlSubcategory({
        key: "approval_and_spend_controls",
        label: "Approval and spend controls",
        description: "Policy enforcement, approval routing, and spend governance.",
        focus: "approval policy and spend controls",
      }),
      makeEnablementSubcategory({
        key: "payment_execution_and_exception_resolution",
        label: "Payment execution and exception resolution",
        description: "Operational readiness for payment runs, exceptions, and user adoption.",
        focus: "payment execution and payables exception resolution",
      }),
    ],
  }),
  defineUtility({
    key: "ar_billing_collections",
    label: "AR / billing / collections",
    description: "Customer billing, receivables tracking, collections operations, and cash application support.",
    taxonomyBucketKeys: ["function-billing", "function-payments", "workflow-bill-collect", "workflow-review"],
    sourceNotes: ["Combines billing and payment-taxonomy coverage into a receivables and collections family."],
    subcategories: [
      makeExecutionSubcategory({
        key: "billing_and_invoice_operations",
        label: "Billing and invoice operations",
        description: "Invoice creation, billing cadence, and receivable setup.",
        focus: "billing and invoice operations",
      }),
      makeIntegrationSubcategory({
        key: "receivable_and_cash_alignment",
        label: "Receivable and cash alignment",
        description: "Receivable status, payment matching, and ledger alignment.",
        focus: "receivable, payment, and cash alignment",
      }),
      makeControlSubcategory({
        key: "collections_and_dispute_controls",
        label: "Collections and dispute controls",
        description: "Collections workflow, dispute handling, and controls.",
        focus: "collections, disputes, and receivable controls",
      }),
      makeEnablementSubcategory({
        key: "customer_follow_up_and_visibility",
        label: "Customer follow-up and visibility",
        description: "Operational ease for customer follow-up, status visibility, and value realization.",
        focus: "customer follow-up and receivable visibility",
      }),
    ],
  }),
  defineUtility({
    key: "expense_management",
    label: "Expense management",
    description: "Employee spend capture, card and receipt workflows, reimbursements, and policy control.",
    taxonomyBucketKeys: ["function-payments", "function-workflow", "workflow-deliver", "workflow-review"],
    sourceNotes: ["Preserves expense management as a distinct operating family separate from AP."],
    subcategories: [
      makeExecutionSubcategory({
        key: "spend_capture_and_submission",
        label: "Spend capture and submission",
        description: "Receipt, card, and employee spend capture.",
        focus: "employee spend capture and submission",
      }),
      makeIntegrationSubcategory({
        key: "card_and_ledger_alignment",
        label: "Card and ledger alignment",
        description: "Card feeds, coding, and reimbursement alignment to finance systems.",
        focus: "card, reimbursement, and ledger alignment",
      }),
      makeControlSubcategory({
        key: "policy_review_and_auditability",
        label: "Policy review and auditability",
        description: "Policy checks, approvals, and evidence trail.",
        focus: "expense policy review and auditability",
      }),
      makeEnablementSubcategory({
        key: "reimbursement_and_user_adoption",
        label: "Reimbursement and user adoption",
        description: "Ease of reimbursement flow and user adoption.",
        focus: "reimbursement workflow and user adoption",
      }),
    ],
  }),
  defineUtility({
    key: "close_reconciliation_consolidation",
    label: "Close / reconciliation / consolidation",
    description: "Account reconciliation, close orchestration, consolidation, and sign-off discipline.",
    taxonomyBucketKeys: ["function-cas", "function-erp-gl", "workflow-review", "workflow-file"],
    sourceNotes: ["Extends the legacy close / reconciliation bucket into a full period-close family."],
    subcategories: [
      makeExecutionSubcategory({
        key: "reconciliation_workbench",
        label: "Reconciliation workbench",
        description: "Preparation, review, and completion of reconciliations.",
        focus: "reconciliation preparation and review",
      }),
      makeIntegrationSubcategory({
        key: "close_data_and_consolidation_alignment",
        label: "Close data and consolidation alignment",
        description: "Close data movement, intercompany handling, and consolidation alignment.",
        focus: "close data movement and consolidation alignment",
      }),
      makeControlSubcategory({
        key: "close_controls_and_signoff",
        label: "Close controls and sign-off",
        description: "Review rules, approvals, and close evidence.",
        focus: "close controls and sign-off",
      }),
      makeEnablementSubcategory({
        key: "close_orchestration_and_visibility",
        label: "Close orchestration and visibility",
        description: "Operational readiness for close calendars, handoffs, and visibility.",
        focus: "close orchestration and visibility",
      }),
    ],
  }),
  defineUtility({
    key: "reporting_analytics_fpa",
    label: "Reporting / analytics / FP&A",
    description: "Management reporting, analysis, KPI visibility, and finance-oriented decision support.",
    taxonomyBucketKeys: ["function-analytics", "function-advisory", "workflow-advise"],
    sourceNotes: ["Grounded in the repo taxonomy's analytics and advisory buckets."],
    subcategories: [
      makeExecutionSubcategory({
        key: "management_reporting",
        label: "Management reporting",
        description: "Recurring reporting, packs, and management visibility.",
        focus: "management reporting and recurring analysis",
      }),
      makeIntegrationSubcategory({
        key: "data_model_and_drilldown",
        label: "Data model and drilldown",
        description: "Dimensional analysis, drilldown, and underlying data alignment.",
        focus: "analysis data model and drilldown",
      }),
      makeControlSubcategory({
        key: "metric_governance_and_consistency",
        label: "Metric governance and consistency",
        description: "Metric definitions, review consistency, and reporting trust.",
        focus: "metric governance and reporting consistency",
      }),
      makeEnablementSubcategory({
        key: "stakeholder_consumption_and_decision_use",
        label: "Stakeholder consumption and decision use",
        description: "How naturally teams consume, trust, and use reporting output.",
        focus: "stakeholder consumption and decision use",
      }),
    ],
  }),
  defineUtility({
    key: "forecasting_planning",
    label: "Forecasting / planning",
    description: "Planning models, budgets, scenarios, and plan-versus-actual decision cycles.",
    taxonomyBucketKeys: ["function-analytics", "function-advisory", "workflow-advise"],
    sourceNotes: ["Separates forward planning from reporting while preserving finance planning semantics."],
    subcategories: [
      makeExecutionSubcategory({
        key: "forecast_model_maintenance",
        label: "Forecast model maintenance",
        description: "Building, updating, and maintaining forecast logic.",
        focus: "forecast model maintenance",
      }),
      makeIntegrationSubcategory({
        key: "driver_and_actuals_alignment",
        label: "Driver and actuals alignment",
        description: "Alignment between planning drivers, actuals, and source data.",
        focus: "planning drivers and actuals alignment",
      }),
      makeControlSubcategory({
        key: "budget_workflow_and_review",
        label: "Budget workflow and review",
        description: "Approvals, review discipline, and planning control.",
        focus: "budget workflow and planning review",
      }),
      makeEnablementSubcategory({
        key: "scenario_use_and_decision_speed",
        label: "Scenario use and decision speed",
        description: "How quickly planning output can be used in live decisions.",
        focus: "scenario planning and decision speed",
      }),
    ],
  }),
  defineUtility({
    key: "tax_workflow_compliance",
    label: "Tax workflow / compliance",
    description: "Tax data gathering, prep, review, obligation tracking, and compliance workflow.",
    taxonomyBucketKeys: ["function-tax", "function-compliance", "compliance-tax", "workflow-review", "workflow-file"],
    sourceNotes: ["Grounded in the taxonomy's tax and compliance domains."],
    subcategories: [
      makeExecutionSubcategory({
        key: "tax_data_prep",
        label: "Tax data prep",
        description: "Collecting and preparing tax data and work inputs.",
        focus: "tax data preparation",
      }),
      makeIntegrationSubcategory({
        key: "filing_data_and_document_alignment",
        label: "Filing data and document alignment",
        description: "Alignment of tax data, source docs, and filing output.",
        focus: "tax filing data and document alignment",
      }),
      makeControlSubcategory({
        key: "review_obligation_and_evidence_controls",
        label: "Review, obligation, and evidence controls",
        description: "Review checkpoints, obligation management, and evidence retention.",
        focus: "tax review, obligation tracking, and evidence controls",
      }),
      makeEnablementSubcategory({
        key: "deadline_management_and_follow_through",
        label: "Deadline management and follow-through",
        description: "Operational readiness for deadlines, follow-ups, and client handoffs.",
        focus: "tax deadline management and follow-through",
      }),
    ],
  }),
  defineUtility({
    key: "audit_workflow_workpapers_evidence",
    label: "Audit workflow / workpapers / evidence",
    description: "Audit planning, workpapers, evidence management, review, and sign-off workflow.",
    taxonomyBucketKeys: ["function-audit", "function-compliance", "compliance-audit", "workflow-review"],
    sourceNotes: ["Grounded in the taxonomy's audit and compliance buckets."],
    subcategories: [
      makeExecutionSubcategory({
        key: "audit_planning_and_fieldwork",
        label: "Audit planning and fieldwork",
        description: "Planning, scoping, and fieldwork execution.",
        focus: "audit planning and fieldwork",
      }),
      makeIntegrationSubcategory({
        key: "workpaper_and_evidence_alignment",
        label: "Workpaper and evidence alignment",
        description: "Linking workpapers, requests, evidence, and underlying source data.",
        focus: "workpaper and evidence alignment",
      }),
      makeControlSubcategory({
        key: "review_signoff_and_retention",
        label: "Review sign-off and retention",
        description: "Review discipline, sign-off, and retained evidence controls.",
        focus: "audit review sign-off and retained evidence",
      }),
      makeEnablementSubcategory({
        key: "request_management_and_team_readiness",
        label: "Request management and team readiness",
        description: "Operational ease for requests, follow-up, and audit-team readiness.",
        focus: "audit request management and team readiness",
      }),
    ],
  }),
  defineUtility({
    key: "payroll_workforce_support",
    label: "Payroll / workforce support",
    description: "Payroll processing, workforce updates, employee support, and payroll compliance support.",
    taxonomyBucketKeys: ["function-payroll", "compliance-payroll", "workflow-deliver", "workflow-file"],
    sourceNotes: ["Preserves payroll as a distinct family with workforce service coverage."],
    subcategories: [
      makeExecutionSubcategory({
        key: "payrun_execution",
        label: "Payrun execution",
        description: "Core payroll runs and operational payroll work.",
        focus: "payrun execution",
      }),
      makeIntegrationSubcategory({
        key: "workforce_data_and_system_alignment",
        label: "Workforce data and system alignment",
        description: "Alignment between workforce changes, payroll inputs, and downstream systems.",
        focus: "workforce data and payroll system alignment",
      }),
      makeControlSubcategory({
        key: "compliance_and_payroll_controls",
        label: "Compliance and payroll controls",
        description: "Compliance rules, review controls, and payroll audit trail.",
        focus: "payroll compliance and review controls",
      }),
      makeEnablementSubcategory({
        key: "employee_service_and_issue_resolution",
        label: "Employee service and issue resolution",
        description: "Readiness for employee support, issues, and adoption.",
        focus: "employee payroll service and issue resolution",
      }),
    ],
  }),
  defineUtility({
    key: "document_capture_management_esignature",
    label: "Document capture / document management / e-signature",
    description: "Document intake, classification, storage, retrieval, routing, and e-signature support.",
    taxonomyBucketKeys: ["function-document-management", "function-workflow", "workflow-onboard", "workflow-review"],
    sourceNotes: ["Expands the legacy document capture utility into a full document control family."],
    subcategories: [
      makeExecutionSubcategory({
        key: "capture_classification_and_indexing",
        label: "Capture, classification, and indexing",
        description: "Document intake, OCR, classification, and indexing.",
        focus: "document capture, classification, and indexing",
      }),
      makeIntegrationSubcategory({
        key: "document_sync_and_system_handoffs",
        label: "Document sync and system handoffs",
        description: "Linking documents into workflows, systems, and records.",
        focus: "document sync and system handoffs",
      }),
      makeControlSubcategory({
        key: "retention_access_and_signature_controls",
        label: "Retention, access, and signature controls",
        description: "Retention rules, access control, and signature auditability.",
        focus: "document retention, access, and signature controls",
      }),
      makeEnablementSubcategory({
        key: "retrieval_sharing_and_user_adoption",
        label: "Retrieval, sharing, and user adoption",
        description: "Ease of finding, sharing, and using documents in real work.",
        focus: "document retrieval, sharing, and user adoption",
      }),
    ],
  }),
  defineUtility({
    key: "workflow_practice_operations_task_routing",
    label: "Workflow / practice operations / task routing",
    description: "Task intake, routing, capacity, deadlines, and operating discipline for delivery teams.",
    taxonomyBucketKeys: ["function-workflow", "function-practice-management", "workflow-deliver", "workflow-review"],
    sourceNotes: ["Grounded in workflow and practice-management structure from the taxonomy."],
    subcategories: [
      makeExecutionSubcategory({
        key: "task_intake_and_routing",
        label: "Task intake and routing",
        description: "Task capture, triage, and routing to the right team.",
        focus: "task intake and routing",
      }),
      makeIntegrationSubcategory({
        key: "capacity_deadline_and_status_alignment",
        label: "Capacity, deadline, and status alignment",
        description: "Operational alignment between work status, deadlines, and capacity.",
        focus: "capacity, deadline, and status alignment",
      }),
      makeControlSubcategory({
        key: "handoff_review_and_escalation_controls",
        label: "Handoff, review, and escalation controls",
        description: "Review rules, escalation handling, and operational controls.",
        focus: "handoff, review, and escalation controls",
      }),
      makeEnablementSubcategory({
        key: "operating_visibility_and_team_adoption",
        label: "Operating visibility and team adoption",
        description: "Visibility, adoption, and operating consistency across teams.",
        focus: "operating visibility and team adoption",
      }),
    ],
  }),
  defineUtility({
    key: "client_collaboration_portal_requests",
    label: "Client collaboration / portal / requests",
    description: "Client request management, portal communication, approvals, and shared-status workflow.",
    taxonomyBucketKeys: ["function-client-management", "function-workflow", "workflow-onboard", "workflow-review", "workflow-advise"],
    sourceNotes: ["Grounded in client-management and workflow taxonomy buckets."],
    subcategories: [
      makeExecutionSubcategory({
        key: "request_collection_and_follow_up",
        label: "Request collection and follow-up",
        description: "Requests, reminders, and client follow-through.",
        focus: "client request collection and follow-up",
      }),
      makeIntegrationSubcategory({
        key: "portal_data_and_document_alignment",
        label: "Portal data and document alignment",
        description: "How portal activity aligns to document and workflow systems.",
        focus: "portal data, document, and workflow alignment",
      }),
      makeControlSubcategory({
        key: "secure_exchange_and_approval_controls",
        label: "Secure exchange and approval controls",
        description: "Secure sharing, approvals, and access traceability.",
        focus: "secure exchange and client approval controls",
      }),
      makeEnablementSubcategory({
        key: "client_adoption_and_status_visibility",
        label: "Client adoption and status visibility",
        description: "Ease of client adoption and visibility into request status.",
        focus: "client adoption and shared status visibility",
      }),
    ],
  }),
  defineUtility({
    key: "payments_treasury_cash_application_commerce_connectivity",
    label: "Payments / treasury / cash application / commerce connectivity",
    description: "Payment initiation, treasury visibility, settlement handling, cash application, and commerce connectivity.",
    taxonomyBucketKeys: ["function-payments", "function-billing", "workflow-bill-collect", "workflow-deliver"],
    sourceNotes: ["Expands payments coverage into treasury, settlement, and commerce connectivity."],
    subcategories: [
      makeExecutionSubcategory({
        key: "payment_initiation_and_settlement",
        label: "Payment initiation and settlement",
        description: "Creating, sending, and settling payments.",
        focus: "payment initiation and settlement",
      }),
      makeIntegrationSubcategory({
        key: "cash_and_network_connectivity",
        label: "Cash and network connectivity",
        description: "Bank, processor, commerce, and cash-position connectivity.",
        focus: "cash, bank, and commerce connectivity",
      }),
      makeControlSubcategory({
        key: "treasury_and_payment_controls",
        label: "Treasury and payment controls",
        description: "Controls around treasury visibility, approvals, and payment risk.",
        focus: "treasury and payment controls",
      }),
      makeEnablementSubcategory({
        key: "cash_application_and_exception_follow_through",
        label: "Cash application and exception follow-through",
        description: "Operational readiness for cash application and payment exceptions.",
        focus: "cash application and payment exception follow-through",
      }),
    ],
  }),
  defineUtility({
    key: "crm_revenue_workflow",
    label: "CRM / revenue workflow",
    description: "Pipeline visibility, quote-to-contract handoff, account coordination, and revenue workflow support.",
    taxonomyBucketKeys: ["function-client-management", "function-billing", "workflow-acquire", "workflow-onboard", "workflow-bill-collect"],
    sourceNotes: ["Extends the legacy CRM / revenue workflow utility with clearer revenue operations semantics."],
    subcategories: [
      makeExecutionSubcategory({
        key: "pipeline_and_account_coordination",
        label: "Pipeline and account coordination",
        description: "Pipeline visibility and account coordination in live use.",
        focus: "pipeline and account coordination",
      }),
      makeIntegrationSubcategory({
        key: "quote_contract_and_delivery_handoffs",
        label: "Quote, contract, and delivery handoffs",
        description: "Alignment between CRM, contracts, billing, and delivery workflow.",
        focus: "quote, contract, and delivery handoffs",
      }),
      makeControlSubcategory({
        key: "revenue_process_controls",
        label: "Revenue process controls",
        description: "Controls and review over revenue workflow and account changes.",
        focus: "revenue workflow controls",
      }),
      makeEnablementSubcategory({
        key: "lifecycle_visibility_and_team_use",
        label: "Lifecycle visibility and team use",
        description: "How naturally teams use the product to manage customer lifecycle signal.",
        focus: "customer lifecycle visibility and team use",
      }),
    ],
  }),
  defineUtility({
    key: "controls_compliance_audit_trail_approvals",
    label: "Controls / compliance / audit trail / approvals",
    description: "Formal approval paths, control evidence, audit trails, attestations, and compliance readiness.",
    taxonomyBucketKeys: ["function-compliance", "function-workflow", "workflow-review", "compliance-audit"],
    sourceNotes: ["Preserves a durable controls and compliance family independent of any single workflow tool."],
    subcategories: [
      makeExecutionSubcategory({
        key: "approval_paths_and_policy_execution",
        label: "Approval paths and policy execution",
        description: "Approval routes and day-to-day policy execution.",
        focus: "approval paths and policy execution",
      }),
      makeIntegrationSubcategory({
        key: "audit_trail_and_change_history_alignment",
        label: "Audit trail and change history alignment",
        description: "Alignment between actions, history, and supporting systems.",
        focus: "audit trail and change history alignment",
      }),
      makeControlSubcategory({
        key: "control_testing_and_exception_management",
        label: "Control testing and exception management",
        description: "Evidence, exception handling, and control review discipline.",
        focus: "control testing and exception management",
      }),
      makeEnablementSubcategory({
        key: "attestation_and_operating_readiness",
        label: "Attestation and operating readiness",
        description: "Readiness for attestations, certifications, and ongoing team use.",
        focus: "attestation and operating readiness",
      }),
    ],
  }),
  defineUtility({
    key: "integration_interoperability_data_sync",
    label: "Integration / interoperability / data sync",
    description: "Connectors, APIs, master data alignment, sync reliability, and interoperability across the stack.",
    taxonomyBucketKeys: ["function-workflow", "function-analytics", "delivery-cloud", "delivery-hybrid"],
    sourceNotes: ["Creates a dedicated interoperability family from multiple taxonomy delivery and workflow cues."],
    subcategories: [
      makeExecutionSubcategory({
        key: "connector_coverage_and_sync_operations",
        label: "Connector coverage and sync operations",
        description: "Connector operations and day-to-day sync behavior.",
        focus: "connector coverage and sync operations",
      }),
      makeIntegrationSubcategory({
        key: "api_mapping_and_master_data_alignment",
        label: "API, mapping, and master data alignment",
        description: "APIs, mappings, and master data consistency.",
        focus: "API, mapping, and master data alignment",
      }),
      makeControlSubcategory({
        key: "monitoring_recovery_and_change_controls",
        label: "Monitoring, recovery, and change controls",
        description: "Monitoring, exception control, and recovery discipline.",
        focus: "integration monitoring, recovery, and change controls",
      }),
      makeEnablementSubcategory({
        key: "interoperability_adoption_and_operational_trust",
        label: "Interoperability adoption and operational trust",
        description: "How naturally teams rely on the integration layer in live operations.",
        focus: "interoperability adoption and operational trust",
      }),
    ],
  }),
  defineUtility({
    key: "automation_orchestration_ai_assistance",
    label: "Automation / orchestration / AI assistance",
    description: "Rules-based automation, orchestration, AI-assisted work, guardrails, and operating feedback loops.",
    taxonomyBucketKeys: ["function-workflow", "function-analytics", "workflow-deliver", "workflow-review"],
    sourceNotes: ["Creates a durable automation family without over-claiming unsupported AI benchmark logic."],
    subcategories: [
      makeExecutionSubcategory({
        key: "rules_based_automation",
        label: "Rules-based automation",
        description: "Task automation and repeatable execution.",
        focus: "rules-based automation",
      }),
      makeIntegrationSubcategory({
        key: "cross_system_orchestration",
        label: "Cross-system orchestration",
        description: "How automation coordinates across systems and data flows.",
        focus: "cross-system orchestration",
      }),
      makeControlSubcategory({
        key: "ai_guardrails_and_approval_safety",
        label: "AI guardrails and approval safety",
        description: "Guardrails, review, and safe approval patterns for automation and AI assistance.",
        focus: "AI guardrails and approval safety",
      }),
      makeEnablementSubcategory({
        key: "automation_learning_and_change_readiness",
        label: "Automation learning and change readiness",
        description: "Readiness for adoption, monitoring, and iterative improvement.",
        focus: "automation learning and change readiness",
      }),
    ],
  }),
] as const;

export const PRODUCT_GENERAL_MODULE = {
  key: "product_general_v1",
  title: "Product general",
  description: "Stable product profile questions that should be captured before utility-specific scoring begins.",
  questions: [
    { key: "product_name", fieldKey: "productName", prompt: "What is the product name?" },
    { key: "product_description", fieldKey: "productDescription", prompt: "Describe the product in one grounded operating paragraph: what it helps a team do, in what workflow, and with what practical boundary." },
    { key: "logo_reference", fieldKey: "logoReference", prompt: "What logo URL or placeholder asset reference should PAT use for this product?" },
    { key: "positioning", fieldKey: "positioning", prompt: "When a buyer asks what this product actually helps them improve, how should PAT position it in plain operating terms?" },
    { key: "target_customer", fieldKey: "targetCustomer", prompt: "Who is the primary target customer, buyer, or operator for this product today?" },
    { key: "target_use_context", fieldKey: "targetUseContext", prompt: "What real use context, workflow pressure, or operating situation is this product meant to handle?" },
    { key: "implementation_style", fieldKey: "implementationStyle", prompt: "How is this product typically implemented, configured, or rolled out in practice?" },
    { key: "operating_model_fit", fieldKey: "operatingModelFit", prompt: "What kind of operating model, team maturity, or process discipline does this product fit best right now?" },
    { key: "primary_buyer", fieldKey: "primaryBuyer", prompt: "Who usually owns the buying, approval, or rollout decision for this product?" },
    { key: "integration_posture", fieldKey: "integrationPosture", prompt: "How should PAT describe this product's integration posture: native system depth, connector dependence, data handoff burden, or interoperability limits?" },
  ],
} as const satisfies ProductQuestionModuleDefinition;

export const PRODUCT_OPEN_ENDED_MODULE = {
  key: "product_open_ended_v1",
  title: "Product open-ended",
  description: "Final text questions for nuance, risk, and context that should not be collapsed into a score.",
  questions: [
    { key: "strongest_workflow", prompt: "In which workflow or operating situation does this product currently look strongest, and what evidence supports that read?" },
    { key: "weakest_workflow", prompt: "In which workflow or operating situation does this product currently look weakest, and what evidence gap or operating limit drives that read?" },
    { key: "implementation_risk", prompt: "What is the most material implementation or rollout risk for this product right now?" },
    { key: "change_management_risk", prompt: "What user, operator, or buyer-side change-management risk is most likely to slow adoption?" },
    { key: "integration_gap", prompt: "What integration, data, or interoperability gap matters most before PAT should treat this product as stronger than directional?" },
    { key: "control_concern", prompt: "What control, approval, auditability, or governance concern deserves explicit follow-up?" },
    { key: "best_fit_customer", prompt: "Who looks like the best-fit customer or operator for this product today, based on the current evidence rather than aspiration?" },
    { key: "poor_fit_customer", prompt: "Who looks like the poorest-fit customer or operator for this product today, and why?" },
    { key: "evidence_needed_next", prompt: "What additional evidence would most improve confidence, calibration, or operator usefulness in this product next?" },
    { key: "recommended_next_action", prompt: "What is the single most sensible next action after this review: gather evidence, narrow scope, reposition, or continue?" },
  ],
} as const satisfies ProductQuestionModuleDefinition;

export const PRODUCT_UTILITY_REGISTRY_METADATA = {
  version: PRODUCT_UTILITY_REGISTRY_VERSION,
  sourceArtifacts: [
    "data/research/accounting-software-taxonomy-v1.json",
    "uploaded utility master direction (implementation-aligned launch brief; original .pages source not present in workspace during 2026-04-01 reconciliation)",
  ],
  notes: [
    "This registry replaces the flat utility v1 question bank with a stable utility-family and subcategory architecture.",
    "Question wording stays audience-reusable so vendor, firm, and individual product assessments can share the same underlying structure.",
    "Utilities are scope declarations, not product rankings or market-truth claims.",
    "Product-general and open-ended modules exist to improve operator usefulness and evidence honesty, not to manufacture richer signal than PAT actually has.",
    "No registry-version bump was taken during the 2026-04-01 reconciliation pass because no artifact-backed question-architecture mismatch was found inside the repo.",
  ],
} as const;
