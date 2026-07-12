# PAT Question Bank v1 — Integration & Data Flow Maturity
### 90 items · July 8, 2026 · DRAFT pending CPA-founder accuracy review + Leslie clarity pass (two-signature gate)
### Sources (all public domain / cited): **NIST CSF 2.0** · **NIST SP 800-series** (SP 800-63B authentication, SP 800-88 media sanitization, SP 800-171 where apt) · **IRS Publication 4557** (Safeguarding Taxpayer Data) · **FTC Safeguards Rule** (16 CFR Part 314 — applies to tax preparers as GLBA "financial institutions") · GAO **2025 Green Book** (Principles 11 & 13) · GAO **Assessing Data Reliability** (GAO-20-283G)
### Framing note: federal standards adapted to CPA-firm operating context; each item cites its source principle. Difficulty mix: 27 E / 45 M / 18 H. Blueprint: A) Data Architecture & Integration Design 25 · B) Data Quality & Reliability 22 · C) Data Security in Motion & at Rest 23 · D) Change, Interoperability & Vendor Data Exchange 20.

---
## SECTION A — Data Architecture & Integration Design (25: 7E/13M/5H)

**A1 (E)** The first step toward controlling how firm systems connect is:
a) buying an integration platform b) canceling redundant software c) an inventory of systems and a map of how client data flows between them d) hiring an IT consultant — **c.** You cannot control flows you have not identified; asset and data-flow inventories come first. *[NIST CSF 2.0 ID.AM]*

**A2 (E)** "Single source of truth" means:
a) each data element has one authoritative system, and every other system defers to it b) one platform runs everything c) partners settle data disputes d) the newest software wins — **a.** *[Green Book 2025, P13 applied]*

**A3 (E)** Rekeying client data by hand from one system into another most directly threatens:
a) speed b) licensing terms c) staff morale d) accuracy — every manual touch is a transcription-error opportunity — **d.** *[Green Book 2025, P13; GAO-20-283G accuracy]*

**A4 (E)** Compared with staff exporting and importing files by hand, a direct system-to-system integration chiefly:
a) looks more modern b) removes manual handling, so transfers run consistently, completely, and on schedule c) costs less d) eliminates all errors — **b.** Automation moves the risk; it does not erase it — but it kills rekeying variance. *[Green Book 2025, P11; NIST CSF 2.0 ID.AM-3]*

**A5 (E)** "Master data ownership" for the firm's client records means:
a) the managing partner owns the server b) the vendor owns the data c) a named person is accountable for the accuracy and upkeep of the authoritative record d) whoever typed it owns it — **c.** *[Green Book 2025, P13]*

**A6 (E)** Under Green Book Principle 13, management's first information task is to:
a) identify the firm's information requirements — what decisions need what data b) buy dashboards c) archive everything d) restrict access — **a.** Requirements precede sources, systems, and reports. *[Green Book 2025, Principle 13]*

**A7 (E)** A handoff map documents:
a) staffing rotations b) office layout c) client meeting schedules d) each point where data passes between people or systems, and who is responsible on each side — **d.** *[NIST CSF 2.0 ID.AM-3; Green Book P11]*

**A8 (M)** The same client exists as three different records across the tax, bookkeeping, and CRM systems. The structural fix:
a) merge the three platforms b) a unique client identifier keyed to one master record and propagated to the other systems c) a naming-convention memo d) quarterly manual cleanup — **b.** Cleanup without a keyed master record just resets the clock on divergence. *[Green Book 2025, P13; GAO-20-283G accuracy applied]*

**A9 (M)** Staff quietly maintain a spreadsheet that duplicates the practice-management system "because the system is wrong." The correct reading:
a) the shadow file is evidence the governed system fails its information requirements — fix the source, or formally adopt the file under control b) delete the spreadsheet and warn staff c) shadow files are harmless d) buy new software immediately — **a.** Shadow systems are diagnostic data, not just violations. *[Green Book 2025, P13]*

