/**
 * Firm follow-up multiple-choice option sets — versioned registry (MC redesign
 * box, queue item 6). Source of truth for the copy is Leslie's file at
 * docs/assessment/firm-followup-mc-options-2026-09-04.md (sha256 0c6530e0…f04);
 * every stem, label and consequence clause below is verbatim from it (the
 * contract test re-parses the file and compares), with exactly these rulings
 * applied (Mythos, 2026-09-07):
 *
 *   1. Selection mode: MULTI for exactly six questions
 *      (FIRM_FOLLOWUP_MULTI_QUESTION_KEYS), SINGLE for the other nineteen.
 *      "Not a significant issue here" is exclusive in both modes. "Other"
 *      requires a non-empty short answer (<= FIRM_FOLLOWUP_OTHER_MAX_LENGTH)
 *      and may combine with other picks in MULTI.
 *   2. Governance Q1 labels are the neutral set (Partner sign-off queue ·
 *      Manager review step · Second-preparer verification · Document
 *      re-verification at intake · Compliance checklist pass · Cross-team
 *      handoff review) with consequence clauses trimmed to cost (time/queue).
 *   3. Options that repeat across questions stay as written.
 *   Strategy Q5's stem is the amended one ("… a more advanced intelligence
 *   layer, broader change, or faster execution?").
 *
 * Option keys are stable slugs: <module>.q<n>.<a-f> for Leslie's six choices,
 * <module>.q<n>.none for "Not a significant issue here", <module>.q<n>.other
 * for "Other (short answer)". Module prefixes: ops, auto, int, gov, strat.
 * questionKey matches SurveyQuestion.key for the stored open-ended question
 * (`<sectionKey>_open_<n>`), which is how the flag-on runtime finds the set.
 *
 * Nothing in this module reads the flag. Options live here, never in JSX.
 */
export const FIRM_FOLLOWUP_MC_VERSION = 1;
export const FIRM_FOLLOWUP_OTHER_MAX_LENGTH = 280;

export type FollowUpSelectionMode = "SINGLE" | "MULTI";
export type FollowUpOptionKind = "choice" | "not_significant" | "other";

export type FollowUpOption = Readonly<{
  key: string;
  letter: string;
  kind: FollowUpOptionKind;
  label: string;
  consequence: string | null;
}>;

export type FollowUpQuestion = Readonly<{
  questionKey: string;
  moduleKey: string;
  moduleSectionKey: string;
  pillar: string;
  index: number;
  selectionMode: FollowUpSelectionMode;
  stem: string;
  hint: string | null;
  options: readonly FollowUpOption[];
}>;

export const FIRM_FOLLOWUP_MULTI_QUESTION_KEYS = [
  "operating-model_open_2",
  "operating-model_open_5",
  "automation-ai_open_3",
  "automation-ai_open_4",
  "data-flow_open_2",
  "governance_open_3",
] as const;

