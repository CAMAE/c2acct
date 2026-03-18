import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sources = {
  SRC01: ["NASBA / AICPA / QAS CPE Standards", "https://www.nasbaregistry.org/sponsor/site/docs/CPEStandards.pdf"],
  SRC02: ["NASBA Fields of Study", "https://www.nasbaregistry.org/resources/fields-of-study"],
  SRC03: ["AACSB Business Accreditation Standards", "https://www.aacsb.edu/accredited/standards/business"],
  SRC04: ["NYSED Mandatory Continuing Education Q&A", "https://www.op.nysed.gov/professions/certified-public-accountants/mce-questions-answers"],
  SRC05: ["California Board CE Requirements", "https://www.dca.ca.gov/cba/licensees/ce-requirements.shtml"],
  SRC06: ["Virginia Board CPE Handout", "https://boa.virginia.gov/wp-content/uploads/2025/07/CPE-Informational-Handout.pdf"],
  SRC07: ["Illinois CPA CPE FAQs", "https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/faq/dpr/cpa-cpe-faqs-6-28-18.pdf"],
  SRC08: ["Texas CPE Guidelines", "https://www.tsbpa.texas.gov/php/fpl/options/CPEGuidelines.html"],
  SRC09: ["Florida CPE Guidelines", "https://www2.myfloridalicense.com/cpa/documents/CPEGuidelines.pdf"],
  SRC10: ["Rutgers Accounting Learning Goals", "https://myrbs.business.rutgers.edu/undergraduate-newark/accounting-minor"],
  SRC11: ["Rutgers Stackable Program", "https://www.business.rutgers.edu/stackable"],
  SRC12: ["Kelley Accounting Assessment", "https://kelley.iu.edu/about/directory/offices/instructional-consulting/assessment/accounting.html"],
  SRC13: ["GAO Green Book", "https://www.gao.gov/greenbook"],
  SRC14: ["NIST CSF 2.0", "https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20"],
  SRC15: ["CISA SBOM Guidance", "https://www.cisa.gov/sbom"],
  SRC16: ["SEC Cybersecurity Compliance Guidance", "https://www.sec.gov/corpfin/secg-cybersecurity"],
  SRC17: ["PCAOB QC 1000", "https://pcaobus.org/oversight/standards/qc-standards/details/qc-1000--a-firms-system-of-quality-control"],
  SRC18: ["Apple Creating Launchd Jobs", "https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html"],
  SRC19: ["IRS Recordkeeping Guidance", "https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping"],
};