**A10 (M)** A two-way sync between the bookkeeping platform and the firm's ledger lets both sides edit the same balances. The design flaw:
a) syncing itself b) the license cost c) no authoritative direction — conflicting edits produce silent overwrites; one side must be designated the source for each data element d) the sync frequency — **c.** *[Green Book 2025, P11/P13]*

**A11 (M)** The service account running the portal-to-tax-software integration holds full admin rights. Least privilege:
a) does not apply to software accounts b) is satisfied by a strong password c) requires deleting the account d) applies to non-human accounts too — scope it to only the data and actions the integration needs — **d.** *[NIST CSF 2.0 PR.AA; SP 800-171 3.1 adapted]*

**A12 (M)** A nightly feed from the books platform failed silently for nine days before anyone noticed. The missing control:
a) monitoring and alerting on integration failures, with a named owner for the alert queue b) a faster feed c) manual entry as a backup d) a vendor penalty clause — **a.** An unwatched integration is an unattended control point. *[NIST CSF 2.0 DE.CM; Green Book P11]*

**A13 (M)** Documenting each interface (what data moves, when, in what format, owned by whom) is required by which control logic?
a) it is optional below 50 staff b) P11/P12 — controls over the information system exist only when designed and documented, and interfaces are control points c) vendor manuals cover it d) it applies to public companies only — **b.** *[Green Book 2025, P11-P12]*

**A14 (M)** In the tax-season flow (client portal → preparer download → desktop tax software), the step that MOST needs added control is:
a) the portal upload b) the software import c) the manual download — it creates untracked local copies of taxpayer data outside governed systems d) the e-file transmission — **c.** Manual middle steps are where governed flows leak. *[IRS Pub 4557; NIST CSF 2.0 PR.DS]*

**A15 (M)** When two systems both hold client contact data, the authoritative one should be chosen by:
a) the age of the system b) partner preference c) alphabetical order d) where the data is actively maintained and validated as part of routine work — **d.** Authority follows maintenance, not seniority. *[Green Book 2025, P13]*

**A16 (M)** A data dictionary earns its keep by:
a) giving fields shared definitions so "client status" means one thing when systems exchange it b) impressing reviewers c) storing credentials d) replacing training — **a.** *[Green Book 2025, P13]*

**A17 (M)** Staff email CSV exports to each other to move data between systems. The core problem:
a) file sizes b) formatting drift c) email is an uncontrolled transfer channel — no audit trail, uncontrolled copies, no delivery guarantee — replace it with a governed transfer path d) typing speed — **c.** *[NIST CSF 2.0 PR.DS; IRS Pub 4557]*

**A18 (M)** Morning management reports run before the books platform's mid-day sync. The P13 attribute failing:
a) accessibility b) timeliness — the data is stale relative to the decision it feeds; align the schedule or label the as-of time c) confidentiality d) completeness — **b.** *[Green Book 2025, P13]*

**A19 (M)** A vendor offers only manual CSV export, no API. An adequate compensating control for the recurring transfer:
a) accept the risk silently b) stop the transfers c) switch vendors immediately d) a scheduled, logged procedure with record counts and control totals checked on every load — **d.** Manual channels can be governed; ungoverned ones cannot. *[Green Book 2025, P11; GAO-20-283G completeness]*

**A20 (M)** Before connecting a newly adopted system to existing platforms, the firm should FIRST:
a) update the data-flow map and assess what new data paths and access the connection creates b) run it in production and watch c) announce it to clients d) negotiate a discount — **a.** *[NIST CSF 2.0 ID.AM-3; Green Book P11]*

**A21 (H)** Tax software, books platform, and portal each store client SSNs independently, and edits do not propagate. Build the correct remediation stack:
a) encrypt all three and move on b) map the flows, designate one master record, propagate through controlled interfaces, and strip SSN storage from systems that do not need it — single-source design plus data minimization c) export everything to one spreadsheet d) ask the vendors to coordinate — **b.** Storage sprawl is a quality problem and a breach surface at once — solve both together. *[NIST CSF 2.0 ID.AM/PR.DS; Green Book P13; IRS Pub 4557]*

