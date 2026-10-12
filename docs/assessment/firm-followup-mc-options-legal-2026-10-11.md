# PATALIGN legal channel: firm follow-up option sets (v1)

Date: 2026-10-11. Author: Mythos. Source stems: PATALIGN-LEGAL-CHANNEL-FIRM-PACK-2026-09-29.md section 4 (25 open-ended questions, five per module, mapped one to one to the accounting questions). Pattern: docs/assessment/firm-followup-mc-options-2026-09-04.md (Leslie's accounting sets) and lib/assessment/firmFollowUpOptions.ts. Every question has six choices (a to f) with a short consequence clause, then "Not a significant issue here" (exclusive) and "Other (short answer)". Selection mode mirrors accounting: MULTI for operating-model_open_2, operating-model_open_5, automation-ai_open_3, automation-ai_open_4, data-flow_open_2, governance_open_3; SINGLE for the other nineteen. Option keys: <module>.q<n>.<a-f>, .none, .other with module prefixes ops, auto, int, gov, strat, channel legal. No vendor names in any stem or option. No em dashes. Cam approves after a domain read (no signatures, ruling 2026-10-06).

## Operating Model and Workflow Discipline (ops)

1. Where does a matter most often stall between intake and closing, and which practice group feels it most? (SINGLE)
a. Conflicts clearance: the matter waits on a search or a sign-off before anyone can act
b. Engagement letter: the matter is open in practice before the letter and fee terms are signed
c. Docketing: deadlines are calendared late or by hand, so work starts behind
d. Draft review: partner review queues hold finished drafts for days
e. Billing: time is captured late, so invoices slip and the matter lingers unbilled
f. File closing: closed matters sit open, so conflicts and retention clocks never start

2. Which step in the life of a matter has no named owner today, and what breakdown has that caused? (MULTI)
a. Calendaring a court or limitation deadline: the attorney assumes staff did it and staff assume the attorney did
b. Sending the engagement letter: the matter starts without scope or fee terms on file
c. Running the conflicts check on new parties: a late-added party surfaces a conflict mid-matter
d. Closing the file: nobody confirms the trust balance is zero and the file is archived
e. Responding to client status requests: the client hears nothing until someone notices
f. Tracking unbilled time by matter: write-offs appear at invoice time with no warning

3. What matter-level metric or review would most improve operating discipline in the next 90 days? (SINGLE)
a. Open matters by responsible attorney: shows load and stalls at a glance
b. Unbilled time by matter: catches lockup before it becomes a write-off
c. Aged receivables by attorney: puts collection where the relationship is
d. A missed or near-missed deadline log: turns scares into process fixes
e. Days from intake to engagement letter: measures the front door
f. Trust reconciliation completion by month: proves the control ran, not just that it exists

4. When a matter passes from intake staff to the responsible attorney, or from a drafting attorney to a reviewing partner, where does the work most often get redone, and why? (SINGLE)
a. Intake to attorney: facts and documents gathered at intake are re-asked of the client
b. Drafting attorney to partner: the partner rewrites rather than redlines, so the draft starts over
c. Attorney to paralegal: instructions are verbal, so the work product misses the point
d. Office to office or group to group: each uses its own template, so the second group reformats
e. Attorney to billing: narratives are rewritten to pass outside counsel guidelines
f. Associate to associate at handover: the matter history lives in one person's inbox

5. What tool or operating support would help workflow discipline without disrupting how matters currently move? (MULTI)
a. Docketing with rules-based deadline calculation: removes hand calendaring
b. Document assembly for engagement letters and routine filings: removes retyping
c. Time capture that runs while you work: removes end-of-day reconstruction
d. Structured intake forms that feed the conflicts check: removes re-asking
e. A matter status dashboard for partners: removes the status-check email
f. A checklist-driven file closing routine: removes the open-forever file

## Automation and AI Readiness (auto)

1. Which firm process is most ready for automation or AI support today, and what still blocks a safe rollout? (SINGLE)
a. Intake questionnaires: ready, blocked by no structured intake form
b. Engagement letters: ready, blocked by too many letter variants
c. Routine document assembly: ready, blocked by templates that live on individual desktops
d. Billing runs and narrative cleanup: ready, blocked by outside counsel guideline variety
e. Discovery review: ready, blocked by confidentiality and vendor terms not yet settled
f. Legal research first pass: ready, blocked by verification duties not yet assigned

2. Where would generative AI add the most value in your matters, and what verification and confidentiality guardrails would need to be in place first? (SINGLE)
a. Research memos: value high, needs citation verification by a licensed attorney before use
b. First drafts of routine documents: value high, needs a reviewing attorney on every draft
c. Summarizing depositions, records or productions: value high, needs a no-client-data rule for public tools
d. Document review and privilege screening: value high, needs a sampling check and a log
e. Client communications drafting: value moderate, needs partner review and a disclosure rule
f. Time narrative drafting: value moderate, needs a billing partner check against guidelines

3. What matter data, template library or system prerequisite is still missing before automation could run repeatably across matters rather than one attorney at a time? (MULTI)
a. One approved template library with an owner
b. Consistent matter and client fields in the practice management system
c. A written AI use policy that says what tools and what data
d. Document management that every attorney actually files into
e. Structured intake data rather than free-text notes
f. A clear rule for which matters allow AI assistance and which do not

4. Which attorney, staff or partner-level barrier is most likely to slow adoption of automation here? (MULTI)
a. No time to learn while meeting billable targets
b. Billable-hour incentives that penalize faster work
c. Confidentiality concerns about where client data goes
d. Partners who prefer the way they have always drafted
e. Staff who fear being replaced rather than redeployed
f. No named sponsor once the pilot ends

5. What evidence would the partners or management committee need to see before expanding AI use beyond a pilot? (SINGLE)
a. Verified output quality on a sample reviewed by a partner
b. Client consent or disclosure handled under the engagement terms
c. Measured hours saved per matter type
d. Lockup or realization improved on pilot matters
e. A vendor security review completed and on file
f. A documented verification step that survived a bar-guidance check

## Integration and Data Flow Maturity (int)

1. Which handoff between systems creates the biggest delay or data error today? (SINGLE)
a. Intake to the conflicts database: new parties never reach the search
b. Time entry to billing: entries arrive late or against the wrong matter
c. Billing to the trust ledger: disbursements and deposits post out of order
d. Court e-filing to the docket: filed dates and deadlines are keyed twice
e. Document management to email: the latest version is in an inbox, not the file
f. Practice management to accounting: matter financials disagree with the books

2. Where do you stop trusting the numbers most often today? (MULTI)
a. Trust ledger against the bank statement: reconciling items sit unresolved
b. Unbilled time by matter: entries missing or misallocated
c. Conflicts search results: party names and aliases incomplete
d. Docket dates: the calendar and the court record disagree
e. Aged receivables: write-offs and credits not applied
f. Matter budgets against actuals: no one updates the budget after kickoff

3. Which integration dependency is most likely to break reporting or a deadline if it fails? (SINGLE)
a. Practice management to accounting: month-end stops
b. Document management to email: the file goes dark
c. E-discovery platform to the review team: production deadlines slip
d. Client portal to the matter file: client uploads never reach the matter
e. Docketing to the attorney calendar: a deadline exists in one place only
f. Time capture to billing: the invoice run waits on a sync

4. What visibility gap most limits operational control right now? (SINGLE)
a. Matter status by responsible attorney
b. Aged receivables by responsible attorney
c. Discovery production status by matter
d. Trust balances by client and matter
e. Unbilled time and lockup by practice group
f. Deadlines due in the next 30 days firm-wide

5. What one change would most improve continuity of matter data across the firm's tools, offices or practice groups? (SINGLE)
a. One matter number used by every system
b. One document management system every office files into
c. One intake form that feeds conflicts, matter setup and the engagement letter
d. One docket that every attorney's calendar reads from
e. Field-level standards for client and party names
f. A named data owner per system with a monthly check

## Governance, Controls and Vendor Risk (gov)

1. Which approval or review step slows work most while returning the least risk reduction? (SINGLE)
a. Conflict clearance sign-off on matters with no new parties
b. Engagement letter approval on standard-form engagements
c. Trust disbursement approval queue when the signer is unavailable
d. Outgoing document review on routine correspondence
e. New vendor approval for low-risk tools with no client data
f. Expense approval below a sensible threshold

2. Which control or vendor evidence is hardest to obtain or keep current? (SINGLE)
a. Monthly three-way trust reconciliations completed and signed on time
b. Vendor security terms and breach notification commitments in writing
c. Client security questionnaires answered consistently
d. Incident response plan tests with a record of the test
e. Access reviews for departed staff and lateral hires
f. Business associate or confidentiality terms with every vendor touching client files

3. Which trust accounting, conflicts, or supervision control most often depends on one person remembering to do it, and what happens when that person is out? (MULTI)
a. The monthly trust reconciliation: it slips a month and reconciling items pile up
b. The conflicts check on a new party mid-matter: the check is skipped
c. Supervision of non-lawyer staff on client communications: the review does not happen
d. Deadline double-check before filing: the second set of eyes is the same person
e. Vendor access removal at offboarding: the account stays open
f. Retention and destruction of closed files: nothing is destroyed on schedule

4. Which failure scenario concerns firm leadership most right now? (SINGLE)
a. Ransomware locking matter files
b. A missed filing or limitation deadline
c. A trust account shortfall or misapplied disbursement
d. A lateral hire's conflict surfacing after the matter opened
e. A confidentiality breach through a vendor or an AI tool
f. A key person leaving with the only knowledge of a control

5. What would most increase the partners' trust in a new vendor or tool that touches client files or trust funds? (SINGLE)
a. A completed security questionnaire with evidence, not assertions
b. Confidentiality and breach notice terms in the contract
c. Data return and deletion on termination, in writing
d. A peer firm reference of similar size and practice
e. A bar or ethics opinion that addresses the tool's use
f. A trial period with the firm's own data walled from the vendor's training

## Strategy, Change Readiness and Market Alignment (strat)

1. Which strategic priority is hardest to turn into day-to-day matter work, and why? (SINGLE)
a. Alternative fee arrangements: pricing without matter cost data
b. A new practice area: no templates, precedents or trained staff yet
c. Lateral growth: integration of people and files takes longer than planned
d. AI adoption: no policy, no sponsor, no measured pilot
e. Client service standards: no status visibility to deliver on them
f. Succession: no plan for client relationships held by one partner

2. Where do change efforts lose traction most often in this firm? (SINGLE)
a. Partner resistance once the change touches their matters
b. Billable-hour targets that leave no time for the change
c. No training time built into the rollout
d. No owner after launch
e. The tool works but the process around it never changed
f. Too many changes at once, so none finishes

3. What client or market pressure is forcing the biggest reprioritization right now? (SINGLE)
a. Outside counsel guidelines dictating staffing, billing and tools
b. Flat-fee and capped-fee demand
c. Client security questionnaires and audits
d. Work moving in-house or to alternative providers
e. Competitor claims about AI and speed
f. Talent retention and the cost of associates

4. What risk is most likely to cause the firm's current technology or change plan to miss expectations? (SINGLE)
a. A key partner departure
b. The budget cycle delaying the spend
c. A vendor change or sunset mid-rollout
d. A shift in bar or court guidance on AI or e-filing
e. A security incident that freezes all change
f. The plan has no measure, so no one can say it missed

5. What signal would tell you the firm is ready for deeper PAT insight use, broader change or faster execution? (SINGLE)
a. A completed firm baseline across all five modules
b. A named partner sponsor with authority
c. A measured pilot with a result the partners accept
d. A quarter with no missed deadlines in the log
e. Trust reconciliations current for six straight months
f. A working template library with an owner

## Channel-neutral note

Twenty of the thirty option-set shapes are the accounting shapes with legal nouns swapped (the pack's one-to-one mapping holds); the ten that differ do so because the legal process differs (trust accounting, conflicts, docketing, supervision of non-lawyers, outside counsel guidelines). Those ten are reasons, not accidents, and are recorded here so the wealth channel can make the same call on purpose.

NOT-CLOSED.