const modules = [
  {
    slug: "module-1-governance-and-claim-boundaries",
    title: "Module 1: Governance, Claim Boundaries, and CPE-Ready Positioning",
    field: "Regulatory Ethics",
    focus: "Defines what the platform can claim, what evidence it needs, and why truth-in-claims is part of the learning architecture.",
    objectives: [
      "Distinguish internal professional learning from approved CPE sponsorship.",
      "Explain why claim boundaries are governance controls.",
      "Identify the minimum evidence posture for CPE-ready architecture.",
    ],
    topics: [
      ["Truthful claim posture", "SRC01", "AAE/C2Acct may be described as internal professional learning with CPE-ready architecture, but not as an approved CPE sponsor.", "State the platform posture as internal professional learning with evidence and configuration seams.", "A documented claim-boundary statement paired with source-mapped learning records.", "Misrepresentation of sponsor authority and erosion of institutional trust.", "Professional-learning systems lose credibility when claims exceed documented authority."],
      ["Sponsor-level controls", "SRC01", "CPE-oriented learning requires documented instructional standards, completion evidence, and retention discipline.", "Design completion, scoring, and evidence storage before making stronger external claims.", "A retained completion record with score, timestamp, source map, and assessment version.", "A learner can complete content without leaving audit-grade proof.", "Standards-based learning depends on records that can be defended after the event."],
      ["Official taxonomy", "SRC02", "Fields-of-study labels should follow official terminology rather than ad hoc naming.", "Map modules to NASBA-aligned fields before presenting them as professionally structured learning.", "A field-of-study matrix tied to module objectives and assessment records.", "Learning topics become difficult to classify, export, or govern across jurisdictions.", "Official taxonomy is the cleanest path to serious reporting and later state configuration."],
      ["Jurisdiction sensitivity", "SRC04", "Provider acceptance and subject treatment can vary by state board and by reporting path.", "Treat state recognition as a configurable layer instead of a universal system claim.", "State-specific metadata showing jurisdiction, field, and reporting assumptions.", "A one-size-fits-all claim can contradict a board-specific acceptance rule.", "State models can differ materially even when content overlaps."],
      ["Completion evidence", "SRC01", "Completion evidence is part of the learning product, not an administrative afterthought.", "Retain evidence artifacts at learner, module, quiz, and final-assessment levels.", "An exportable record linking learner, module outcome, score, and cited source basis.", "The system can report progress but cannot prove it later.", "If evidence is not retained with the event, later validation becomes fragile."],
    ],
  },
  {
    slug: "module-2-fields-state-boards-and-configuration",
    title: "Module 2: Fields of Study, State Boards, and Configuration Discipline",
    field: "Regulatory Ethics / Management Services",
    focus: "Explains why field tagging and state-board variability must be modeled explicitly if the learning layer is to remain honest and exportable.",
    objectives: [
      "Connect module design to official fields of study.",
      "Explain how state-board variability affects reporting and course claims.",
      "Identify evidence fields needed for jurisdiction-by-jurisdiction configuration.",
    ],
    topics: [
      ["New York concentration model", "SRC04", "New York distinguishes between concentrated subject-area reporting and mixed-hour reporting.", "Design learner records so concentrated and mixed tracks can be reported separately.", "A transcript-style export showing hours, field, and reporting path per module.", "Course history cannot be reorganized into the reporting structure the jurisdiction expects.", "State models can be operationally different even when the learning content overlaps."],
      ["California board-defined requirements", "SRC05", "California demonstrates that continuing-education compliance is board-defined rather than vendor-defined.", "Keep board-facing assumptions outside marketing language and inside explicit compliance configuration.", "A state-rule reference attached to module metadata rather than implied in the course title.", "The platform presents a course as accepted when the board has not accepted that claim.", "Board authority, not vendor preference, determines what can be represented to licensees."],
      ["Virginia documentation posture", "SRC06", "Virginia board guidance emphasizes documentation, carryforward treatment, and audit-facing readiness.", "Store records so carryforward, annual completion, and supporting evidence can be reconstructed later.", "Learner-level records preserving timestamps, completed content, and carryforward-relevant details.", "A learner may have creditable work but no supportable documentation trail.", "Recordkeeping needs are part of competence maintenance, not just back-office work."],
      ["Illinois renewal documentation", "SRC07", "Illinois illustrates that renewal documentation can require category and sponsor information beyond raw completion counts.", "Retain source titles, provider posture, and category metadata alongside scores.", "A source-coded completion record that can be translated into jurisdictional renewal support.", "Completion data exists but lacks the metadata required for renewal support.", "If metadata is missing, otherwise useful learning records become non-portable."],
      ["Texas and Florida category logic", "SRC08", "Texas and Florida show that technical classification, ethics treatment, and provider rules require explicit tracking.", "Separate core field tagging, ethics flags, and provider-status assumptions in the data model.", "A module profile containing field of study, ethics relevance, and jurisdiction notes.", "Technical, behavioral, or ethics content is reported inaccurately.", "Category treatment affects how a course can be counted and whether a learner can rely on it."],
    ],
  },
  {
    slug: "module-3-assurance-of-learning-and-institutional-design",
    title: "Module 3: Assurance of Learning and Institutional Design",
    field: "Management Services / Specialized Knowledge",
    focus: "Frames rigorous modular learning using AACSB and university models instead of lightweight engagement mechanics.",
    objectives: [
      "Explain why learning goals and assessment evidence belong together.",
      "Connect stackable learning design to serious professional education.",
      "Map module, quiz, and final layers to an assurance-of-learning model.",
    ],
    topics: [
      ["AACSB measurable outcomes", "SRC03", "AACSB-style learning design expects measurable outcomes, direct assessment, and continuous improvement.", "Define module objectives before finalizing questions, unlocks, or completion thresholds.", "A documented objective set tied to quiz and final-test evidence.", "Learners can finish modules without a defensible statement of what was actually learned.", "Outcomes and evidence must be linked if the program is meant to withstand institutional scrutiny."],
      ["Rutgers accounting learning goals", "SRC10", "Serious accounting learning models explicitly include communication, quantitative skill, ethics, and information-technology capability.", "Use multi-competency objectives instead of treating the curriculum as a single generic topic bucket.", "A coverage map showing which competencies each module and quiz addresses.", "The program appears narrow, under-specified, or unbalanced.", "Professional learning becomes more credible when it reflects recognizable accounting competencies."],
      ["Stackable module architecture", "SRC11", "Stackable design is credible when smaller learning units accumulate into a governed larger outcome.", "Require module completion, checkpoint quizzes, and a cumulative final before issuing a completion record.", "A progression map showing which completions unlock later stages.", "End-state recognition is issued without the evidence stack beneath it.", "A stack only works if each component is governed, scoped, and sequenced intentionally."],
      ["Assessment and competencies", "SRC12", "Student learning outcomes and competencies should be visible in the assessment design, not hidden behind completion counts.", "Tie each question cluster to a documented competency or field-of-study rationale.", "A source map and rationale set that explains why each question is present.", "The question bank looks broad but cannot defend its educational purpose.", "Assessment quality depends on fit between questions and intended outcomes."],
      ["Improvement-loop governance", "SRC03", "An accreditation-aligned learning system needs review loops, not static content dumps.", "Version modules and review outcomes so questions, thresholds, and source maps can be revised responsibly.", "A revision-aware content package with dated source references and version identifiers.", "Outdated content remains live with no audit trail for what changed or why.", "Continuous improvement is only real when changes can be traced and justified."],
    ],
  },
];