**A22 (H)** An offshore processing team needs bookkeeping data. The strongest control architecture:
a) emailed extracts in an encrypted zip b) a shared drive of exports c) direct scoped platform access — role-limited, MFA, logged — beats extract-and-transmit: no copies leave the governed system and every action attributes to a person d) all equivalent if the contract is good — **c.** Each extract is a new uncontrolled data store; scoped access creates none. *[NIST CSF 2.0 PR.AA; FTC Safeguards 314.4(c); IRS Pub 4557]*

**A23 (H)** The firm adopts a third-party connector (middleware) to sync two platforms. What changed in the risk model?
a) nothing — it is plumbing b) only the cost c) only the speed d) a new party now processes client data in motion — it needs supplier-risk treatment: contract terms, security assurance, and its own entry on the data-flow map — **d.** Middleware is a vendor, not a cable. *[NIST CSF 2.0 GV.SC; FTC Safeguards 314.4(f)]*

**A24 (H)** Six systems wired point-to-point produce eleven custom links, each with its own failure mode. The architecture argument for an authoritative-hub design:
a) it collapses the reconciliation surface — fewer interfaces to control, monitor, and document, so P11 control design becomes tractable instead of combinatorial b) hubs are cheaper c) vendors prefer hubs d) it eliminates reconciliation entirely — **a.** *[Green Book 2025, P11]*

**A25 (H)** Trace one return: organizer data → preparation → review → e-file authorization → transmission. Where must the architecture enforce identity attribution and post-approval locking?
a) at transmission only b) at preparation only c) at every stage transition — each handoff needs an attributable actor, and records must lock once the authorization they support is signed d) nowhere — IRS validation covers it — **c.** A flow is only as attributable as its least-attributed handoff. *[Green Book 2025, P11; NIST CSF 2.0 PR.AA]*

## SECTION B — Data Quality & Reliability (22: 7E/11M/4H)

**B1 (E)** GAO's test of data reliability asks whether data are:
a) recently created b) applicable, complete, and accurate enough for the intended use c) encrypted d) government-sourced — **b.** *[GAO-20-283G]*

**B2 (E)** Completeness testing checks:
a) spelling b) formatting c) access rights d) whether all records that should be present are present — no dropped rows, gaps, or truncated fields — **d.** *[GAO-20-283G]*

**B3 (E)** Accuracy testing is best evidenced by:
a) tracing a sample of records back to source documents b) staff confidence c) vendor claims d) clean formatting — **a.** *[GAO-20-283G]*

**B4 (E)** "Reliable enough" is judged relative to:
a) perfection b) industry averages c) the intended use — data behind a client deliverable needs more than data behind an office headcount d) dataset size — **c.** *[GAO-20-283G]*

**B5 (E)** A reconciliation between two systems is which control type?
a) preventive b) detective — it finds differences after they occur so they can be corrected c) corrective d) directive — **b.** *[Green Book 2025, Appendix II applied]*

**B6 (E)** When a dataset's reliability cannot be assessed, GAO's category is:
a) reliable by default b) fraudulent c) rejected d) undetermined — use it only with disclosed limitations, or not at all for that decision — **d.** *[GAO-20-283G]*

**B7 (E)** Timeliness as a quality attribute means:
a) the data is current enough for the decision it supports b) reports render fast c) staff work quickly d) the vendor answers tickets promptly — **a.** *[Green Book 2025, P13]*

**B8 (M)** Record counts and control totals checked on every import are controls over:
a) accuracy of individual values b) access rights c) completeness — proving nothing was dropped or duplicated in transfer d) timeliness — **c.** Counts prove population, not correctness — pair them with tracing. *[GAO-20-283G; Green Book P11]*

**B9 (M)** Monthly bank reconciliations run on time, but reconciling items sit unresolved for months. The verdict:
a) the control works b) fine if the items are listed c) items age out naturally d) the control detects but nothing corrects — an aging unresolved-difference queue defeats the reconciliation's purpose — **d.** *[Green Book 2025, P13/P16 applied]*

