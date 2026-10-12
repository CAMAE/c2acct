/**
 * In-code mirror of verticals/legal/pack.yaml `firmModules:` (legal-load, R64).
 *
 * The pack file is the source; this mirror exists so the filesystem-free readers
 * (lib/firmPat.ts reaches a client bundle) can resolve the legal words without a
 * pack loader. tests/legal-load-pack.contract.test.ts pins this object to the YAML
 * block field for field, so the two cannot drift. Generated 2026-10-11; regenerate
 * from the pack when the pack changes.
 */
import type { FirmModulesContent } from "@/lib/verticals/firmModules";

export const LEGAL_FIRM_MODULES: FirmModulesContent = Object.freeze({
  "operating-model": Object.freeze({
    description: "How matters move from intake to closing: conflicts check, matter opening, work assignment, docketing, draft review, time capture and billing, file closing and return.",
    summary: "Intake, conflicts and engagement; matter execution; time, billing and closing.",
    openEnded: Object.freeze([
      Object.freeze({ prompt: "Where does a matter most often stall between intake and closing, and which practice group feels it most?", placeholder: "Name the step where matters wait, and the group that feels it." }),
      Object.freeze({ prompt: "Which step in the life of a matter has no named owner today, and what breakdown has that caused?", placeholder: "Name the step, who assumes who owns it, and what has broken." }),
      Object.freeze({ prompt: "What matter-level metric or review would most improve operating discipline in the next 90 days?", placeholder: "Pick the one measure or review you would start first." }),
      Object.freeze({ prompt: "When a matter passes from intake staff to the responsible attorney, or from a drafting attorney to a reviewing partner, where does the work most often get redone, and why?", placeholder: "Describe the handoff and what gets redone." }),
      Object.freeze({ prompt: "What tool or operating support would help workflow discipline without disrupting how matters currently move?", placeholder: "Name the support and what it should stop interrupting." }),
    ]),
  }),
  "automation-ai": Object.freeze({
    description: "The work a firm can hand to software or to a generative AI tool and still meet its duties: intake questionnaires, engagement letters, document assembly, billing runs, e-signature, discovery review, research, summarization and first drafts.",
    summary: "Document and workflow automation; generative AI in legal work; policy, training and vendor terms.",
    openEnded: Object.freeze([
      Object.freeze({ prompt: "Which firm process is most ready for automation or AI support today, and what still blocks a safe rollout?", placeholder: "Name the process and the one thing still blocking a safe rollout." }),
      Object.freeze({ prompt: "Where would generative AI add the most value in your matters, and what verification and confidentiality guardrails would need to be in place first?", placeholder: "Name the use and the verification or confidentiality guardrail it needs first." }),
      Object.freeze({ prompt: "What matter data, template library or system prerequisite is still missing before automation could run repeatably across matters rather than one attorney at a time?", placeholder: "Name the data, template or system prerequisite still missing." }),
      Object.freeze({ prompt: "Which attorney, staff or partner-level barrier is most likely to slow adoption of automation here?", placeholder: "Describe the barrier and how it shows up today." }),
      Object.freeze({ prompt: "What evidence would the partners or management committee need to see before expanding AI use beyond a pilot?", placeholder: "Describe the evidence the partners would need to see." }),
    ]),
  }),
  "data-flow": Object.freeze({
    description: "How matter, client, financial and document data move between the systems a firm runs: intake and conflicts database, matter management, document management, time and billing, trust accounting, e-signature, client portal, e-discovery, court e-filing, email and office suite.",
    summary: "Matter master data and system of record; financial data flow; document, evidence and client-facing flow.",
    openEnded: Object.freeze([
      Object.freeze({ prompt: "Which handoff between systems creates the biggest delay or data error today?", placeholder: "Name the two systems and the delay or error the handoff creates." }),
      Object.freeze({ prompt: "Where do you stop trusting the numbers most often today?", placeholder: "Name the number and why you stop trusting it." }),
      Object.freeze({ prompt: "Which integration dependency is most likely to break reporting or a deadline if it fails?", placeholder: "Name the dependency and the report or deadline it would break." }),
      Object.freeze({ prompt: "What visibility gap most limits operational control right now?", placeholder: "Describe what leaders cannot see clearly enough today." }),
      Object.freeze({ prompt: "What one change would most improve continuity of matter data across the firm's tools, offices or practice groups?", placeholder: "Pick the one change with the highest payoff for matter data continuity." }),
    ]),
  }),
  "governance": Object.freeze({
    description: "The controls a firm relies on to protect client money, client information and its license to practice: trust accounting, conflicts, calendaring, supervision of lawyers and staff, information security, incident response and vendor oversight.",
    summary: "Trust accounting and financial controls; information security, confidentiality and incident response; supervision, conflicts and vendor oversight.",
    openEnded: Object.freeze([
      Object.freeze({ prompt: "Which approval or review step slows work most while returning the least risk reduction?", placeholder: "Describe the step, why it feels heavy and what it protects today." }),
      Object.freeze({ prompt: "Which control or vendor evidence is hardest to obtain or keep current?", placeholder: "Name the evidence and what makes it hard to obtain or keep current." }),
      Object.freeze({ prompt: "Which trust accounting, conflicts, or supervision control most often depends on one person remembering to do it, and what happens when that person is out?", placeholder: "Name the control, the person it depends on and what happens when they are out." }),
      Object.freeze({ prompt: "Which failure scenario concerns firm leadership most right now?", placeholder: "Describe the scenario and why it matters to leadership." }),
      Object.freeze({ prompt: "What would most increase the partners' trust in a new vendor or tool that touches client files or trust funds?", placeholder: "Describe the evidence, term or safeguard that would matter most." }),
    ]),
  }),
  "strategy": Object.freeze({
    description: "How the firm decides where it is going and whether its people will move: pricing and fee model, practice mix, growth, technology budget, training, and the response to what clients ask for.",
    summary: "Strategic direction and pricing model; change management, training and adoption; client and market alignment.",
    openEnded: Object.freeze([
      Object.freeze({ prompt: "Which strategic priority is hardest to turn into day-to-day matter work, and why?", placeholder: "Name the priority and where it breaks down in matter work." }),
      Object.freeze({ prompt: "Where do change efforts lose traction most often in this firm?", placeholder: "Name the point in the change cycle where momentum drops." }),
      Object.freeze({ prompt: "What client or market pressure is forcing the biggest reprioritization right now?", placeholder: "Describe the pressure and how it is changing decisions now." }),
      Object.freeze({ prompt: "What risk is most likely to cause the firm's current technology or change plan to miss expectations?", placeholder: "Name the risk with the highest near-term consequence." }),
      Object.freeze({ prompt: "What signal would tell you the firm is ready for deeper PAT insight use, broader change or faster execution?", placeholder: "Describe the concrete signal you would look for." }),
    ]),
  }),
});