const moduleTail = [
  {
    slug: "module-4-firm-vendor-controls-and-operational-risk",
    title: "Module 4: Firm, Vendor, and Operational-Risk Controls",
    field: "Information Technology / Auditing / Management Services",
    focus: "Connects professional learning to the operational questions firms and vendors face in product evaluation, control design, and evidence quality.",
    objectives: [
      "Use official control and risk frameworks to structure firm and vendor learning.",
      "Distinguish evidence maturity from unsupported certification language.",
      "Connect workflow, governance, and transparency to product-intelligence reasoning.",
    ],
    topics: [
      ["Internal control objectives", "SRC13", "A control environment should support operations, reporting, and compliance rather than one dimension alone.", "Evaluate workflows against operational, reporting, and compliance implications together.", "A control review showing how the workflow affects operations, reporting, and compliance.", "A product appears efficient while degrading reporting integrity or compliance discipline.", "Control quality is multidimensional, so single-metric judgments are not enough."],
      ["Governance and cyber risk", "SRC14", "Cybersecurity governance should be treated as an organizational management issue, not only a technical feature checklist.", "Assess governance, risk ownership, and review cadence when evaluating product fit.", "A governance note that identifies owners, review cadence, and escalation paths.", "Risk management is outsourced to a vendor narrative with no governance evidence.", "Frameworks such as NIST stress governance because unmanaged technical controls do not stay effective."],
      ["Transparency and SBOM posture", "SRC15", "Software transparency strengthens evaluation by making dependencies and component exposure more visible.", "Treat transparency artifacts as evidence signals in vendor intelligence, even when they are not mandatory for every product.", "A product-evidence checklist that captures whether dependency and component transparency exists.", "Product evaluation overlooks hidden dependency concentration and supply-chain exposure.", "Visibility into software composition improves the quality of vendor-risk discussions."],
      ["Disclosure and governance expectations", "SRC16", "Governance and incident handling are part of a credible operational narrative for organizations exposed to cybersecurity risk.", "Ask whether the product and the firm can explain governance, materiality judgment, and incident escalation.", "A documented incident and governance workflow with named responsibilities.", "A serious incident occurs and the organization cannot explain how it was governed or escalated.", "Disclosure-oriented regimes reward evidence of governance, not just evidence of intent."],
      ["Quality control and remediation", "SRC17", "Quality control is stronger when findings, monitoring, and remediation are treated as a system rather than isolated events.", "Design insight and review workflows so findings can drive corrective action and follow-up.", "A remediation log tied to findings, owners, deadlines, and closure evidence.", "Issues are observed repeatedly without a durable remediation loop.", "Monitoring without remediation produces the appearance of oversight but not operational improvement."],
    ],
  },
  {
    slug: "module-5-delivery-evidence-and-automation-operations",
    title: "Module 5: Delivery, Evidence, and Automation Operations",
    field: "Information Technology / Regulatory Ethics",
    focus: "Translates the research and architecture into an execution model that can run headlessly, preserve evidence, and remain Mac mini friendly.",
    objectives: [
      "Explain why delivery infrastructure and evidence infrastructure belong together.",
      "Identify what must be retained for learner proof, operational proof, and review proof.",
      "Connect Mac mini automation practices to serious institutional operation.",
    ],
    topics: [
      ["Launchd-first automation", "SRC18", "macOS background automation should prefer launchd-oriented job design over ad hoc scheduling patterns.", "Package recurring jobs with explicit labels, logs, and non-interactive behavior suited to launchd.", "A launchd-ready job wrapper with stable label, stdout and stderr capture, and exit codes.", "Background execution becomes fragile, opaque, or host-specific.", "On macOS, operational reliability depends on using the platform-supported job model correctly."],
      ["Learning-evidence retention", "SRC01", "Completion records, source maps, and versioned assessments are part of the learning deliverable.", "Store learner evidence so it can be exported, audited, and reconciled to the active content version.", "A completion record linking learner, module, assessment version, source map, and score.", "The platform can show a badge but cannot defend why it was earned.", "A professional-learning result is only as strong as the evidence that explains it."],
      ["Institutional review loops", "SRC03", "Operational learning systems need review cadence, not only initial content publication.", "Set review checkpoints for content currency, source validity, and assessment performance.", "A dated review log showing when content, thresholds, and sources were revalidated.", "The corpus drifts away from the current standards it claims to reflect.", "Institutional credibility weakens when review is implied rather than documented."],
      ["Business recordkeeping", "SRC19", "Recordkeeping supports statements, operations, and compliance at the same time.", "Treat learning evidence as part of the platform's wider recordkeeping and reporting posture.", "Retention rules that specify what is stored, for how long, and why.", "Evidence is created but not retained long enough to support later operational or regulatory needs.", "Records matter because future review almost never occurs at the moment the activity happens."],
      ["Control-backed operations", "SRC13", "Operational controls should make failures visible early and support remediation before trust erodes.", "Monitor nightly learning jobs, export jobs, and verification jobs with structured status reporting.", "A job health record showing last run, outcome, retries, and next action.", "Automation silently degrades while the interface still implies system health.", "Controls are only effective if failure states become observable and actionable."],
    ],
  },
];