**B10 (M)** Electronic testing of a dataset before use should look for:
a) duplicates, missing values, out-of-range dates and amounts, and orphaned records b) font consistency c) author identity d) file-name conventions — **a.** *[GAO-20-283G]*

**B11 (M)** To verify that portal-received source documents landed correctly in the tax software, the right test is:
a) asking preparers if it went fine b) tracing a sample in both directions — documents to entries, entries back to documents c) counting portal logins d) checking the portal invoice — **b.** One-direction tracing misses omissions; two-direction catches both. *[GAO-20-283G]*

**B12 (M)** A "clients served" metric is computed from a CRM known to hold duplicate records. Before reporting it:
a) round it down b) attach a disclaimer only c) remediate the duplicates or derive the count from a deduplicated source — a known defect in the denominator is a known defect in the metric d) report it anyway — everyone's CRM is messy — **c.** *[GAO-20-283G; Green Book P13]*

**B13 (M)** Client-provided spreadsheets feeding bookkeeping work should be treated as:
a) reliable — clients know their business b) unusable c) internal data d) third-party data needing reliability assessment proportionate to use — corroborate against bank feeds or source records — **d.** *[GAO-20-283G]*

**B14 (M)** Books synced quarterly are feeding a monthly advisory dashboard. The defect:
a) timeliness — the data cannot support a monthly decision cadence; sync frequency must match the use b) accuracy c) security d) there is none — **a.** *[Green Book 2025, P13; GAO-20-283G applicability]*

**B15 (M)** Reconciliations are best performed by:
a) whoever entered the data b) someone independent of the entry or processing being checked c) the platform vendor d) the newest hire, for practice — **b.** Checking your own work is the self-review problem in data form. *[Green Book 2025, P10 applied]*

**B16 (M)** Data cleansing is most effective when done:
a) after migration, inside the new system b) never — data is data c) before migration, at the source, under documented rules — so defects don't propagate into the new system's history d) only when a client complains — **c.** *[GAO-20-283G; Green Book P13]*

**B17 (M)** Interviewing the people who maintain a dataset about its known limitations is:
a) unnecessary if you test electronically b) office gossip c) a courtesy step d) part of a reliability assessment — documentation review, testing, and knowledgeable-party interviews work together — **d.** *[GAO-20-283G]*

**B18 (M)** Field validation at entry (required fields, format checks, range limits) versus quarterly cleanup:
a) prevention at entry is cheaper and stronger — cleanup finds damage after decisions may already have used it b) cleanup is superior — it sees everything c) both are optional refinements d) validation slows staff unacceptably — **a.** *[Green Book 2025, P11; GAO-20-283G]*

**B19 (H)** The books platform's sync silently drops transactions with unmapped categories, and the firm prepares returns from the synced data. Build the control stack:
a) trust the platform — syncing is its job b) completeness testing on each sync (counts/totals), an owned error queue for unmapped items, periodic source-to-target reconciliation, and disclosure of unresolved gaps before the data feeds a return c) an annual review of the sync d) switch platforms — **b.** Silent-drop behavior turns a convenience feature into an unbounded completeness risk. *[GAO-20-283G; Green Book P11/P13; NIST CSF 2.0 DE.CM]*

**B20 (H)** To assert "every return in scope was e-filed and accepted," the underlying data must pass which reliability tests?
a) none — the software says so b) accuracy only c) completeness (every in-scope return has a submission record), accuracy (acknowledgments match the returns and recorded outcomes), and applicability (acknowledgment data actually proves acceptance, not just receipt) d) timeliness only — **c.** *[GAO-20-283G]*

**B21 (H)** Practice management shows 412 active clients; the tax platform shows 389. The defensible resolution:
a) average them b) trust the larger number c) trust the newer system d) treat both counts as undetermined until reconciled to a defined population — the difference is itself a finding — then fix the process that let them diverge — **d.** *[GAO-20-283G; Green Book P13]*

