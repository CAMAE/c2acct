export type StagedFirmDomainKey =
  | "operating_model"
  | "commercial_structure"
  | "automation_efficiency"
  | "delivery_efficiency"
  | "systems_integration"
  | "stack_efficiency"
  | "vendor_ai_resilience"
  | "governance_market_position";

export type StagedFirmModuleKey =
  | "firm_operating_model_commercial_v1"
  | "firm_automation_delivery_v1"
  | "firm_systems_integration_stack_v1"
  | "firm_vendor_ai_resilience_v1"
  | "firm_governance_market_position_v1";

export type StagedFirmDomain = {
  key: StagedFirmDomainKey;
  title: string;
};

export type StagedFirmQuestion = {
  key: string;
  prompt: string;
  order: number;
  domainKey: StagedFirmDomainKey;
};

export type StagedFirmModule = {
  key: StagedFirmModuleKey;
  title: string;
  description: string;
  domains: readonly StagedFirmDomainKey[];
  questions: readonly StagedFirmQuestion[];
};

function makeQuestions(
  prefix: string,
  domainKey: StagedFirmDomainKey,
  prompts: readonly string[],
  startOrder: number
): StagedFirmQuestion[] {
  return prompts.map((prompt, index) => ({
    key: `${prefix}_q${index + 1}`,
    prompt,
    order: startOrder + index,
    domainKey,
  }));
}

export const STAGED_FIRM_DOMAINS: readonly StagedFirmDomain[] = [
  { key: "operating_model", title: "Operating Model" },
  { key: "commercial_structure", title: "Commercial Structure" },
  { key: "automation_efficiency", title: "Automation Efficiency" },
  { key: "delivery_efficiency", title: "Delivery Efficiency" },
  { key: "systems_integration", title: "Systems Integration" },
  { key: "stack_efficiency", title: "Stack Efficiency" },
  { key: "vendor_ai_resilience", title: "Vendor & AI Resilience" },
  { key: "governance_market_position", title: "Governance & Market Position" },
] as const;

