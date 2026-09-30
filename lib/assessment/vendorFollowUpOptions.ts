/**
 * Vendor product follow-up multiple-choice option sets — versioned registry
 * (vendor-followup-mc box, 2026-09-30). Source of truth for the copy is Mythos's
 * option file at docs/assessment/vendor-followup-mc-options-2026-09-30.md
 * (sha256 05375dc5a8383f8ca8f1deb520960e17bf80de0ce41068b7f0654fcf145ac726); every label and consequence
 * clause below is verbatim from it (the contract test re-parses the file and
 * compares). The registry's `stem` is the file's "Stem as built (adaptive)" line;
 * the runtime replaces it with the adaptive prompt the vendor actually sees
 * (lib/assessment/vendorFollowUpMcRuntime.ts), so the option set is fixed per
 * key while the stem is not.
 *
 * Rulings carried from the firm sets: SINGLE for questions 1 to 6 and 10, MULTI
 * for 7 to 9 (VENDOR_FOLLOWUP_MULTI_QUESTION_KEYS); "Not a significant issue
 * here" is exclusive in both modes; "Other" requires a short answer of at most
 * VENDOR_FOLLOWUP_OTHER_MAX_LENGTH characters and may combine with picks in
 * MULTI; picks of kind none or other never count in aggregates. Option keys are
 * stable slugs prod.q<n>.<a-f>, prod.q<n>.none, prod.q<n>.other. questionKey is
 * the open-ended question key in product_open_ended_v1 (the last "__" segment of
 * the runtime question id), which is how the flag-on runtime finds the set.
 *
 * Types are the firm registry's (FollowUpOption, FollowUpQuestion): one shape,
 * two registries. Nothing in this module reads the flag. Options live here,
 * never in JSX.
 */
import type { FollowUpOption, FollowUpQuestion } from "@/lib/assessment/firmFollowUpOptions";

export const VENDOR_FOLLOWUP_MC_VERSION = 1;
export const VENDOR_FOLLOWUP_OTHER_MAX_LENGTH = 280;
export const VENDOR_FOLLOWUP_MODULE_KEY = "vendor_product_alignment_v1";
export const VENDOR_FOLLOWUP_SECTION_KEY = "product_open_ended_v1";
export const VENDOR_FOLLOWUP_OPTIONS_SHA256 = "05375dc5a8383f8ca8f1deb520960e17bf80de0ce41068b7f0654fcf145ac726";

export const VENDOR_FOLLOWUP_MULTI_QUESTION_KEYS = [
  "best_fit_customer",
  "poor_fit_customer",
  "evidence_needed_next",
] as const;