**B22 (H)** A client-facing advisory dashboard draws on three data feeds. The reliability workflow before it goes live:
a) assess each feed (test, trace, interview), determine sufficiently reliable / not / undetermined relative to the intended use, remediate or disclose limitations, and document the determination — client-facing use raises the stakes and therefore the bar b) test the largest feed and extrapolate c) let the client validate it in production d) launch and iterate on complaints — **a.** *[GAO-20-283G; Green Book P13]*

## SECTION C — Data Security in Motion & at Rest (23: 7E/12M/4H)

**C1 (E)** The FTC Safeguards Rule reaches CPA firms and tax preparers because:
a) the FTC regulates accounting b) the IRS delegated enforcement c) every state adopted it d) preparers are "financial institutions" under the Gramm-Leach-Bliley definition the Rule implements — **d.** *[16 CFR 314.1-314.2; IRS Pub 4557]*

**C2 (E)** A WISP is:
a) a wireless internet service plan b) the written information security program the Safeguards Rule requires — safeguards matched to the firm's size, complexity, and data c) an optional best practice d) a vendor product tier — **b.** *[16 CFR 314.3; IRS Pub 4557]*

**C3 (E)** Encryption in transit protects data:
a) while it moves across networks between systems, where it can be intercepted b) on backup tapes c) in filing cabinets d) after deletion — **a.** *[NIST CSF 2.0 PR.DS; 16 CFR 314.4(c)(3)]*

**C4 (E)** Client portals beat email attachments for delivering returns because portals:
a) look more premium b) cost less c) provide an encrypted, access-controlled channel with an audit trail — email scatters copies across mailboxes the firm cannot see or revoke d) send faster — **c.** *[IRS Pub 4557; NIST CSF 2.0 PR.DS]*

**C5 (E)** Multi-factor authentication combines at least two of:
a) two different passwords b) something you know, something you have, something you are c) username and password d) a PIN and a password — **b.** *[NIST SP 800-63B]*

**C6 (E)** "Data at rest" means data:
a) archived only b) already deleted c) unused d) stored — on laptops, servers, phones, and backups — as opposed to moving across a network — **d.** *[NIST CSF 2.0 PR.DS]*

**C7 (E)** Under the Safeguards Rule, the "Qualified Individual" is:
a) the designated person responsible for implementing and supervising the firm's information security program b) any credentialed CPA c) the most technical employee by default d) an FTC-appointed examiner — **a.** *[16 CFR 314.4(a)]*

**C8 (M)** Current NIST guidance on forced periodic password changes:
a) monthly rotation is required b) annual rotation is required c) do NOT impose arbitrary rotation — force change on evidence of compromise, and screen passwords against known-breached lists instead d) rotation is the strongest single control — **c.** Frequent forced changes breed weaker, patterned passwords. *[NIST SP 800-63B]*

**C9 (M)** The Safeguards Rule's encryption requirement covers customer information:
a) in transit only b) both in transit over external networks and at rest — alternatives allowed only as compensating controls the Qualified Individual reviews and approves in writing c) at rest only d) only on portable devices — **b.** *[16 CFR 314.4(c)(3)]*

**C10 (M)** Under the Safeguards Rule, customer information no longer needed must be securely disposed of:
a) never — retain everything b) within 90 days of engagement end c) whenever convenient d) no later than two years after its last use for the customer relationship, unless retention is legally required or a documented business purpose remains — **d.** *[16 CFR 314.4(c)(6)]*

**C11 (M)** The firm retires an office copier that scanned client documents for years. Correct handling:
a) sanitize or destroy its internal storage — multifunction devices retain images of what they processed b) donate it as-is c) factory-reset the display menu d) remove the toner and drum — **a.** *[NIST SP 800-88; IRS Pub 4557]*

**C12 (M)** MFA under the Safeguards Rule must cover:
a) partners only b) remote staff only c) any individual accessing information systems holding customer information — staff, remote workers, and vendor users alike — unless the Qualified Individual approves an equivalent control in writing d) new hires during onboarding only — **c.** *[16 CFR 314.4(c)(5)]*