modules.push(...moduleTail);

const finalTopics = [
  ["Approval-status boundary", "Regulatory Ethics", "SRC01", "A platform can be CPE-ready in architecture while still not being an approved CPE sponsor.", "An operator wants to market the repo as approved continuing education because the records look formal.", "Use internal professional-learning and CPE-ready language while documenting the missing sponsor dependency.", "A public-facing claim statement that names the current posture and excludes sponsor approval language.", "Public claims outrun authority and expose the program to credibility damage.", "Architectural readiness and sponsor approval are not the same status."],
  ["Field-of-study discipline", "Information Technology / Management Services", "SRC02", "Official fields-of-study labels are the cleanest basis for organizing module metadata.", "A new module is being added for operational automation and product-evaluation workflow analysis.", "Assign official field tags and explain the rationale in the coverage matrix.", "A module profile that ties objectives, field tags, and question coverage together.", "The module cannot be mapped consistently across reporting contexts.", "Official taxonomy reduces ambiguity during export, review, and future state configuration."],
  ["State-board variation", "Regulatory Ethics", "SRC08", "State-board treatment of categories, ethics, and evidence can differ materially.", "A learner asks whether one course configuration automatically satisfies every board's documentation and ethics treatment.", "Explain the state-configurable posture and retain jurisdiction metadata rather than making a universal claim.", "A jurisdiction note linked to each course and completion record.", "Learners over-rely on a generic claim that a board may not accept.", "Board-specific rules change how otherwise similar content can be counted."],
  ["Assurance-of-learning logic", "Management Services", "SRC03", "Objectives, assessments, and review loops need to be explicitly connected.", "A learning package has many questions but no statement of what the modules are intended to teach.", "Publish measurable objectives and tie question clusters back to them.", "A module objective table and a question-to-outcome map.", "The package looks large but educationally ungoverned.", "Volume is not a substitute for assurance-of-learning structure."],
  ["Stackable progression", "Specialized Knowledge", "SRC11", "Stackable progression only works when prerequisite completion and cumulative evidence are enforced.", "A learner wants access to the final certificate without completing module checkpoints.", "Require the prerequisite sequence and preserve the progression record.", "A progression ledger showing reading completion, quiz passage, and final-test eligibility.", "End-state recognition is issued without the evidence stack beneath it.", "Stackable programs depend on controlled accumulation, not optional sequencing."],
  ["Internal control and evidence", "Auditing / Management Services", "SRC13", "Operational, reporting, and compliance objectives should be considered together in control design.", "A product improves workflow speed but weakens evidence retention and exception tracking.", "Assess operational benefit alongside reporting and compliance impact before treating the product as aligned.", "A control review that documents tradeoffs across all three objective areas.", "Efficiency gains mask evidence or compliance regression.", "A control decision is incomplete if it optimizes one objective by damaging another."],
  ["Governance of cyber and product risk", "Information Technology", "SRC14", "Risk governance should name owners, review cadence, and escalation paths.", "A vendor promises strong security but cannot identify who owns governance decisions or how exceptions are reviewed.", "Treat governance evidence as part of product-fit scoring rather than accepting feature claims alone.", "A governance record with roles, cadence, and escalation triggers.", "Control confidence is inferred from marketing language instead of governance evidence.", "Risk frameworks treat governance as a first-class control dimension."],
  ["Transparency and supply-chain visibility", "Information Technology", "SRC15", "Transparency artifacts improve product-intelligence quality even when they do not operate as blanket guarantees.", "Two vendors make similar control claims, but only one provides meaningful dependency and component transparency.", "Treat transparency as a material evidence signal in the evaluation record.", "A vendor-evidence sheet that captures transparency posture and supporting artifacts.", "Hidden dependency risk is ignored because the review model never asked for visibility.", "Evidence quality improves when component exposure can be examined rather than assumed."],
  ["Quality-control remediation", "Auditing", "SRC17", "Findings should drive remediation with ownership and closure evidence.", "The platform repeatedly surfaces the same operational weakness in reviews and verifications.", "Track ownership, deadline, remediation steps, and closure evidence for each finding.", "A remediation register tied to findings and follow-up status.", "Monitoring exists, but nothing proves that the issue was corrected.", "A mature control environment closes the loop from observation to corrective action."],
  ["Mac mini operational discipline", "Information Technology / Regulatory Ethics", "SRC18", "Mac mini automation should be headless, launchd-friendly, and evidence-producing rather than dependent on manual clicking.", "A nightly verification job works only when an operator manually opens a terminal and runs it interactively.", "Convert it into a non-interactive launchd-ready wrapper with logs, artifacts, and failure visibility.", "A scheduled job definition with stable label, log paths, and exit-code behavior.", "Verification posture depends on operator memory instead of controlled execution.", "Operational credibility improves when recurring evidence generation is automated and observable."],
];

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const sourceTitle = (code) => sources[code][0];
const sourceUrl = (code) => sources[code][1];
const write = (rel, content) => {
  const full = path.join(root, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
};
const options = (items) => items.map((item, i) => `${String.fromCharCode(65 + i)}) ${item}`).join(" ");

function makeQuestion(id, moduleTitle, field, sourceCode, prompt, answer, rationale, origin = "bank") {
  return { id, moduleTitle, field, sourceCode, prompt, answer, rationale, origin };
}

function makeTopicQuestions(module, topic, start) {
  const [title, sourceCode, principle, action, artifact, risk, why] = topic;
  const id = (n) => `Q${String(start + n).padStart(3, "0")}`;
  return [
    makeQuestion(id(0), module.title, module.field, sourceCode, `True or False: ${principle}`, "True", `${sourceTitle(sourceCode)} supports this statement directly, so True is the defensible answer.`),
    makeQuestion(id(1), module.title, module.field, sourceCode, `${title} scenario: ${why} Which response is most defensible? ${options(["Treat the issue as a design preference and leave it undocumented.", action, "Use stronger public claims now and add evidence later if someone asks.", "Hide the requirement behind internal convention with no learner-facing traceability."])}`, "B", `The source-backed response is the one that turns the principle into an explicit operating control: ${action}`),
    makeQuestion(id(2), module.title, module.field, sourceCode, `Which artifact best demonstrates disciplined execution of ${title.toLowerCase()}? ${options([artifact, "A visual status card with no underlying record.", "A one-time verbal explanation by an administrator.", "A generic marketing page with no source references."])}`, "A", `The strongest answer is the artifact that produces durable evidence: ${artifact}`),
    makeQuestion(id(3), module.title, module.field, sourceCode, `If ${title.toLowerCase()} is ignored, which risk is most likely? ${options(["Lower UI novelty but no governance impact.", risk, "Higher design flexibility with no evidence downside.", "A purely cosmetic reporting difference that never affects review."])}`, "B", `The cited source is trying to prevent the risk in option B: ${risk}`),
    makeQuestion(id(4), module.title, module.field, sourceCode, `Short answer: In one sentence, explain why this matters to the learning architecture: ${why}`, why, `A complete response should capture the operational importance identified in ${sourceTitle(sourceCode)}: ${why}`),
  ];
}

function makeFinalQuestions(theme, start) {
  const [title, field, sourceCode, principle, scenario, action, artifact, risk, why] = theme;
  const id = (n) => `F${String(start + n).padStart(3, "0")}`;
  return [
    makeQuestion(id(0), `Final Test: ${title}`, field, sourceCode, `True or False: ${principle}`, "True", `${sourceTitle(sourceCode)} supports this principle, so True is correct.`, "final-original"),
    makeQuestion(id(1), `Final Test: ${title}`, field, sourceCode, `${scenario} Which action is most defensible? ${options(["Escalate the claim or process first and work out the evidence later.", action, "Rely on implied approval because the structure appears formal.", "Treat the issue as too detailed to encode in the learning or operations model."])}`, "B", `The defensible answer is the one that operationalizes the principle in a controlled way: ${action}`, "final-original"),
    makeQuestion(id(2), `Final Test: ${title}`, field, sourceCode, `Which record would best support review of ${title.toLowerCase()}? ${options([artifact, "A verbal update with no stored evidence.", "A generic dashboard tile with no linked source or version data.", "A one-time screenshot with no context."])}`, "A", `The best record is the one that preserves durable evidence: ${artifact}`, "final-original"),
    makeQuestion(id(3), `Final Test: ${title}`, field, sourceCode, `What is the primary risk if the platform ignores ${title.toLowerCase()}? ${options(["More flexible copywriting with no downside.", risk, "Faster delivery with no governance tradeoff.", "Lower documentation effort and better institutional trust."])}`, "B", `The risk in option B is the risk the cited source is trying to prevent: ${risk}`, "final-original"),
    makeQuestion(id(4), `Final Test: ${title}`, field, sourceCode, `Short answer: Why does this matter in the platform's operating model? ${why}`, why, `A defensible response should restate the source-backed reason this theme matters: ${why}`, "final-original"),
  ];
}

function renderQuestionList(title, items) {
  return `# ${title}\n\n${items.map((q, i) => `${i + 1}. [${q.id}] ${q.prompt}\n   - Module: ${q.moduleTitle}\n   - Field of study: ${q.field}\n   - Source code: ${q.sourceCode}\n   - Source title: ${sourceTitle(q.sourceCode)}`).join("\n\n")}\n`;
}

const renderAnswerKey = (title, items) => `# ${title}\n\n${items.map((q) => `- ${q.id}: ${q.answer}\n  Rationale: ${q.rationale}`).join("\n")}\n`;
const renderSourceMap = (title, items) => `# ${title}\n\n${items.map((q) => `- ${q.id}: ${q.sourceCode} | ${sourceTitle(q.sourceCode)} | ${sourceUrl(q.sourceCode)} | Origin: ${q.origin}`).join("\n")}\n`;

function renderReadingModule(module, count) {
  const codes = [...new Set(module.topics.map((topic) => topic[1]))];
  return `# ${module.title}

## Position

This module is part of an internal professional-learning package. It is designed to be CPE-ready in architecture and accreditation-aligned in structure, but it does not claim approved CPE credit.

## Field of Study Focus

${module.field}

## Module Purpose

${module.focus}

## Learning Objectives

${module.objectives.map((item) => `- ${item}`).join("\n")}

## Key Topics

${module.topics.map(([title, sourceCode, principle, action, artifact, risk, why]) => `### ${title}
- Principle: ${principle}
- Operational implication: ${action}
- Required evidence artifact: ${artifact}
- Primary failure risk: ${risk}
- Why it matters: ${why}
- Source: ${sourceCode} | ${sourceTitle(sourceCode)} | ${sourceUrl(sourceCode)}`).join("\n\n")}

## Assessment Structure

- Reading completion is required before the quiz is treated as eligible.
- This module contributes ${count} source-backed question-bank items and 10 quiz items.
- Questions are tied to explicit topics rather than generic engagement prompts.

## Source List

${codes.map((code) => `- ${code}: ${sourceTitle(code)} | ${sourceUrl(code)}`).join("\n")}
`;
}

let cursor = 1;
const questionBank = [];
for (const module of modules) {
  for (const topic of module.topics) {
    const items = makeTopicQuestions(module, topic, cursor);
    questionBank.push(...items);
    cursor += items.length;
  }
}

const quizzes = modules.map((module, index) => ({
  file: `quiz-${index + 1}.md`,
  title: `${module.title} Quiz`,
  items: questionBank.filter((q) => q.moduleTitle === module.title).slice(0, 10),
}));

const finalCarryover = questionBank.slice(0, 25).map((q, i) => ({
  ...q,
  id: `F${String(i + 1).padStart(3, "0")}`,
  moduleTitle: "Final Test: Bank-Carryover",
  origin: `bank:${q.id}`,
}));

let finalCursor = 26;
const finalOriginal = [];
for (const theme of finalTopics) {
  const items = makeFinalQuestions(theme, finalCursor);
  finalOriginal.push(...items);
  finalCursor += items.length;
}
const finalTest = [...finalCarryover, ...finalOriginal];

write("content/user-learning/question-bank/question-bank.md", renderQuestionList("Question Bank", questionBank));
write("content/user-learning/question-bank/question-bank-answer-key.md", renderAnswerKey("Question Bank Answer Key", questionBank));
write("content/user-learning/question-bank/question-bank-source-map.md", renderSourceMap("Question Bank Source Map", questionBank));

for (const module of modules) {
  const count = questionBank.filter((q) => q.moduleTitle === module.title).length;
  write(path.join("content", "user-learning", "reading-material", `${module.slug}.md`), renderReadingModule(module, count));
}

const legacyReadingAliases = {
  "module-1-cpe-truth.md": "module-1-governance-and-claim-boundaries.md",
  "module-2-fields-of-study.md": "module-2-fields-state-boards-and-configuration.md",
  "module-3-state-boards.md": "module-2-fields-state-boards-and-configuration.md",
  "module-4-learning-design.md": "module-3-assurance-of-learning-and-institutional-design.md",
  "module-5-ops-and-evidence.md": "module-5-delivery-evidence-and-automation-operations.md",
};

for (const [legacyFile, canonicalFile] of Object.entries(legacyReadingAliases)) {
  write(
    path.join("content", "user-learning", "reading-material", legacyFile),
    `# Deprecated Reading Alias

This file is retained only to avoid silent path breakage from earlier generated content.

- Canonical file: ${canonicalFile}
- Status: deprecated for direct learning delivery
- Current package posture: internal professional learning, CPE-ready architecture, not approved CPE
`
  );
}

for (const quiz of quizzes) {
  write(path.join("content", "user-learning", "quizzes", quiz.file), renderQuestionList(quiz.title, quiz.items));
}

write("content/user-learning/final-test.md", renderQuestionList("Final Test", finalTest));
write("content/user-learning/final-test-answer-key.md", renderAnswerKey("Final Test Answer Key", finalTest));
write("content/user-learning/final-test-source-map.md", renderSourceMap("Final Test Source Map", finalTest));

write("content/user-learning/fields-of-study-mapping.md", `# Fields of Study Mapping

| Module | Primary field(s) | Source basis | Why the mapping fits |
| --- | --- | --- | --- |
${modules.map((module) => `| ${module.title} | ${module.field} | ${[...new Set(module.topics.map((topic) => topic[1]))].join(", ")} | ${module.focus} |`).join("\n")}

## Mapping posture

- The package uses official or official-adjacent fields of study where possible.
- The strongest current buckets are Regulatory Ethics, Management Services, Information Technology, Auditing, and Specialized Knowledge.
- This mapping supports internal professional learning and future state configuration; it does not claim automatic CPE acceptance.
`);

write("content/user-learning/grading-and-completion-model.md", `# Grading and Completion Model

## Completion posture

The package is structured as internal professional learning with CPE-ready evidence architecture. Completion status should therefore be rigorous enough for institutional review without claiming approved CPE credit.

## Thresholds

- Module quiz pass threshold: 80 percent
- Final-test pass threshold: 80 percent
- Required sequence: reading module, quiz, next module unlock, final test
- Recommended remediation trigger: any quiz score below 80 percent or any final-test score below 80 percent

## Evidence retained

- learner identity
- module identifier
- assessment version
- score
- pass or fail outcome
- completion timestamp
- question source map version
- review notes if remediation or exception workflow is used

## Grading model

- Quizzes confirm module comprehension and sequencing discipline.
- The final test confirms cumulative performance across governance, state-board variation, assurance-of-learning logic, operational controls, and automation evidence.
- A learner should not receive a completion record if sequence or evidence is incomplete even when raw answers are present.
`);

write("content/user-learning/unlock-design.md", `# Unlock Design

## Unlock posture

Unlocks should represent earned evidence, not decorative gamification.

## Sequence

1. Reading completion unlocks the module quiz.
2. Passing the module quiz unlocks the next module.
3. Completing all five module quizzes unlocks the final test.
4. Passing the final test unlocks the completion record and learner summary.

## Guardrails

- No module should unlock solely because a page was visited.
- No insight or badge should unlock without a recorded evidence event.
- Tier 1 unlocks may show earned progress; higher-order recognition should remain conditional on cumulative evidence.

## Evidence notes

- Every unlock event should be tied to a learner, assessment version, timestamp, and source-map version.
- Failed attempts should remain visible for support and remediation rather than being silently overwritten.
`);

write("content/user-learning/module-progression-map.md", `# Module Progression Map

| Order | Module | Purpose | Exit condition |
| --- | --- | --- | --- |
| 1 | ${modules[0].title} | Establish truthful claim boundaries and evidence posture | Pass quiz 1 |
| 2 | ${modules[1].title} | Establish field-of-study and state-configuration logic | Pass quiz 2 |
| 3 | ${modules[2].title} | Establish assurance-of-learning structure | Pass quiz 3 |
| 4 | ${modules[3].title} | Establish control, risk, and product-intelligence reasoning | Pass quiz 4 |
| 5 | ${modules[4].title} | Establish operational delivery and evidence discipline | Pass quiz 5 |
| 6 | Final Test | Confirm cumulative mastery across all five modules | Pass final test |

## Progression notes

- The order is intentional. Governance and claim posture come first so later modules do not drift into unsupported claims.
- State-board variability is placed before institutional-design work so the learner understands why configuration discipline matters.
- Control and automation modules come later because they assume earlier understanding of evidence, scope, and governance.
`);

write("content/user-learning/CONTENT_SUBSTANCE_AUDIT.md", `# Content Substance Audit

Accessed: 2026-03-16

## Verified in this pass

- The question bank contains ${questionBank.length} source-backed questions.
- There are exactly ${quizzes.length} quiz files.
- The final test contains ${finalTest.length} questions, including 25 bank-carryover items and ${finalOriginal.length} final-specific items.
- Every question has an answer-key entry and a source-map entry.
- Five reading modules exist and each is tied to explicit objectives, evidence artifacts, and cited sources.

## Quality improvements over the previous generated set

- Replaced repetitive generic prompt loops with topic-specific prompts.
- Expanded source coverage beyond a narrow small-source pattern.
- Added operational risk, control, and evidence themes so the package is useful for runtime delivery later.
- Strengthened grading, unlock, and progression documentation.

## Remaining truth boundary

- This remains an internal professional-learning package with CPE-ready architecture.
- It does not claim approved CPE sponsorship or automatic state-board acceptance.
`);

write("content/user-learning/COVERAGE_MATRIX.md", `# Coverage Matrix

| Module | Reading file | Quiz file | Question-bank count | Final-test count | Field(s) | Source codes |
| --- | --- | --- | --- | --- | --- | --- |
${modules.map((module, index) => {
  const bankCount = questionBank.filter((q) => q.moduleTitle === module.title).length;
  const carryoverCount = finalCarryover.filter((q) => questionBank.find((bank) => bank.id === q.origin.split(":")[1])?.moduleTitle === module.title).length;
  const finalOriginalCount = finalOriginal.filter((q) => q.moduleTitle.includes(module.title)).length;
  return `| ${module.title} | reading-material/${module.slug}.md | quizzes/quiz-${index + 1}.md | ${bankCount} | ${carryoverCount + finalOriginalCount} | ${module.field} | ${[...new Set(module.topics.map((topic) => topic[1]))].join(", ")} |`;
}).join("\n")}

## Final-test composition

- Bank-carryover items: 25
- Final-specific items: ${finalOriginal.length}
- Total final-test items: ${finalTest.length}
`);

console.log(JSON.stringify({ ok: true, questionBankCount: questionBank.length, quizCount: quizzes.length, finalTestCount: finalTest.length }, null, 2));