export const VENDOR_FOLLOWUP_MC_QUESTIONS: readonly FollowUpQuestion[] = Object.freeze([
  {
    questionKey: "strongest_workflow",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 1,
    selectionMode: "SINGLE",
    stem: "PAT names the strongest section and asks what evidence supports that read.",
    hint: null,
    options: [
      { key: "prod.q1.a", letter: "a", kind: "choice", label: "Daily use by the people who own the work.", consequence: "adoption is proven by routine use, not by a rollout date." },
      { key: "prod.q1.b", letter: "b", kind: "choice", label: "Fewer exceptions and reworks in that workflow.", consequence: "the process runs without side spreadsheets or manual fixes." },
      { key: "prod.q1.c", letter: "c", kind: "choice", label: "Status and reporting are visible without asking.", consequence: "managers and partners see readiness without chasing staff." },
      { key: "prod.q1.d", letter: "d", kind: "choice", label: "Firms renew and expand in that workflow.", consequence: "retention and seat growth are the evidence, not claims." },
      { key: "prod.q1.e", letter: "e", kind: "choice", label: "Measured time or cost saved in that workflow.", consequence: "a number a firm can check, with a before and after." },
      { key: "prod.q1.f", letter: "f", kind: "choice", label: "Reference firms will speak to it.", consequence: "buyers can verify the read with a peer, which shortens decisions." },
      { key: "prod.q1.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q1.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "weakest_workflow",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 2,
    selectionMode: "SINGLE",
    stem: "PAT names the weakest section and asks what gap or limit drives it.",
    hint: null,
    options: [
      { key: "prod.q2.a", letter: "a", kind: "choice", label: "Edge cases still handled outside the product.", consequence: "exceptions leak into email, spreadsheets, or manual entry." },
      { key: "prod.q2.b", letter: "b", kind: "choice", label: "Setup depends on the vendor or a consultant.", consequence: "firms cannot configure it themselves, so changes wait." },
      { key: "prod.q2.c", letter: "c", kind: "choice", label: "Reporting does not answer the questions firms ask.", consequence: "staff export and rebuild reports elsewhere." },
      { key: "prod.q2.d", letter: "d", kind: "choice", label: "Frontline staff avoid it or work around it.", consequence: "usage is thin below the sponsor who bought it." },
      { key: "prod.q2.e", letter: "e", kind: "choice", label: "Slow or inconsistent performance under load.", consequence: "peak season exposes the limit when it matters most." },
      { key: "prod.q2.f", letter: "f", kind: "choice", label: "Thin evidence, few firms have used it long enough.", consequence: "the read is early, not necessarily wrong." },
      { key: "prod.q2.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q2.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "implementation_risk",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 3,
    selectionMode: "SINGLE",
    stem: "PAT names the implementation pressure point and asks for the most material rollout risk.",
    hint: null,
    options: [
      { key: "prod.q3.a", letter: "a", kind: "choice", label: "Data migration from the prior system.", consequence: "history, mappings, and balances arrive late or wrong." },
      { key: "prod.q3.b", letter: "b", kind: "choice", label: "Configuration takes specialist time.", consequence: "go-live slips because setup depends on scarce people." },
      { key: "prod.q3.c", letter: "c", kind: "choice", label: "Integration setup with the firm's core stack.", consequence: "the product runs, but the flow around it does not." },
      { key: "prod.q3.d", letter: "d", kind: "choice", label: "Firm-side ownership is unclear.", consequence: "nobody at the firm owns decisions, so the rollout stalls." },
      { key: "prod.q3.e", letter: "e", kind: "choice", label: "Timing against busy season.", consequence: "a rollout that crosses tax or audit season loses momentum." },
      { key: "prod.q3.f", letter: "f", kind: "choice", label: "Training and onboarding load.", consequence: "staff are live before they are ready and revert to old habits." },
      { key: "prod.q3.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q3.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "change_management_risk",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 4,
    selectionMode: "SINGLE",
    stem: "PAT names the adoption pressure point and the declared buyer, and asks which change-management risk slows adoption most.",
    hint: null,
    options: [
      { key: "prod.q4.a", letter: "a", kind: "choice", label: "Partner or owner buy-in is uneven.", consequence: "the product is optional in practice, so use stays partial." },
      { key: "prod.q4.b", letter: "b", kind: "choice", label: "Staff prefer the old workflow.", consequence: "two ways of working run side by side and the new one loses." },
      { key: "prod.q4.c", letter: "c", kind: "choice", label: "The buyer and the user are different people.", consequence: "what was sold is not what the desk needs, so use fades." },
      { key: "prod.q4.d", letter: "d", kind: "choice", label: "Client-facing change.", consequence: "clients must do something new, which the firm hesitates to ask." },
      { key: "prod.q4.e", letter: "e", kind: "choice", label: "No internal champion after go-live.", consequence: "questions have nowhere to go and use decays quietly." },
      { key: "prod.q4.f", letter: "f", kind: "choice", label: "Change lands during peak season.", consequence: "nobody has time to learn, so adoption waits a year." },
      { key: "prod.q4.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q4.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "integration_gap",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 5,
    selectionMode: "SINGLE",
    stem: "PAT names the integration pressure point and the declared integration posture, and asks which gap matters most.",
    hint: null,
    options: [
      { key: "prod.q5.a", letter: "a", kind: "choice", label: "No integration with the firm's general ledger or practice system.", consequence: "double entry and reconciliation stay manual." },
      { key: "prod.q5.b", letter: "b", kind: "choice", label: "One-way sync only.", consequence: "changes made downstream never come back, so records drift." },
      { key: "prod.q5.c", letter: "c", kind: "choice", label: "No open API or export path.", consequence: "the firm cannot get its own data out or connect anything new." },
      { key: "prod.q5.d", letter: "d", kind: "choice", label: "Document and e-signature flow is separate.", consequence: "files live in two places and staff re-attach." },
      { key: "prod.q5.e", letter: "e", kind: "choice", label: "Identity and access are not integrated.", consequence: "separate logins and permissions, which admins avoid managing." },
      { key: "prod.q5.f", letter: "f", kind: "choice", label: "Integration exists but breaks or lags.", consequence: "staff stop trusting the sync and re-key to be safe." },
      { key: "prod.q5.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q5.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "control_concern",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 6,
    selectionMode: "SINGLE",
    stem: "PAT names the control pressure point and asks which control, approval, auditability, or governance concern needs follow-up.",
    hint: null,
    options: [
      { key: "prod.q6.a", letter: "a", kind: "choice", label: "Approval steps can be skipped or overridden.", consequence: "sign-off is a suggestion, not a control." },
      { key: "prod.q6.b", letter: "b", kind: "choice", label: "Audit trail is incomplete or hard to read.", consequence: "who changed what, and when, is not answerable." },
      { key: "prod.q6.c", letter: "c", kind: "choice", label: "Role and permission model is too coarse.", consequence: "staff see or edit more than their role should." },
      { key: "prod.q6.d", letter: "d", kind: "choice", label: "Client data handling is not documented.", consequence: "firms cannot answer their own security questionnaire about it." },
      { key: "prod.q6.e", letter: "e", kind: "choice", label: "No independent security attestation.", consequence: "the firm's governance review has nothing to rely on." },
      { key: "prod.q6.f", letter: "f", kind: "choice", label: "Retention and deletion are not controllable.", consequence: "records outlive policy or vanish before it." },
      { key: "prod.q6.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q6.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "best_fit_customer",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 7,
    selectionMode: "MULTI",
    stem: "PAT names the strongest feature read and the declared target customer, and asks which firm size and type fit best today.",
    hint: null,
    options: [
      { key: "prod.q7.a", letter: "a", kind: "choice", label: "Solo and small firms, 1 to 5 people.", consequence: "simple setup and low admin matter more than depth." },
      { key: "prod.q7.b", letter: "b", kind: "choice", label: "Small firms, 6 to 20 people.", consequence: "one owner decides and staff adopt quickly if it saves time." },
      { key: "prod.q7.c", letter: "c", kind: "choice", label: "Mid-size firms, 21 to 100 people.", consequence: "multiple partners, defined roles, and an admin who configures." },
      { key: "prod.q7.d", letter: "d", kind: "choice", label: "Large regional firms, 101 to 500 people.", consequence: "integration and permissions decide fit, not features." },
      { key: "prod.q7.e", letter: "e", kind: "choice", label: "National and Top 100 firms, over 500 people.", consequence: "procurement, security review, and rollout at scale." },
      { key: "prod.q7.f", letter: "f", kind: "choice", label: "Client accounting and advisory practices of any size.", consequence: "recurring monthly work, high transaction volume." },
      { key: "prod.q7.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q7.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "poor_fit_customer",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 8,
    selectionMode: "MULTI",
    stem: "PAT names the weakest feature read and the declared operating-model fit, and asks who is the poorest fit today and why.",
    hint: null,
    options: [
      { key: "prod.q8.a", letter: "a", kind: "choice", label: "Solo and small firms, 1 to 5 people.", consequence: "setup and cost outweigh the benefit at that size." },
      { key: "prod.q8.b", letter: "b", kind: "choice", label: "Small firms, 6 to 20 people.", consequence: "needs an admin the firm does not have." },
      { key: "prod.q8.c", letter: "c", kind: "choice", label: "Mid-size firms, 21 to 100 people.", consequence: "multi-partner workflow and role needs exceed the product." },
      { key: "prod.q8.d", letter: "d", kind: "choice", label: "Large regional firms, 101 to 500 people.", consequence: "integration and permission gaps block rollout." },
      { key: "prod.q8.e", letter: "e", kind: "choice", label: "National and Top 100 firms, over 500 people.", consequence: "security, procurement, and scale requirements not met." },
      { key: "prod.q8.f", letter: "f", kind: "choice", label: "Firms outside the declared service mix (for example audit-led when built for tax).", consequence: "the workflow does not match." },
      { key: "prod.q8.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q8.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "evidence_needed_next",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 9,
    selectionMode: "MULTI",
    stem: "PAT names partial coverage or the weakest section and asks what evidence would most improve confidence.",
    hint: null,
    options: [
      { key: "prod.q9.a", letter: "a", kind: "choice", label: "Firm reviews from the target segment.", consequence: "the firm-reviewed column next to the self-report." },
      { key: "prod.q9.b", letter: "b", kind: "choice", label: "Implementation outcomes with dates.", consequence: "planned versus actual go-live, and what slipped." },
      { key: "prod.q9.c", letter: "c", kind: "choice", label: "Integration proof with the common stacks.", consequence: "named systems, direction of sync, and failure handling." },
      { key: "prod.q9.d", letter: "d", kind: "choice", label: "Independent security or control attestation.", consequence: "something a firm's governance review can rely on." },
      { key: "prod.q9.e", letter: "e", kind: "choice", label: "Usage and adoption data below the sponsor.", consequence: "who actually uses it, how often, and where use stops." },
      { key: "prod.q9.f", letter: "f", kind: "choice", label: "Measured time or cost outcomes.", consequence: "a before and after a firm can check." },
      { key: "prod.q9.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q9.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
  {
    questionKey: "recommended_next_action",
    moduleKey: VENDOR_FOLLOWUP_MODULE_KEY,
    moduleSectionKey: VENDOR_FOLLOWUP_SECTION_KEY,
    pillar: "Product",
    index: 10,
    selectionMode: "SINGLE",
    stem: "PAT states its suggested next action from the strongest and weakest sections and asks for the single most sensible next step.",
    hint: null,
    options: [
      { key: "prod.q10.a", letter: "a", kind: "choice", label: "Gather evidence.", consequence: "invite firms to review before changing anything." },
      { key: "prod.q10.b", letter: "b", kind: "choice", label: "Narrow scope.", consequence: "lead with the strongest workflow and stop claiming the rest for now." },
      { key: "prod.q10.c", letter: "c", kind: "choice", label: "Reposition.", consequence: "change the declared target customer or operating-model fit to match the evidence." },
      { key: "prod.q10.d", letter: "d", kind: "choice", label: "Fix implementation.", consequence: "shorten setup and migration before the next cohort." },
      { key: "prod.q10.e", letter: "e", kind: "choice", label: "Close the integration gap.", consequence: "build or repair the sync that firms name first." },
      { key: "prod.q10.f", letter: "f", kind: "choice", label: "Continue.", consequence: "the evidence supports the current position; keep collecting reviews." },
      { key: "prod.q10.none", letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null },
      { key: "prod.q10.other", letter: "h", kind: "other", label: "Other (short answer)", consequence: null },
    ],
  },
] satisfies readonly FollowUpQuestion[]);

const QUESTION_BY_KEY: ReadonlyMap<string, FollowUpQuestion> = new Map(
  VENDOR_FOLLOWUP_MC_QUESTIONS.map((question) => [question.questionKey, question])
);

export function getVendorFollowUpQuestion(questionKey: string): FollowUpQuestion | null {
  return QUESTION_BY_KEY.get(questionKey) ?? null;
}

/** The runtime question id ends in "__<questionKey>"; the bare key is accepted too. */
export function getVendorFollowUpQuestionForId(questionId: string): FollowUpQuestion | null {
  const parts = questionId.split("__");
  return getVendorFollowUpQuestion(parts[parts.length - 1] ?? questionId);
}

export function isVendorFollowUpOption(option: Pick<FollowUpOption, "key">): boolean {
  return option.key.startsWith("prod.q");
}