**C13 (M)** Preparer laptops leave the office nightly during tax season. The at-rest control that matters most:
a) a strong login password alone b) full-disk encryption — a lost laptop becomes a lost brick instead of a reportable breach c) a laptop-bag policy d) asset tags — **b.** *[IRS Pub 4557 "Security Six"; NIST CSF 2.0 PR.DS]*

**C14 (M)** The Safeguards Rule's "monitor and log authorized user activity" requirement exists to detect:
a) slow typists b) unapproved overtime c) bandwidth waste d) unauthorized access or misuse by accounts that are supposed to be there — insiders and hijacked credentials — **d.** *[16 CFR 314.4(c)(8)]*

**C15 (M)** Sending client books to an offshore processor, the minimum transmission discipline is:
a) an encrypted, authenticated channel (portal, SFTP, or scoped platform access) with transfer logging — never standard email attachments b) email with "CONFIDENTIAL" in the subject c) any channel, if the contract is strong d) compressed files to save bandwidth — **a.** *[IRS Pub 4557; NIST CSF 2.0 PR.DS; SP 800-171 3.13 adapted]*

**C16 (M)** The written incident response plan the Safeguards Rule requires must exist:
a) after the first incident, informed by it b) only at firms above 100 staff c) before any incident — defining roles, response phases, communication, and post-event revision — improvising mid-breach is the failure it prevents d) at the vendor, not the firm — **c.** *[16 CFR 314.4(h)]*

**C17 (M)** A breach exposes unencrypted data of roughly 600 clients. Under the amended Safeguards Rule, the firm must:
a) notify affected clients only b) report the event to the FTC as soon as possible and no later than 30 days after discovery — the 500-consumer threshold for unencrypted information is met c) do nothing federal — notification is state law only d) wait until the forensic investigation closes — **b.** *[16 CFR 314 breach-notification amendment]*

**C18 (M)** On discovering taxpayer-data theft, IRS guidance directs the firm to promptly contact:
a) local police only b) its insurer only c) the software vendor only d) the IRS Stakeholder Liaison for its area — plus state tax agencies — so fraudulent-return filters can be raised for affected clients — **d.** *[IRS Pub 4557]*

**C19 (M)** For the highest-risk access (e-file systems, admin consoles), NIST's authentication guidance favors:
a) phishing-resistant authenticators — SMS one-time codes are a restricted, weaker channel b) SMS codes — the industry standard c) longer passwords alone d) security questions — **a.** *[NIST SP 800-63B]*

**C20 (H)** Deadline week: staff start emailing unencrypted returns "just this once." Diagnose the full failure:
a) a training gap only b) a technology gap only c) policy (WISP channel rules), enforcement (no technical block on the workaround), capacity (the sanctioned channel didn't scale to peak load), and culture (deadline pressure outranked the control) — patch all four or it recurs every April d) individual misconduct only — **c.** A control that fails under peak load was designed for the off-season. *[16 CFR 314.3-314.4; IRS Pub 4557; NIST CSF 2.0 PR.DS]*

**C21 (H)** "We keep every client file forever, in case they come back." The layered problem:
a) storage cost only b) none — long retention is prudence c) clients might object someday d) indefinite retention contradicts the disposal requirement, inflates the breach surface (every stale record is exposure with no offsetting use), and a retention schedule keyed to legal and professional requirements is itself a required, reviewable control — **d.** *[16 CFR 314.4(c)(6); NIST CSF 2.0 PR.DS applied]*

**C22 (H)** The firm designs its transmission architecture — client portal, vendor SFTP, no ad-hoc attachments. The encryption question that still remains:
a) none — the channels settle it b) key management — who holds and can use the decryption keys (firm versus vendor), how they rotate, and whether vendor-side key access changes the firm's incident analysis when a breach hits that vendor c) which policy font to use d) portal branding — **b.** Encryption whose keys you don't govern is a promise, not a control. *[NIST CSF 2.0 PR.DS; 16 CFR 314.4(c)(3)]*