export const STAGED_FIRM_MODULES: readonly StagedFirmModule[] = [
  {
    key: "firm_operating_model_commercial_v1",
    title: "Operating Model & Commercial Structure",
    description: "Staged operating model and commercial structure assessment.",
    domains: ["operating_model", "commercial_structure"],
    questions: [
      ...makeQuestions(
        "operating_model",
        "operating_model",
        [
          "How clearly is your target operating model documented across service lines?",
          "How consistently are client-facing roles defined across engagements?",
          "How well do delivery handoffs follow a standard operating pattern?",
          "How clearly are ownership decisions assigned across recurring work?",
          "How disciplined is capacity planning against seasonal workload shifts?",
          "How consistently do leaders review workload distribution across teams?",
          "How standardized are escalation paths when work stalls or slips?",
          "How clearly are client segmentation choices reflected in operating design?",
          "How effectively does your structure support cross-functional issue resolution?",
          "How consistently are operating model changes rolled out across the firm?",
        ],
        1
      ),
      ...makeQuestions(
        "commercial_structure",
        "commercial_structure",
        [
          "How clearly are pricing models aligned to service complexity and effort?",
          "How consistently do engagement packages reflect the clients you serve best?",
          "How disciplined is scope management before new work is accepted?",
          "How reliably do renewals reflect delivered value rather than reactive discounting?",
          "How clearly are margin expectations communicated for each service line?",
          "How effectively do commercial terms reduce rework and unmanaged exceptions?",
          "How consistently are upsell opportunities tied to defined client outcomes?",
          "How well does your commercial model support predictable revenue planning?",
          "How clearly are strategic accounts distinguished from low-fit accounts?",
          "How effectively does compensation reinforce healthy client economics?",
        ],
        11
      ),
    ],
  },
  {
    key: "firm_automation_delivery_v1",
    title: "Automation & Delivery Efficiency",
    description: "Staged automation and delivery efficiency assessment.",
    domains: ["automation_efficiency", "delivery_efficiency"],
    questions: [
      ...makeQuestions(
        "automation_efficiency",
        "automation_efficiency",
        [
          "How much of recurring production work is automated end to end today?",
          "How consistently are automations monitored for failure or degradation?",
          "How well are workflow bottlenecks prioritized for automation investment?",
          "How repeatable is the process for turning manual tasks into automation candidates?",
          "How clearly are automation owners assigned after deployment?",
          "How often are broken or abandoned automations remediated quickly?",
          "How effectively do automations reduce turnaround time in core workflows?",
          "How well is automation performance measured against target outcomes?",
          "How consistently do teams adopt automations instead of reverting to manual work?",
          "How scalable is your current automation footprint across service lines?",
        ],
        1
      ),
      ...makeQuestions(
        "delivery_efficiency",
        "delivery_efficiency",
        [
          "How predictable are delivery timelines for recurring client commitments?",
          "How consistently are teams working from the same task status signals?",
          "How well do delivery leaders identify capacity constraints before deadlines slip?",
          "How disciplined is weekly review of work-in-progress aging and backlog?",
          "How effectively are exceptions resolved without creating downstream rework?",
          "How consistently do delivery teams reuse proven templates and playbooks?",
          "How clearly is throughput measured across core client workflows?",
          "How well are turnaround expectations calibrated to actual staffing realities?",
          "How consistently do teams eliminate duplicated effort across handoffs?",
          "How resilient is delivery performance during peak-volume periods?",
        ],
        11
      ),
    ],
  },
  {
    key: "firm_systems_integration_stack_v1",
    title: "Systems Integration & Stack Efficiency",
    description: "Staged systems integration and stack efficiency assessment.",
    domains: ["systems_integration", "stack_efficiency"],
    questions: [
      ...makeQuestions(
        "systems_integration",
        "systems_integration",
        [
          "How well are your core systems integrated across client delivery workflows?",
          "How reliably does data move between systems without manual reconciliation?",
          "How clearly are integration failures surfaced to the teams affected?",
          "How consistently are new tools evaluated for fit with the existing architecture?",
          "How effectively do integrations reduce duplicate entry across workflows?",
          "How disciplined is documentation of critical system dependencies?",
          "How quickly can the firm adapt integrations when process requirements change?",
          "How well does identity and access flow across integrated systems?",
          "How consistently are integration owners accountable for uptime and fixes?",
          "How scalable is the current integration layer as client volume grows?",
        ],
        1
      ),
      ...makeQuestions(
        "stack_efficiency",
        "stack_efficiency",
        [
          "How streamlined is your current technology stack for the work you actually do?",
          "How often do overlapping tools create wasted cost or confusion?",
          "How clearly are tool retirement decisions made when redundancy appears?",
          "How effectively does the stack support role-specific productivity without sprawl?",
          "How disciplined is governance over adding new tools to the stack?",
          "How easy is it for new team members to learn the current tool environment?",
          "How consistently do teams use the intended system of record for core tasks?",
          "How well does the stack minimize context switching across a normal workday?",
          "How clearly are the most expensive stack inefficiencies understood by leadership?",
          "How prepared is the firm to simplify the stack without disrupting delivery?",
        ],
        11
      ),
    ],
  },
  {
    key: "firm_vendor_ai_resilience_v1",
    title: "Vendor & AI Resilience",
    description: "Staged vendor and AI resilience assessment.",
    domains: ["vendor_ai_resilience"],
    questions: makeQuestions(
      "vendor_ai_resilience",
      "vendor_ai_resilience",
      [
        "How clearly are critical vendor dependencies identified across your firm?",
        "How consistently are vendor concentration risks reviewed by leadership?",
        "How well do key vendors meet the support expectations required by your teams?",
        "How prepared is the firm if a core vendor degrades service unexpectedly?",
        "How clearly are fallback processes defined for critical vendor failures?",
        "How disciplined is contract review for operational and data protection risk?",
        "How well are AI tools evaluated before they are introduced into production workflows?",
        "How consistently are AI outputs reviewed by accountable humans before use?",
        "How clearly are acceptable AI use cases defined for staff?",
        "How effectively are AI tools monitored for drift, hallucination, or unreliable output?",
        "How prepared is the firm to pause or replace an AI-assisted workflow quickly?",
        "How clearly are data handling restrictions enforced when using AI tools?",
        "How well does vendor selection account for long-term platform resilience?",
        "How consistently are vendor and AI risks incorporated into continuity planning?",
        "How disciplined is incident response when a third-party tool introduces workflow risk?",
        "How well are procurement choices aligned with actual operator needs?",
        "How clearly do teams understand the operational tradeoffs of their critical vendors?",
        "How effectively does the firm avoid becoming captive to weak vendor roadmaps?",
        "How resilient is the firm's AI posture against policy, compliance, or model changes?",
        "How confident are you in the firm's ability to scale AI usage without increasing fragility?",
      ],
      1
    ),
  },
  {
    key: "firm_governance_market_position_v1",
    title: "Governance & Market Position",
    description: "Staged governance and market position assessment.",
    domains: ["governance_market_position"],
    questions: makeQuestions(
      "governance_market_position",
      "governance_market_position",
      [
        "How clearly are strategic priorities translated into firm-wide operating goals?",
        "How consistently do leadership reviews focus on leading indicators rather than lagging surprises?",
        "How disciplined is ownership of cross-functional initiatives once they launch?",
        "How clearly are risk, compliance, and operating controls connected to day-to-day work?",
        "How effectively do governance forums resolve priority conflicts quickly?",
        "How consistently are policy exceptions logged, reviewed, and closed?",
        "How well does the firm understand its strongest market differentiation today?",
        "How clearly are target client segments reflected in service design and messaging?",
        "How effectively does leadership monitor competitor and market movement?",
        "How consistently are client feedback signals incorporated into strategic decisions?",
        "How well does the firm know which services should expand, stabilize, or exit?",
        "How clearly are growth bets tied to operational readiness?",
        "How effectively does governance support disciplined experimentation rather than ad hoc change?",
        "How consistently are major decisions documented with rationale and expected outcomes?",
        "How well does the firm's market position support pricing confidence?",
        "How clearly do frontline teams understand the firm's strategic market posture?",
        "How effectively does leadership rebalance resources when market conditions shift?",
        "How disciplined is post-mortem review when a strategic initiative misses its target?",
        "How credible is the firm's current market narrative to prospective clients and partners?",
        "How prepared is the firm to defend and extend its position over the next 12 months?",
      ],
      1
    ),
  },
] as const;

export const STAGED_FIRM_MODULES_BY_KEY = new Map(
  STAGED_FIRM_MODULES.map((module) => [module.key, module])
);

export const STAGED_FIRM_QUESTION_COUNT = STAGED_FIRM_MODULES.reduce(
  (total, module) => total + module.questions.length,
  0
);