export const FIRM_FOLLOWUP_MC_QUESTIONS: readonly FollowUpQuestion[] = Object.freeze([
  {
    questionKey: "operating-model_open_1",
    moduleKey: "firm_alignment_operating_model_v1",
    moduleSectionKey: "operating-model",
    pillar: "Operations",
    index: 1,
    selectionMode: "SINGLE",
    stem: "What is the biggest workflow bottleneck currently slowing execution in this area, and where does it show up most often?",
    hint: "the workflow, teams involved, and the drag it creates",
    options: [
      { key: "ops.q1.a", letter: "a", kind: "choice", label: "Unclear ownership in handoffs", consequence: "stalls transitions between preparers, reviewers, and support teams" },
      { key: "ops.q1.b", letter: "b", kind: "choice", label: "Missing or late inputs", consequence: "slows preparers and forces downstream rework" },
      { key: "ops.q1.c", letter: "c", kind: "choice", label: "Slow review cycles", consequence: "manager/partner queues delay finalization and push work into crunch periods" },
      { key: "ops.q1.d", letter: "d", kind: "choice", label: "Status uncertainty", consequence: "unclear readiness signals leave teams unsure what's waiting or blocked" },
      { key: "ops.q1.e", letter: "e", kind: "choice", label: "System mismatches", consequence: "cross‑platform data movement creates delays and manual correction loops" },
      { key: "ops.q1.f", letter: "f", kind: "choice", label: "Capacity bottlenecks", consequence: "overloaded preparer or reviewer roles slow everything behind them" },
      { key: "ops.q1.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "ops.q1.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "operating-model_open_2",
    moduleKey: "firm_alignment_operating_model_v1",
    moduleSectionKey: "operating-model",
    pillar: "Operations",
    index: 2,
    selectionMode: "MULTI",
    stem: "Where is ownership or accountability still unclear in this area, and what breakdown does that create in practice?",
    hint: "the handoff, decision point, or recurring confusion",
    options: [
      { key: "ops.q2.a", letter: "a", kind: "choice", label: "Prep vs. review ownership unclear", consequence: "stalls handoffs and creates repeated back‑and‑forth at the decision point" },
      { key: "ops.q2.b", letter: "b", kind: "choice", label: "Client‑communication ownership unclear", consequence: "missed inputs and recurring confusion about who follows up" },
      { key: "ops.q2.c", letter: "c", kind: "choice", label: "Exception‑handling ownership unclear", consequence: "late‑surfacing issues and unclear escalation paths" },
      { key: "ops.q2.d", letter: "d", kind: "choice", label: "Roll‑forward ownership unclear", consequence: "inconsistent carryovers and recurring data drift" },
      { key: "ops.q2.e", letter: "e", kind: "choice", label: "Final‑signoff ownership unclear", consequence: "bottlenecks and uncertainty about who can release the work" },
      { key: "ops.q2.f", letter: "f", kind: "choice", label: "Quality‑check ownership unclear", consequence: "uneven QC depth and avoidable errors" },
      { key: "ops.q2.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "ops.q2.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "operating-model_open_3",
    moduleKey: "firm_alignment_operating_model_v1",
    moduleSectionKey: "operating-model",
    pillar: "Operations",
    index: 3,
    selectionMode: "SINGLE",
    stem: "What review cadence, metric, or visibility signal would most improve operating discipline here over the next 90 days?",
    hint: "the one measurement or review change that would matter most",
    options: [
      { key: "ops.q3.a", letter: "a", kind: "choice", label: "Weekly workflow status review", consequence: "the anchor signal showing what's moving, what's stuck, and why" },
      { key: "ops.q3.b", letter: "b", kind: "choice", label: "Turnaround‑time metric", consequence: "a 90‑day view that exposes slow steps early and stabilizes pacing" },
      { key: "ops.q3.c", letter: "c", kind: "choice", label: "Handoff‑quality check", consequence: "a recurring accuracy read that prevents rework at transition points" },
      { key: "ops.q3.d", letter: "d", kind: "choice", label: "Capacity and load dashboard", consequence: "a weekly view of overloads and bottlenecks that drive delays" },
      { key: "ops.q3.e", letter: "e", kind: "choice", label: "Exception‑tracking log", consequence: "a single place to see recurring issues, causes, and resolution speed" },
      { key: "ops.q3.f", letter: "f", kind: "choice", label: "Daily readiness signal", consequence: "a real‑time indicator of what's ready, blocked, or waiting for review" },
      { key: "ops.q3.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "ops.q3.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "operating-model_open_4",
    moduleKey: "firm_alignment_operating_model_v1",
    moduleSectionKey: "operating-model",
    pillar: "Operations",
    index: 4,
    selectionMode: "SINGLE",
    stem: "When work passes between people, where does it most often have to be reworked, and why?",
    hint: "a concrete example of rework or escalation",
    options: [
      { key: "ops.q4.a", letter: "a", kind: "choice", label: "Prep → Review handoff", consequence: "expectations aren't clear, so reviewers send work back for corrections" },
      { key: "ops.q4.b", letter: "b", kind: "choice", label: "Review → Preparer return", consequence: "vague or inconsistent feedback drives repeated revisions" },
      { key: "ops.q4.c", letter: "c", kind: "choice", label: "Client input → Processing", consequence: "incomplete or unclear documents force follow‑up and re‑entry" },
      { key: "ops.q4.d", letter: "d", kind: "choice", label: "System → System transfer", consequence: "field‑mapping mismatches require manual correction" },
      { key: "ops.q4.e", letter: "e", kind: "choice", label: "Exception → Resolution", consequence: "issues surface late and escalate without clear ownership" },
      { key: "ops.q4.f", letter: "f", kind: "choice", label: "Automation → Manual step", consequence: "gaps in automated output force staff to fix work by hand" },
      { key: "ops.q4.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "ops.q4.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "operating-model_open_5",
    moduleKey: "firm_alignment_operating_model_v1",
    moduleSectionKey: "operating-model",
    pillar: "Operations",
    index: 5,
    selectionMode: "MULTI",
    stem: "What vendor, tool, or operating support would help improve workflow discipline here without creating more disruption?",
    hint: "the support needed and the condition it should improve",
    options: [
      { key: "ops.q5.a", letter: "a", kind: "choice", label: "Workflow‑tracking tool", consequence: "restores visibility into what's moving, waiting, or blocked, improving pacing and prioritization" },
      { key: "ops.q5.b", letter: "b", kind: "choice", label: "Document‑collection vendor", consequence: "strengthens timeliness and completeness of client inputs, stabilizing starts" },
      { key: "ops.q5.c", letter: "c", kind: "choice", label: "Data‑prep / cleanup support", consequence: "improves accuracy at the front of the workflow and reduces downstream rework" },
      { key: "ops.q5.d", letter: "d", kind: "choice", label: "Integration / sync tool", consequence: "aligns systems and reduces manual corrections that slow execution" },
      { key: "ops.q5.e", letter: "e", kind: "choice", label: "Review‑queue management tool", consequence: "improves reviewer pacing and reduces backlog‑driven delays" },
      { key: "ops.q5.f", letter: "f", kind: "choice", label: "Exception‑handling support", consequence: "speeds issue resolution and prevents late‑stage escalations" },
      { key: "ops.q5.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "ops.q5.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "automation-ai_open_1",
    moduleKey: "firm_alignment_automation_ai_v1",
    moduleSectionKey: "automation-ai",
    pillar: "Automation",
    index: 1,
    selectionMode: "SINGLE",
    stem: "Which process is most ready for automation or AI support today, and what is still blocking safe rollout?",
    hint: "the process, the expected value, and the current blocker",
    options: [
      { key: "auto.q1.a", letter: "a", kind: "choice", label: "Reconciliations", consequence: "high value from speed and consistency; blocked by inconsistent or incomplete source data" },
      { key: "auto.q1.b", letter: "b", kind: "choice", label: "Roll forwards", consequence: "high value from accurate carryover; blocked by unclear ownership of prior‑year inputs" },
      { key: "auto.q1.c", letter: "c", kind: "choice", label: "Document classification and extraction", consequence: "high value from faster prep; blocked by uneven client formats and low‑quality scans" },
      { key: "auto.q1.d", letter: "d", kind: "choice", label: "Exception detection", consequence: "high value from early issue‑flagging; blocked by unreliable inputs and unclear escalation rules" },
      { key: "auto.q1.e", letter: "e", kind: "choice", label: "Workflow status updates", consequence: "high value from visibility and pacing; blocked by fragmented systems and missing status signals" },
      { key: "auto.q1.f", letter: "f", kind: "choice", label: "Data entry and mapping ---", consequence: "high value from reduced manual work; blocked by mismatched fields and system‑to‑system differences" },
      { key: "auto.q1.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "auto.q1.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "automation-ai_open_2",
    moduleKey: "firm_alignment_automation_ai_v1",
    moduleSectionKey: "automation-ai",
    pillar: "Automation",
    index: 2,
    selectionMode: "SINGLE",
    stem: "Where would AI-assisted work create the most value in this area, and what guardrails would need to be in place first?",
    hint: "the use case and the control requirement",
    options: [
      { key: "auto.q2.a", letter: "a", kind: "choice", label: "Document classification and extraction", consequence: "requires template validation and strict client‑data safeguards" },
      { key: "auto.q2.b", letter: "b", kind: "choice", label: "Exception detection", consequence: "requires clear escalation rules and human confirmation before any action" },
      { key: "auto.q2.c", letter: "c", kind: "choice", label: "Reconciliation support", consequence: "requires verified source data and locked evidence before AI can propose matches" },
      { key: "auto.q2.d", letter: "d", kind: "choice", label: "Roll‑forward preparation", consequence: "requires prior‑year data governance and change‑tracking controls" },
      { key: "auto.q2.e", letter: "e", kind: "choice", label: "Workflow status updates", consequence: "requires audit trails and role‑based permissions for any automated changes" },
      { key: "auto.q2.f", letter: "f", kind: "choice", label: "Data entry and mapping", consequence: "requires field‑mapping standards and integration monitoring" },
      { key: "auto.q2.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "auto.q2.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "automation-ai_open_3",
    moduleKey: "firm_alignment_automation_ai_v1",
    moduleSectionKey: "automation-ai",
    pillar: "Automation",
    index: 3,
    selectionMode: "MULTI",
    stem: "What data, workflow, or systems prerequisite is still missing for repeatable automation in this area?",
    hint: "the gating dependency",
    options: [
      { key: "auto.q3.a", letter: "a", kind: "choice", label: "Reliable source data", consequence: "the foundational gating dependency for consistent, error‑free automation" },
      { key: "auto.q3.b", letter: "b", kind: "choice", label: "Standardized templates", consequence: "the prerequisite for predictable extraction, formatting, and workflow steps" },
      { key: "auto.q3.c", letter: "c", kind: "choice", label: "Defined process steps", consequence: "the stable workflow automation needs to run the same way every time" },
      { key: "auto.q3.d", letter: "d", kind: "choice", label: "Field‑mapping rules", consequence: "the requirement for accurate system‑to‑system data movement" },
      { key: "auto.q3.e", letter: "e", kind: "choice", label: "Exception‑handling logic", consequence: "the guardrail that tells automation what to escalate and when" },
      { key: "auto.q3.f", letter: "f", kind: "choice", label: "Audit‑trail evidence", consequence: "the traceability requirement for compliant, verifiable automated actions" },
      { key: "auto.q3.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "auto.q3.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "automation-ai_open_4",
    moduleKey: "firm_alignment_automation_ai_v1",
    moduleSectionKey: "automation-ai",
    pillar: "Automation",
    index: 4,
    selectionMode: "MULTI",
    stem: "What team, skill, or change-management barrier is most likely to slow adoption of automation here?",
    hint: "the barrier and how it shows up",
    options: [
      { key: "auto.q4.a", letter: "a", kind: "choice", label: "Low trust in automated outputs", consequence: "teams double‑check everything manually, erasing expected time savings" },
      { key: "auto.q4.b", letter: "b", kind: "choice", label: "Inconsistent reviewer expectations", consequence: "AI work gets rejected or reworked because standards vary by person or team" },
      { key: "auto.q4.c", letter: "c", kind: "choice", label: "Skill gaps with new tools", consequence: "slow adoption, mistakes, and avoidance of automation features" },
      { key: "auto.q4.d", letter: "d", kind: "choice", label: "Fear of losing control over the process", consequence: "reluctance to hand routine steps to AI keeps work manual" },
      { key: "auto.q4.e", letter: "e", kind: "choice", label: "Unclear ownership of exceptions", consequence: "confusion when AI flags issues delays resolution and stalls rollout" },
      { key: "auto.q4.f", letter: "f", kind: "choice", label: "Resistance to long‑standing workflow changes", consequence: null },
      { key: "auto.q4.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "auto.q4.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "automation-ai_open_5",
    moduleKey: "firm_alignment_automation_ai_v1",
    moduleSectionKey: "automation-ai",
    pillar: "Automation",
    index: 5,
    selectionMode: "SINGLE",
    stem: "What proof would leadership need before expanding automation or AI usage in this area more broadly?",
    hint: "the evidence, threshold, or result leadership needs to see",
    options: [
      { key: "auto.q5.a", letter: "a", kind: "choice", label: "Consistent accuracy improvements", consequence: "clear proof automated steps reduce errors compared to manual work" },
      { key: "auto.q5.b", letter: "b", kind: "choice", label: "Faster cycle times", consequence: "measurable, steady reductions in turnaround across teams and workloads" },
      { key: "auto.q5.c", letter: "c", kind: "choice", label: "Reliable exception handling", consequence: "issues surfaced early, routed correctly, and resolved without escalation" },
      { key: "auto.q5.d", letter: "d", kind: "choice", label: "Stable system integrations", consequence: "no sync failures, data drift, or mapping mismatches during automated runs" },
      { key: "auto.q5.e", letter: "e", kind: "choice", label: "Uniform outputs across teams", consequence: "consistent results regardless of who initiates or executes the workflow" },
      { key: "auto.q5.f", letter: "f", kind: "choice", label: "Predictable ROI", consequence: "visible time savings or capacity gains that demonstrate scalable value" },
      { key: "auto.q5.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "auto.q5.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "data-flow_open_1",
    moduleKey: "firm_alignment_data_flow_v1",
    moduleSectionKey: "data-flow",
    pillar: "Integration",
    index: 1,
    selectionMode: "SINGLE",
    stem: "Which system or process handoff currently creates the biggest data delay or data-quality failure in this area?",
    hint: "the handoff and what breaks or slows",
    options: [
      { key: "int.q1.a", letter: "a", kind: "choice", label: "Client input → Intake system", consequence: "incomplete or inconsistent documents create delays and cleanup" },
      { key: "int.q1.b", letter: "b", kind: "choice", label: "Intake system → Prep platform", consequence: "mismatched fields or missing mappings create data‑quality failures" },
      { key: "int.q1.c", letter: "c", kind: "choice", label: "Prep platform → Review system", consequence: "sync issues force manual re‑entry and slow review" },
      { key: "int.q1.d", letter: "d", kind: "choice", label: "Workflow tool → Reporting system", consequence: "status updates fail to transfer, producing stale or inaccurate dashboards" },
      { key: "int.q1.e", letter: "e", kind: "choice", label: "Exception log → Resolution workflow", consequence: "misrouted issues surface late and disrupt delivery" },
      { key: "int.q1.f", letter: "f", kind: "choice", label: "Automation output → Manual step", consequence: "incorrect automated results require human correction before work can continue" },
      { key: "int.q1.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "int.q1.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "data-flow_open_2",
    moduleKey: "firm_alignment_data_flow_v1",
    moduleSectionKey: "data-flow",
    pillar: "Integration",
    index: 2,
    selectionMode: "MULTI",
    stem: "Where does confidence in data quality or reporting break down most often today?",
    hint: "the source of the trust gap and its consequence",
    options: [
      { key: "int.q2.a", letter: "a", kind: "choice", label: "Unclear or incomplete source data", consequence: "the foundation isn't reliable, so every downstream report is questioned" },
      { key: "int.q2.b", letter: "b", kind: "choice", label: "Reconciliations that don't tie out", consequence: "mismatches trigger skepticism and manual verification loops" },
      { key: "int.q2.c", letter: "c", kind: "choice", label: "Stale or lagging updates", consequence: "teams can't tell what reflects current reality versus outdated information" },
      { key: "int.q2.d", letter: "d", kind: "choice", label: "System‑to‑system mismatches", consequence: "conflicting numbers across platforms undermine trust in both" },
      { key: "int.q2.e", letter: "e", kind: "choice", label: "Manual overrides or adjustments", consequence: "unclear changes create doubt about validity and accuracy" },
      { key: "int.q2.f", letter: "f", kind: "choice", label: "Hidden or late‑surfacing exceptions", consequence: "unresolved issues appear too late, eroding confidence in the workflow" },
      { key: "int.q2.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "int.q2.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "data-flow_open_3",
    moduleKey: "firm_alignment_data_flow_v1",
    moduleSectionKey: "data-flow",
    pillar: "Integration",
    index: 3,
    selectionMode: "SINGLE",
    stem: "What integration dependency is most likely to threaten implementation or reporting continuity here?",
    hint: "the dependency and the risk",
    options: [
      { key: "int.q3.a", letter: "a", kind: "choice", label: "Unreliable system‑to‑system sync", consequence: "creates reporting gaps when data fails to transfer or updates lag" },
      { key: "int.q3.b", letter: "b", kind: "choice", label: "Incomplete field‑mapping rules", consequence: "mismatched values break downstream reporting logic" },
      { key: "int.q3.c", letter: "c", kind: "choice", label: "Vendor platform dependency", consequence: "outages or format changes disrupt intake or processing" },
      { key: "int.q3.d", letter: "d", kind: "choice", label: "Exception‑routing integration", consequence: "unresolved issues never reach the right team, breaking continuity" },
      { key: "int.q3.e", letter: "e", kind: "choice", label: "Automation‑output integration", consequence: "incorrect automated results trigger manual correction loops" },
      { key: "int.q3.f", letter: "f", kind: "choice", label: "Integration‑API instability", consequence: "small upstream changes break core processes without warning" },
      { key: "int.q3.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "int.q3.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "data-flow_open_4",
    moduleKey: "firm_alignment_data_flow_v1",
    moduleSectionKey: "data-flow",
    pillar: "Integration",
    index: 4,
    selectionMode: "SINGLE",
    stem: "What visibility or reporting gap most limits operational control in this area right now?",
    hint: "what leaders or teams still cannot see",
    options: [
      { key: "int.q4.a", letter: "a", kind: "choice", label: "Real‑time workflow status", consequence: "leaders can't see what's ready, waiting, or blocked, limiting pacing and prioritization" },
      { key: "int.q4.b", letter: "b", kind: "choice", label: "Exception patterns and aging", consequence: "teams can't see recurring issues or how long they've been open, limiting early intervention" },
      { key: "int.q4.c", letter: "c", kind: "choice", label: "Reviewer queue load", consequence: "leaders can't see backlog depth or bottlenecks, limiting capacity management" },
      { key: "int.q4.d", letter: "d", kind: "choice", label: "Input completeness and timeliness", consequence: "teams can't see missing client materials, limiting predictable starts" },
      { key: "int.q4.e", letter: "e", kind: "choice", label: "System‑to‑system sync health", consequence: "leaders can't see when data fails to transfer, limiting trust in downstream reporting" },
      { key: "int.q4.f", letter: "f", kind: "choice", label: "Cycle‑time breakdowns", consequence: "teams can't see where time is actually spent, limiting targeted process improvements" },
      { key: "int.q4.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "int.q4.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "data-flow_open_5",
    moduleKey: "firm_alignment_data_flow_v1",
    moduleSectionKey: "data-flow",
    pillar: "Integration",
    index: 5,
    selectionMode: "SINGLE",
    stem: "What one change would most improve continuity across tools, teams, or data flows in this area?",
    hint: "the single highest-payoff improvement",
    options: [
      { key: "int.q5.a", letter: "a", kind: "choice", label: "Unified field‑mapping standards", consequence: "creates consistent data movement across tools and eliminates mismatches" },
      { key: "int.q5.b", letter: "b", kind: "choice", label: "Reliable real‑time system sync", consequence: "ensures updates flow continuously without lag, drift, or manual intervention" },
      { key: "int.q5.c", letter: "c", kind: "choice", label: "Single source of truth for key data", consequence: "removes conflicting values and stabilizes reporting across teams" },
      { key: "int.q5.d", letter: "d", kind: "choice", label: "Standardized intake formats", consequence: "reduces cleanup and improves continuity from client inputs through downstream systems" },
      { key: "int.q5.e", letter: "e", kind: "choice", label: "Clear ownership of data updates", consequence: "prevents gaps or delays when information changes and must propagate across tools" },
      { key: "int.q5.f", letter: "f", kind: "choice", label: "Integration‑health monitoring", consequence: "catches sync failures early and prevents reporting breaks or stale data" },
      { key: "int.q5.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "int.q5.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "governance_open_1",
    moduleKey: "firm_alignment_governance_v1",
    moduleSectionKey: "governance",
    pillar: "Governance",
    index: 1,
    selectionMode: "SINGLE",
    stem: "Which control, approval, or review step currently slows work here with the least operational value returned?",
    hint: "the step, why it feels heavy, what it protects",
    options: [
      { key: "gov.q1.a", letter: "a", kind: "choice", label: "Partner sign-off queue", consequence: "long queues and late-stage changes add time before release" },
      { key: "gov.q1.b", letter: "b", kind: "choice", label: "Manager review step", consequence: "adds a queue between preparation and finalization" },
      { key: "gov.q1.c", letter: "c", kind: "choice", label: "Second-preparer verification", consequence: "adds a second pass of effort before review" },
      { key: "gov.q1.d", letter: "d", kind: "choice", label: "Document re-verification at intake", consequence: "adds time at intake when documents were already validated elsewhere" },
      { key: "gov.q1.e", letter: "e", kind: "choice", label: "Compliance checklist pass", consequence: "adds procedural time before release" },
      { key: "gov.q1.f", letter: "f", kind: "choice", label: "Cross-team handoff review", consequence: "adds a wait at each transition between teams" },
      { key: "gov.q1.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "gov.q1.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "governance_open_2",
    moduleKey: "firm_alignment_governance_v1",
    moduleSectionKey: "governance",
    pillar: "Governance",
    index: 2,
    selectionMode: "SINGLE",
    stem: "What vendor-risk or control evidence is still hardest to obtain or maintain in this area?",
    hint: "the specific evidence gap",
    options: [
      { key: "gov.q2.a", letter: "a", kind: "choice", label: "Up‑to‑date security certifications (SOC 2, ISO)", consequence: "renewal dates, scope changes, and exceptions are difficult to track" },
      { key: "gov.q2.b", letter: "b", kind: "choice", label: "Data‑handling documentation", consequence: "frequent vendor system, storage, and sub‑processor updates make accuracy hard to maintain" },
      { key: "gov.q2.c", letter: "c", kind: "choice", label: "Access‑control evidence", consequence: "permission changes over time make it hard to confirm who has access and whether entitlements are stale" },
      { key: "gov.q2.d", letter: "d", kind: "choice", label: "Incident‑response history", consequence: "clear records of past issues, root causes, and remediation steps are often incomplete or unavailable" },
      { key: "gov.q2.e", letter: "e", kind: "choice", label: "Data‑retention and deletion proof", consequence: "validating that data was actually removed according to policy is consistently challenging" },
      { key: "gov.q2.f", letter: "f", kind: "choice", label: "Audit‑trail completeness", consequence: "ensuring logs are intact, accessible, and consistently captured across tools is difficult" },
      { key: "gov.q2.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "gov.q2.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "governance_open_3",
    moduleKey: "firm_alignment_governance_v1",
    moduleSectionKey: "governance",
    pillar: "Governance",
    index: 3,
    selectionMode: "MULTI",
    stem: "Where is governance decision ownership still unclear, and what risk does that create?",
    hint: "the decision area and the consequence",
    options: [
      { key: "gov.q3.a", letter: "a", kind: "choice", label: "Exception‑escalation authority", consequence: "unclear escalation decisions create late‑stage surprises and inconsistent resolution" },
      { key: "gov.q3.b", letter: "b", kind: "choice", label: "Template / standards governance", consequence: "unclear approval ownership creates format drift and downstream data inconsistencies" },
      { key: "gov.q3.c", letter: "c", kind: "choice", label: "Vendor‑access approvals", consequence: "unclear permission ownership creates exposure to unauthorized access or stale entitlements" },
      { key: "gov.q3.d", letter: "d", kind: "choice", label: "Data‑quality ownership", consequence: "unclear accuracy certification creates reporting errors and rework" },
      { key: "gov.q3.e", letter: "e", kind: "choice", label: "System‑integration change signoff", consequence: "unclear mapping/API approval creates sync failures and broken workflows" },
      { key: "gov.q3.f", letter: "f", kind: "choice", label: "Compliance‑check ownership", consequence: "unclear regulatory‑step ownership creates audit findings or missed controls" },
      { key: "gov.q3.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "gov.q3.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "governance_open_4",
    moduleKey: "firm_alignment_governance_v1",
    moduleSectionKey: "governance",
    pillar: "Governance",
    index: 4,
    selectionMode: "SINGLE",
    stem: "What resilience, incident, or failure scenario concerns leadership most in this area right now?",
    hint: "the scenario and why it matters",
    options: [
      { key: "gov.q4.a", letter: "a", kind: "choice", label: "System‑to‑system sync failure", consequence: "creates silent data drift and breaks reporting continuity" },
      { key: "gov.q4.b", letter: "b", kind: "choice", label: "Vendor platform outage", consequence: "stalls critical workflow steps and puts SLAs at immediate risk" },
      { key: "gov.q4.c", letter: "c", kind: "choice", label: "Security breach or unauthorized access", consequence: "exposes client data and triggers regulatory, reputational, and contractual consequences" },
      { key: "gov.q4.d", letter: "d", kind: "choice", label: "Corrupted or missing audit logs", consequence: "makes incident reconstruction impossible and weakens compliance posture" },
      { key: "gov.q4.e", letter: "e", kind: "choice", label: "Automation misfire or incorrect output", consequence: "erodes trust and forces teams back to manual work under pressure" },
      { key: "gov.q4.f", letter: "f", kind: "choice", label: "Integration‑API instability", consequence: "small upstream changes break core processes without warning" },
      { key: "gov.q4.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "gov.q4.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "governance_open_5",
    moduleKey: "firm_alignment_governance_v1",
    moduleSectionKey: "governance",
    pillar: "Governance",
    index: 5,
    selectionMode: "SINGLE",
    stem: "What would most improve trust in a new vendor, tool, or control approach touching this area?",
    hint: "the evidence, behavior, or safeguard that matters most",
    options: [
      { key: "gov.q5.a", letter: "a", kind: "choice", label: "Transparent security certifications (SOC 2, ISO) with no exceptions", consequence: "signals mature controls and reduces uncertainty about baseline safety" },
      { key: "gov.q5.b", letter: "b", kind: "choice", label: "Clear, stable data‑handling practices", consequence: "shows exactly how client data is stored, accessed, and protected, reducing compliance risk" },
      { key: "gov.q5.c", letter: "c", kind: "choice", label: "Consistent performance in pilot runs", consequence: "demonstrates reliability under real conditions and reduces fear of hidden failure modes" },
      { key: "gov.q5.d", letter: "d", kind: "choice", label: "Strong audit‑trail visibility", consequence: "proves every action can be traced, reducing risk of unexplainable changes or compliance gaps" },
      { key: "gov.q5.e", letter: "e", kind: "choice", label: "Predictable change‑management behavior", consequence: "shows updates are communicated early and clearly, reducing disruption risk" },
      { key: "gov.q5.f", letter: "f", kind: "choice", label: "Reliable integration behavior", consequence: "proves the tool won't break workflows or data flows, reducing operational continuity concerns" },
      { key: "gov.q5.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "gov.q5.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "strategy_open_1",
    moduleKey: "firm_alignment_strategy_v1",
    moduleSectionKey: "strategy",
    pillar: "Strategy",
    index: 1,
    selectionMode: "SINGLE",
    stem: "Which strategic priority is hardest to translate into day-to-day execution in this area, and why?",
    hint: "the priority and where execution breaks down",
    options: [
      { key: "strat.q1.a", letter: "a", kind: "choice", label: "Shift more work to automation and AI", consequence: "breaks down when teams don't trust outputs and revert to manual steps" },
      { key: "strat.q1.b", letter: "b", kind: "choice", label: "Standardize processes across teams", consequence: "breaks down when local preferences override shared methods and create drift" },
      { key: "strat.q1.c", letter: "c", kind: "choice", label: "Strengthen data‑driven decision‑making", consequence: "breaks down when source data is unreliable or reporting lags" },
      { key: "strat.q1.d", letter: "d", kind: "choice", label: "Accelerate cycle times", consequence: "breaks down when bottlenecks (reviews, approvals, handoffs) remain unchanged" },
      { key: "strat.q1.e", letter: "e", kind: "choice", label: "Enhance cross‑team coordination", consequence: "breaks down when ownership at handoffs is unclear or signals don't sync" },
      { key: "strat.q1.f", letter: "f", kind: "choice", label: "Increase scalability of core workflows", consequence: "breaks down when integrations aren't stable enough to support higher volume" },
      { key: "strat.q1.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "strat.q1.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "strategy_open_2",
    moduleKey: "firm_alignment_strategy_v1",
    moduleSectionKey: "strategy",
    pillar: "Strategy",
    index: 2,
    selectionMode: "SINGLE",
    stem: "Where do change efforts lose traction most often in this area today?",
    hint: "the point in the change cycle where momentum drops",
    options: [
      { key: "strat.q2.a", letter: "a", kind: "choice", label: "After initial alignment meetings", consequence: "expectations aren't translated into concrete steps, so teams revert to old habits" },
      { key: "strat.q2.b", letter: "b", kind: "choice", label: "During early pilot execution", consequence: "uneven results weaken confidence before improvements stabilize" },
      { key: "strat.q2.c", letter: "c", kind: "choice", label: "At cross‑team handoffs", consequence: "unclear ownership stalls progress and no one drives the new process forward" },
      { key: "strat.q2.d", letter: "d", kind: "choice", label: "When training shifts from concept to practice", consequence: "teams lack time to apply new methods and fall back to familiar workflows" },
      { key: "strat.q2.e", letter: "e", kind: "choice", label: "During tool or system adoption", consequence: "integrations aren't ready, creating frustration and workarounds" },
      { key: "strat.q2.f", letter: "f", kind: "choice", label: "When exceptions arise", consequence: "undefined edge cases cause teams to pause the new process to avoid risk" },
      { key: "strat.q2.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "strat.q2.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "strategy_open_3",
    moduleKey: "firm_alignment_strategy_v1",
    moduleSectionKey: "strategy",
    pillar: "Strategy",
    index: 3,
    selectionMode: "SINGLE",
    stem: "What market, client, or competitive pressure is forcing the biggest reprioritization in this area right now?",
    hint: "the pressure and how it changes decisions",
    options: [
      { key: "strat.q3.a", letter: "a", kind: "choice", label: "Clients demanding faster turnaround", consequence: "shifts decisions toward cycle‑time reduction and automation readiness" },
      { key: "strat.q3.b", letter: "b", kind: "choice", label: "Rising expectations for data accuracy", consequence: "forces prioritization of integration stability and stronger quality controls" },
      { key: "strat.q3.c", letter: "c", kind: "choice", label: "Competitive pressure to modernize", consequence: "accelerates AI‑enabled workflows and process standardization" },
      { key: "strat.q3.d", letter: "d", kind: "choice", label: "Market movement toward automation‑first delivery", consequence: "reprioritizes manual steps, reviews, and handoffs that slow scale" },
      { key: "strat.q3.e", letter: "e", kind: "choice", label: "Increasing regulatory scrutiny", consequence: "pushes governance, auditability, and vendor‑risk controls ahead of new initiatives" },
      { key: "strat.q3.f", letter: "f", kind: "choice", label: "Pressure to reduce operational cost", consequence: "drives consolidation, elimination of redundant steps, and tighter integration" },
      { key: "strat.q3.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "strat.q3.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "strategy_open_4",
    moduleKey: "firm_alignment_strategy_v1",
    moduleSectionKey: "strategy",
    pillar: "Strategy",
    index: 4,
    selectionMode: "SINGLE",
    stem: "What risk is most likely to cause the current roadmap or change plan in this area to miss expectations?",
    hint: "the highest near-term-consequence risk",
    options: [
      { key: "strat.q4.a", letter: "a", kind: "choice", label: "Integration instability at launch", consequence: "early sync failures undermine adoption and confidence" },
      { key: "strat.q4.b", letter: "b", kind: "choice", label: "Uneven team adoption", consequence: "inconsistent uptake stalls momentum and fragments execution" },
      { key: "strat.q4.c", letter: "c", kind: "choice", label: "Unclear ownership of new steps", consequence: "missing accountability at handoffs slows or halts progress" },
      { key: "strat.q4.d", letter: "d", kind: "choice", label: "Insufficient training time", consequence: "teams can't practice new behaviors, reducing readiness" },
      { key: "strat.q4.e", letter: "e", kind: "choice", label: "Vendor dependency or outage", consequence: "external shifts or downtime disrupt continuity and timelines" },
      { key: "strat.q4.f", letter: "f", kind: "choice", label: "Underestimated change load", consequence: "volume of process and behavior changes exceeds capacity, causing slippage" },
      { key: "strat.q4.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "strat.q4.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "strategy_open_5",
    moduleKey: "firm_alignment_strategy_v1",
    moduleSectionKey: "strategy",
    pillar: "Strategy",
    index: 5,
    selectionMode: "SINGLE",
    stem: "What signal would tell you this area is ready for a more advanced intelligence layer, broader change, or faster execution?",
    hint: "the concrete signal or condition",
    options: [
      { key: "strat.q5.a", letter: "a", kind: "choice", label: "Stable, reliable data flows", consequence: "indicates integrations are mature enough for deeper insight and faster execution" },
      { key: "strat.q5.b", letter: "b", kind: "choice", label: "Consistent adoption of current steps", consequence: "shows teams execute the baseline predictably, enabling broader change" },
      { key: "strat.q5.c", letter: "c", kind: "choice", label: "Reduced exception volume", consequence: "signals workflows are stable enough to support acceleration and advanced insight" },
      { key: "strat.q5.d", letter: "d", kind: "choice", label: "Clear ownership at handoffs", consequence: "confirms governance strength for deeper intelligence insight use without confusion" },
      { key: "strat.q5.e", letter: "e", kind: "choice", label: "High accuracy in current reporting", consequence: "shows the foundation is strong enough for more advanced analytics" },
      { key: "strat.q5.f", letter: "f", kind: "choice", label: "Positive feedback on early automation", consequence: "indicates trust levels that support faster execution and expanded insight use" },
      { key: "strat.q5.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "strat.q5.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
] as const);

const QUESTION_BY_KEY: ReadonlyMap<string, FollowUpQuestion> = new Map(
  FIRM_FOLLOWUP_MC_QUESTIONS.map((question) => [question.questionKey, question])
);

export function getFirmFollowUpQuestion(questionKey: string): FollowUpQuestion | null {
  return QUESTION_BY_KEY.get(questionKey) ?? null;
}

/** A stored/submitted selection: option keys in pick order plus the "Other" text. */
export type FollowUpMcAnswer = {
  optionKeys: string[];
  otherText: string | null;
};

function optionOfKind(question: FollowUpQuestion, kind: FollowUpOptionKind): FollowUpOption | null {
  return question.options.find((option) => option.kind === kind) ?? null;
}

function optionByKey(question: FollowUpQuestion, key: string): FollowUpOption | null {
  return question.options.find((option) => option.key === key) ?? null;
}

/**
 * UI transition for one click. Encodes the rulings so the client has no logic
 * of its own:
 *   - SINGLE: the pick replaces the current selection (clicking the selected
 *     option again clears it).
 *   - MULTI: the pick toggles.
 *   - "Not a significant issue here" is exclusive: picking it clears everything
 *     else; picking anything else clears it.
 *   - otherText is kept only while "Other" is selected.
 */
export function applyFollowUpPick(
  question: FollowUpQuestion,
  current: FollowUpMcAnswer | null | undefined,
  optionKey: string
): FollowUpMcAnswer {
  const picked = optionByKey(question, optionKey);
  const base: FollowUpMcAnswer = { optionKeys: [...(current?.optionKeys ?? [])], otherText: current?.otherText ?? null };
  if (!picked) {
    return base;
  }
  const alreadySelected = base.optionKeys.includes(optionKey);
  let next: string[];
  if (alreadySelected) {
    next = base.optionKeys.filter((key) => key !== optionKey);
  } else if (picked.kind === "not_significant" || question.selectionMode === "SINGLE") {
    next = [optionKey];
  } else {
    const notSignificant = optionOfKind(question, "not_significant");
    next = [...base.optionKeys.filter((key) => key !== notSignificant?.key), optionKey];
  }
  const other = optionOfKind(question, "other");
  const otherSelected = other ? next.includes(other.key) : false;
  return { optionKeys: next, otherText: otherSelected ? base.otherText : null };
}

/** True when the selection satisfies the rulings well enough to count as answered. */
export function isFollowUpMcAnswerComplete(question: FollowUpQuestion, answer: FollowUpMcAnswer | null | undefined): boolean {
  if (!answer || answer.optionKeys.length === 0) {
    return false;
  }
  const other = optionOfKind(question, "other");
  if (other && answer.optionKeys.includes(other.key)) {
    return typeof answer.otherText === "string" && answer.otherText.trim().length > 0;
  }
  return true;
}

/**
 * Server-side validation of a raw client value against the rulings. Returns
 * the normalised answer (deduplicated keys in registry order, trimmed text).
 */
export function validateFollowUpMcAnswer(
  question: FollowUpQuestion,
  rawValue: unknown,
  required: boolean
): { ok: true; value: FollowUpMcAnswer } | { ok: false; error: string } {
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
    return { ok: false, error: "Expected a follow-up selection object" };
  }
  const raw = rawValue as { optionKeys?: unknown; otherText?: unknown };
  if (!Array.isArray(raw.optionKeys) || !raw.optionKeys.every((key) => typeof key === "string")) {
    return { ok: false, error: "Expected optionKeys to be an array of option keys" };
  }
  const known = new Set(question.options.map((option) => option.key));
  const unknownKeys = (raw.optionKeys as string[]).filter((key) => !known.has(key));
  if (unknownKeys.length > 0) {
    return { ok: false, error: `Unknown option key(s): ${unknownKeys.join(", ")}` };
  }
  const picked = new Set(raw.optionKeys as string[]);
  const optionKeys = question.options.filter((option) => picked.has(option.key)).map((option) => option.key);
  if (optionKeys.length === 0) {
    return required ? { ok: false, error: "Required follow-up selection is missing" } : { ok: true, value: { optionKeys: [], otherText: null } };
  }
  if (question.selectionMode === "SINGLE" && optionKeys.length > 1) {
    return { ok: false, error: "This question accepts a single option" };
  }
  const notSignificant = optionOfKind(question, "not_significant");
  if (notSignificant && optionKeys.includes(notSignificant.key) && optionKeys.length > 1) {
    return { ok: false, error: '"Not a significant issue here" cannot be combined with other options' };
  }
  const other = optionOfKind(question, "other");
  const otherSelected = other ? optionKeys.includes(other.key) : false;
  let otherText: string | null = null;
  if (otherSelected) {
    if (typeof raw.otherText !== "string" || raw.otherText.trim().length === 0) {
      return { ok: false, error: '"Other" requires a short answer' };
    }
    otherText = raw.otherText.trim();
    if (otherText.length > FIRM_FOLLOWUP_OTHER_MAX_LENGTH) {
      return { ok: false, error: `"Other" answer must be at most ${FIRM_FOLLOWUP_OTHER_MAX_LENGTH} characters` };
    }
  }
  return { ok: true, value: { optionKeys, otherText } };
}

export function isFollowUpMcAnswer(value: unknown): value is FollowUpMcAnswer {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { optionKeys?: unknown }).optionKeys) &&
    ((value as { optionKeys: unknown[] }).optionKeys as unknown[]).every((key) => typeof key === "string")
  );
}

/**
 * Option-frequency aggregate for insight / divergence / benchmark math over
 * AssessmentItemResponse-shaped rows. "Not a significant issue here", "Other",
 * rows with no optionKey (scored / legacy text rows) and unknown keys are
 * EXCLUDED — they are not signal about which named issue a firm faces, and a
 * write-in has no peer to compare against. The denominator returned per
 * question counts only the included picks, so a cohort where everyone said
 * "not an issue" aggregates to zero, not to a phantom leader.
 */
export function aggregateFollowUpOptionCounts(
  rows: ReadonlyArray<{ questionKey: string; optionKey: string | null }>
): Record<string, { counts: Record<string, number>; includedPicks: number; excludedPicks: number }> {
  const result: Record<string, { counts: Record<string, number>; includedPicks: number; excludedPicks: number }> = {};
  for (const row of rows) {
    const question = getFirmFollowUpQuestion(row.questionKey);
    if (!question) {
      continue;
    }
    const bucket = (result[row.questionKey] ??= { counts: {}, includedPicks: 0, excludedPicks: 0 });
    const option = row.optionKey ? optionByKey(question, row.optionKey) : null;
    if (!option || option.kind !== "choice") {
      bucket.excludedPicks += 1;
      continue;
    }
    bucket.counts[option.key] = (bucket.counts[option.key] ?? 0) + 1;
    bucket.includedPicks += 1;
  }
  return result;
}