**C23 (H)** Primary systems are encrypted, but the backup vendor stores copies unencrypted. Assess:
a) the control fails — at-rest encryption must cover every copy, including backups and replicas; in an incident, the unencrypted backup is what drives the notification analysis no matter how tight the primary was b) acceptable — backups are secondary systems c) acceptable if the vendor is reputable d) only restore copies matter — **a.** *[16 CFR 314.4(c)(3); NIST CSF 2.0 PR.DS; IRS Pub 4557]*

## SECTION D — Change, Interoperability & Vendor Data Exchange (20: 6E/9M/5H)

**D1 (E)** Before migrating client data to a new platform, the baseline verification is:
a) record counts and control totals captured before, compared after b) a vendor demo c) partner sign-off on the price d) a go-live announcement — **a.** *[GAO-20-283G completeness applied; Green Book P11]*

**D2 (E)** Safeguards Rule vendor oversight requires the firm to:
a) audit every vendor on site annually b) rely fully on marketing materials c) select capable providers, require safeguards by contract, and periodically reassess them d) avoid vendors entirely — **c.** *[16 CFR 314.4(f)]*

**D3 (E)** Data-return and exit terms should be negotiated:
a) at first renewal b) before signing — leverage disappears once your data is inside c) when leaving d) never — standard terms govern — **b.** *[NIST CSF 2.0 GV.SC]*

**D4 (E)** A change to a live integration's configuration should first happen:
a) in production, off-hours b) wherever it's fastest c) on the admin's own laptop d) in a test or sandbox environment, then move to production under approval — **d.** *[Green Book 2025, P11; NIST CSF 2.0 PR.PS]*

**D5 (E)** A vendor breach-notification clause exists so the firm:
a) learns of vendor incidents fast enough to meet its own duties to clients and regulators b) can sue faster c) earns renewal discounts d) transfers all liability — **a.** *[16 CFR 314.4(f); NIST CSF 2.0 GV.SC]*

**D6 (E)** Real data portability at vendor exit means:
a) PDF exports of every screen b) whatever the vendor's tool produces c) data returned in a usable, documented format — then vendor deletion confirmed in writing d) screenshots and goodwill — **c.** *[NIST CSF 2.0 GV.SC]*

**D7 (M)** A parallel run during migration means:
a) two teams race to finish b) old and new systems run together for a period and their outputs are reconciled before the old one is retired c) migrating at night d) keeping double licenses forever — **b.** *[Green Book 2025, P11]*

**D8 (M)** The books platform announces an API change that will break the firm's sync in 60 days. The correct sequence:
a) wait and see if it really breaks b) escalate publicly c) turn the sync off for good d) impact-assess, update and test the integration in sandbox, schedule cutover with a rollback, and notify affected staff — vendor-initiated change is still change management — **d.** *[Green Book 2025, P11; NIST CSF 2.0 PR.PS]*

**D9 (M)** Decommissioning the old tax server after a migration, the correct order:
a) extract and preserve records subject to retention duties FIRST, then sanitize the media to NIST standards b) wipe it immediately — clean break c) sell it with data "probably" removed d) shelve it in a closet indefinitely — **a.** Disposal duties and retention duties both apply; sequence reconciles them. *[NIST SP 800-88; 16 CFR 314.4(c)(6)]*

**D10 (M)** In a vendor's SOC 2 report, the section firms most often skip at their peril:
a) the cover letter b) the system description c) complementary user-entity controls — the assurance assumes YOUR side performs these; skip them and the report's comfort is void d) the glossary — **c.** *[NIST CSF 2.0 GV.SC; Green Book P11 applied]*

**D11 (M)** A migration mapping document should contain:
a) marketing screenshots of the new system b) field-by-field source-to-target mapping with transformation rules, signed off by the data owner c) the vendor's verbal assurances d) the timeline only — **b.** *[Green Book 2025, P11/P13]*

**D12 (M)** The practice-management vendor schedules a major platform update for April 10. The firm should:
a) accept it — vendors know their product b) block all updates permanently c) update partner machines first as a test d) invoke a peak-season change-freeze posture: defer if possible; if not, test critical workflows immediately and stage a fallback — timing is a risk variable — **d.** *[Green Book 2025, P11; NIST CSF 2.0 PR.PS]*

**D13 (M)** Reassessment of an established vendor should be triggered by:
a) nothing — onboarding diligence was enough b) price increases only c) a risk-based cycle plus events — incidents, ownership changes, service-scope changes, or weakened assurance reports d) client complaints only — **c.** *[16 CFR 314.4(f)(3); NIST CSF 2.0 GV.SC]*

**D14 (M)** A rollback plan is real only when:
a) it is defined, tested, and executable within the cutover window — an untested rollback is a wish b) it is written down somewhere c) the vendor has one of their own d) partners approve it verbally — **a.** *[Green Book 2025, P11]*

**D15 (M)** The vendor's support team requests a full copy of the client database to troubleshoot one client's sync issue. The right response:
a) send it — support needs data b) refuse all support access on principle c) send it, but encrypted d) scope the disclosure to the minimum data needed, through the contracted support channel, logged — full-database pulls for single-issue support fail data minimization — **d.** *[NIST CSF 2.0 PR.DS/GV.SC; 16 CFR 314.4(f)]*

**D16 (H)** Design the complete control envelope for migrating ten years of client files to a new document platform:
a) counts before and after — done b) field mapping with owner sign-off, pre/post counts and control totals, a parallel-period reconciliation, a tested rollback, retention-aware sanitization of the source system, and an updated data-flow map plus WISP revision — migration touches quality, security, and architecture at once c) the vendor's turnkey migration service d) a long weekend and coffee — **b.** *[Green Book P11/P13; GAO-20-283G; NIST SP 800-88; 16 CFR 314.3]*

**D17 (H)** The firm's portal vendor is acquired by a larger platform company. The firm must:
a) do nothing — service continues uninterrupted b) exit immediately on principle c) treat it as a reassessment trigger: confirm data-processing and breach-notification terms survive the assignment, re-evaluate the risk tier, and verify where the data now lives and who can access it — an ownership change is a supply-chain change d) request a loyalty discount — **c.** *[16 CFR 314.4(f)(3); NIST CSF 2.0 GV.SC]*

**D18 (H)** Ending an offshore processing relationship, the exit sequence that actually closes the risk:
a) revoke all access same-day, obtain return of firm data in usable format, get written certification of deletion including backups, and verify revocation actually propagated (test the dead credentials) — then update the flow map and vendor register b) let the contract quietly lapse c) hold an exit call d) stop sending new work and let old copies age out — **a.** Untested revocation and unverified deletion are the two ways "closed" vendors keep reading your data. *[NIST CSF 2.0 PR.AA/GV.SC; 16 CFR 314.4(f); IRS Pub 4557]*

**D19 (H)** The books platform changes its data schema; the tax import and two dashboards break silently downstream. The failure that let it cascade:
a) vendor malice b) bad luck c) dashboards are inherently fragile d) no dependency map — the firm never documented which downstream flows consume that interface, so the vendor's change notice had nowhere to land; coordinated change requires knowing what depends on what — **d.** *[Green Book 2025, P11; NIST CSF 2.0 ID.AM-3/PR.PS]*

**D20 (H)** Choosing between a vendor-managed connector and an in-house-built sync for the same integration, the sound method is:
a) always build — maximum control b) weigh supply-chain risk (another party processing client data, contract dependence) against internal ITGC capacity (can the firm actually maintain, monitor, and secure custom code?) and document the decision with a named owner — either answer can be right; an undocumented one is wrong c) always buy — vendors are the professionals d) whichever is cheaper this quarter — **b.** *[NIST CSF 2.0 GV.SC; Green Book 2025, P11]*

---
### Bank stats: 90 items · 27 E / 45 M / 18 H · every item sourced · answer-key balance: 24 a / 21 b / 22 c / 23 d · anchor-item candidates: A12, B9, C13, C17, D8, D16 (high-discrimination scenarios)
### Next: CPA-founder accuracy review → Leslie clarity pass → load into ModuleTemplate schema when Sprint 4 lands. Bank 3 (Workflow & Capacity) queued on the same method.
