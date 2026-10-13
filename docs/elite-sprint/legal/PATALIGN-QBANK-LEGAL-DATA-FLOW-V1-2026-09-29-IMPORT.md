# PAT Question Bank v1 — Integration & Data Flow Maturity (Legal) [IMPORT FORMAT: two em dashes per item are required by lib/modules/qbankParser.ts; the human-readable pack has none]
### 90 items · September 29, 2026 · DRAFT pending domain-reviewer accuracy review + clarity pass (two-signature gate)
### Bank stats: 90 items · 27 E / 45 M / 18 H · every item sourced · anchor-item candidates: A1:D1:E, B14:D2:M, B6:D3:M, A23:D4:M, A24:D5:H, B11:D6:H, D18:R:M (charter cells code:driver:tier from PATALIGN-LEGAL-ANCHOR-TAGS-2026-10-11 and its tier gaps, the reserve as R; anchor-pool R66 item 7)
### Sources (all public domain / cited): **NIST CSF 2.0** (CSWP 29, February 2024) · **NIST SP 800-53 Rev. 5** (September 2020, release 5.2.0 August 2025) · **NIST SP 800-63B-4** (August 2025) · **NIST SP 800-88** (Guidelines for Media Sanitization; Rev. 2, September 2025) · **NIST SP 800-171 Rev. 3** (May 2024) · GAO **2025 Green Book** (GAO-25-107721) · GAO **Assessing Data Reliability** (GAO-20-283G, December 2019) · **Federal Rules of Civil Procedure** 5, 5.2, 26, 34, 37 (as amended through December 1, 2025) · **Federal Rules of Evidence** 502, 901, 902 · **ESIGN Act** (15 U.S.C. 7001) · **16 CFR Part 314** (FTC Safeguards Rule, benchmark only) · **45 CFR Part 164 Subpart C** (HIPAA Security Rule) · **CISA Cyber Essentials** (2019) · **ABA Model Rules of Professional Conduct** 1.1, 1.4, 1.5, 1.6, 1.7, 1.10, 1.15, 1.16, 1.17, 5.1, 5.3 and Comments (CITED) · **ABA Formal Opinions** 08-451 (2008), 477R (2017), 483 (2018), 498 (2021), 512 (2024) and **ABA Informal Opinion 1384** (CITED) · **The Sedona Principles, Third Edition** (2018) and **Sedona Commentary on Legal Holds, Second Edition** (2019) (CITED) · **UETA** (ULC 1999) (CITED) · state rules and opinions as marked (CITED, state-specific) · **ABA TechReport 2024**, **ILTA Technology Survey 2025**, **Clio Legal Trends 2025** (CITED)
### Framing note: federal standards and professional-conduct rules applied to how matter, client, time, trust and evidence data moves between a law firm's systems and its vendors; each item cites its source principle and no item states what is lawful. Difficulty mix: 27 E / 45 M / 18 H. Blueprint: A) System Inventory, Matter-Centric Data Architecture & Integration Design 24 · B) Data Quality, Reliability & Reporting 20 · C) Data in Motion and at Rest, Records & Evidence Integrity 26 · D) Change, Interoperability, Vendor Data Exchange & Portability 20.

---
## SECTION A — System Inventory, Matter-Centric Data Architecture & Integration Design (24: 7E/12M/5H)

**A1 (E)** A three-attorney firm cannot say which systems hold client information because files sit in email, a shared drive, two cloud services and a billing tool. Under NIST CSF 2.0 the outcome the firm has not yet achieved is:
a) buying a backup service b) an inventory of assets and the data they hold (Identify, ID.AM) c) retaining outside counsel d) encrypting every device — **b.** The Identify function starts with knowing what assets and data the organization has before safeguards can be chosen. *[NIST CSF 2.0, ID.AM Asset Management]*

**A2 (E)** ABA Formal Opinion 477R lists a step that a firm should take before deciding how to protect client communications. That step is:
a) adopt a fixed encryption standard for all email b) obtain client consent to any electronic communication c) understand how client information is transmitted and where it is stored, mapping each device and access point d) move all client files to paper — **c.** The opinion asks lawyers to map how information moves and where it rests before selecting safeguards. *[ABA Formal Op. 477R (2017), consideration 2]*

**A3 (M)** A 40-lawyer firm keeps client and matter records in a conflicts database, a billing system and a document management system, each with its own client number. The design that the Green Book's information principle points toward is:
a) designate one system as the source of record for client and matter identity and feed the others from it b) let each department keep its own numbering c) rebuild all three systems at once d) rely on staff memory to match records — **a.** Principle 13 calls for relevant data from reliable sources, which is hard to show when three systems disagree on who the client is. *[Green Book 2025, Principle 13, attribute 13.03]*

**A4 (M)** After a merger, a midsize firm's conflicts data is kept in separate spreadsheets by office and is searched by hand. A conflict surfaces months later and the firm says it did not know. Under the Model Rules the position that comment takes is:
a) the firm is excused because the offices were new to each other b) conflicts checking is only required for litigation matters c) the merger suspended the duty to check d) a lack of reasonable conflict-identification procedures does not excuse the violation — **d.** Rule 1.7 comment 3 expects procedures appropriate to firm size and type and treats ignorance caused by their absence as no defense. *[ABA Model Rule 1.7, cmt. 3]*

**A5 (E)** Rule 5.1 comment 2 names internal policies that a firm's managing lawyers should have in place. The three data sets those policies most directly depend on are:
a) marketing lists, payroll and leases b) conflicts records, deadline and date records, and client funds and property records c) social media, website analytics and referral sources d) office inventory, vehicle logs and travel — **b.** The comment names procedures to detect conflicts, identify dates by which actions must be taken, and account for client funds and property. *[ABA Model Rule 5.1, cmt. 2]*

**A6 (M)** A small firm (6 to 20 attorneys) has a system inventory dated three years ago that omits two cloud tools and a client portal added since. Against NIST SP 800-53 the gap is that the inventory is not:
a) signed by a partner b) stored in the cloud c) accurate and current d) longer than one page — **c.** CM-8 calls for a documented inventory of system components that is accurate and current. *[NIST SP 800-53 Rev. 5, CM-8 System Component Inventory]*

**A7 (H)** A large regional firm opens matters in its billing system first and runs the conflicts check afterward "to get the file number issued." Read together, Rule 1.7 comment 3 and the Green Book's information principle point to:
a) making the conflicts record the master record that must clear before any downstream system creates the matter b) allowing billing to create matters as long as conflicts are checked within 30 days c) letting each partner decide the order d) checking conflicts only when a client complains — **a.** Conflict identification procedures must work before representation begins, and quality information depends on a reliable source of record feeding the rest. *[ABA Model Rule 1.7, cmt. 3; Green Book 2025, Principle 13]*

**A8 (M)** A firm's separately organized title and settlement affiliate asks whether the FTC Safeguards Rule's inventory element applies to it. The accurate framing is:
a) the Safeguards Rule applies to all law firms b) the Safeguards Rule never applies to anything owned by lawyers c) inventory is only required for firms with more than 5,000 consumers d) the practice of law is outside the Rule under ABA v. FTC, but a genuinely financial affiliate can be a covered financial institution and would need an inventory of data, personnel, devices, systems and facilities — **d.** The D.C. Circuit held lawyers practicing law are not financial institutions; 314.4(c)(2) still reaches a covered financial affiliate. *[16 CFR 314.4(c)(2); ABA v. FTC, 430 F.3d 457 (D.C. Cir. 2005)]*

**A9 (E)** CISA Cyber Essentials tells a small business leader to maintain two inventories under its "Your Surroundings" element. They are:
a) client lists and fee schedules b) network connections and user accounts c) vendors and invoices d) printers and phones — **b.** The element asks that only those who belong have access, supported by inventories of network connections and user accounts. *[CISA Cyber Essentials (2019), Your Surroundings]*

**A10 (M)** A midsize firm wants a partner dashboard and begins by buying a reporting tool. The Green Book attribute that comes first is:
a) processing data into information b) communicating externally c) identifying the information requirements partners actually need d) monitoring the dashboard vendor — **c.** Principle 13's first attribute is identification of information requirements, before sourcing or processing data. *[Green Book 2025, Principle 13, attribute 13.02]*

**A11 (H)** A 600-lawyer firm plans to connect a generative AI tool to its document management system through an API so the tool can read matter files. ABA Formal Opinion 512's vendor guidance says the firm should check, among other things:
a) who owns and retains the data after the engagement ends and whether the vendor runs its own conflicts checking b) only the tool's monthly price c) whether the tool has a mobile app d) the vendor's marketing claims — **a.** The opinion lists vendor credentials, security, confidentiality terms, breach notification, conflicts checking, data retention and ownership, and remedies. *[ABA Formal Op. 512 (2024), supervision and vendor section]*

**A12 (M)** A health-care defense firm receives protected health information from a hospital client and wants to route it through a new client portal. Before the data flows, the HIPAA Security Rule expects:
a) nothing, because law firms are exempt b) a state bar opinion c) client consent only d) a business associate contract with the covered entity and safeguards covering the portal — **d.** A firm that creates, receives, maintains or transmits PHI for a covered entity is a business associate and must have the required contract and safeguards. *[45 CFR 164.308(b), 164.314]*

**A13 (E)** A solo designs a bookkeeping setup. Under Model Rule 1.15 the trust records must:
a) be combined with operating records for simplicity b) show client funds separately from the lawyer's own property with complete records kept after the representation ends c) be kept only while the matter is open d) be kept by the bank, not the lawyer — **b.** Rule 1.15(a) requires separation and complete records preserved for the model period after termination; states set the actual period. *[ABA Model Rule 1.15(a); state periods vary]*

**A14 (M)** A firm builds an interface that pushes time entries into billing nightly. The Green Book expects the interface design to include:
a) a marketing review b) approval by the bar c) general control activities over the technology, such as access and change controls d) nothing beyond a test run — **c.** Principle 11 covers designing general control activities over information technology as part of the entity's IT design. *[Green Book 2025, Principle 11]*

**A15 (M)** At a plaintiff contingency firm, matter status exists only in each attorney's memory and email. When a client asks where the case stands, the Model Rule that the data design makes hard to satisfy is:
a) Rule 1.4(a)(3), keeping the client reasonably informed about the status of the matter b) Rule 7.1, advertising c) Rule 1.17, sale of a practice d) Rule 3.3, candor to the tribunal — **a.** Status must be retrievable to keep clients reasonably informed; the rule speaks to the duty, and the data design determines whether it can be met promptly. *[ABA Model Rule 1.4(a)(3)]*

**A16 (H)** A midsize firm advising a defense contractor receives controlled unclassified information under a contract clause. The way NIST SP 800-171 reaches the firm's architecture is:
a) automatically, because all law firms must follow 800-171 b) never, because 800-171 is federal-only c) only if the firm is publicly traded d) through the contract or flow-down clause that requires it, which then drives segregation of CUI systems — **d.** SP 800-171 states requirements for CUI in nonfederal systems and binds a firm only through a contract that requires it. *[NIST SP 800-171 Rev. 3]*

**A17 (E)** The Sedona Commentary on Legal Holds says an effective hold notice addresses system-level (non-custodial) data as well as custodians. For a firm this means the hold process depends on:
a) the size of the client b) knowing which systems and repositories hold matter data c) the judge's preference d) the age of the firm — **b.** A hold cannot reach non-custodial sources the firm has not inventoried. *[Sedona Commentary on Legal Holds, 2d ed. (2019), Guideline 8; CITED]*

**A18 (M)** A survey of lawyers reported that fewer than half of firms changed internal policies when they adopted cloud tools. The maturity signal this describes is:
a) firms with too many policies b) firms that refuse cloud c) systems adopted without the data-handling policies being updated to match d) firms that over-invest in training — **c.** The 2024 ABA Cloud Computing TechReport reported about 48 percent changed internal policies on cloud adoption. *[ABA TechReport 2024, Cloud Computing; CITED]*

**A19 (M)** A litigation firm re-keys docket dates from court notices into its calendar. The Green Book attribute about data sources supports:
a) capturing docket data from the court's electronic filing system as a reliable external source rather than re-keying b) keeping manual entry because it is familiar c) letting each paralegal keep a personal calendar d) ignoring external sources entirely — **a.** Principle 13 asks for relevant data from reliable internal and external sources. *[Green Book 2025, Principle 13, attribute 13.03]*

**A20 (H)** An integration vendor is given standing API access to a firm's document management system. Under Rule 5.3 comment 3 the extent of the firm's oversight obligation depends on:
a) the vendor's price b) whether the vendor is domestic c) the firm's revenue d) the vendor's education, experience and reputation, the nature of the services, the terms on protecting client information, and the legal and ethical environment where the work is done — **d.** The comment lists those factors for nonlawyer services outside the firm, including internet-based data storage. *[ABA Model Rule 5.3, cmt. 3]*

**A21 (E)** A firm relies on a middleware vendor to move data between its intake form and its matter system. In NIST CSF 2.0 the category that covers managing that vendor risk is:
a) DE.CM Continuous Monitoring b) GV.SC Cybersecurity Supply Chain Risk Management c) RC.RP Recovery Plan Execution d) PR.AT Awareness and Training — **b.** GV.SC covers identifying, establishing, managing and monitoring supply chain risk. *[NIST CSF 2.0, GV.SC]*

**A22 (M)** A large regional firm hires a lateral partner and, under the ABA Model Rule, screens her from a former client's matter. For the firm's systems this means:
a) nothing, because screens are paper-only b) a memo to the lateral is enough c) the document and matter systems must be able to enforce and document the screen so the required notice and certifications are accurate d) the matter must be closed — **c.** ABA Rule 1.10(a)(2) requires timely screening, written notice describing the procedures, and certifications of compliance; states differ on availability. *[ABA Model Rule 1.10(a)(2); state variants differ]*

**A23 (M)** Nobody at a small firm can say who is responsible for the accuracy of client contact data shared across three systems. The Green Book principle most directly unmet is:
a) Principle 3, establish structure, responsibility and authority b) Principle 8, assess fraud risk c) Principle 15, communicate externally d) Principle 12, implement control activities — **a.** Assigning responsibility and authority for a data set is a control-environment matter before information quality can be managed. *[Green Book 2025, Principle 3]*

**A24 (H)** A midsize firm is replacing its practice management platform. The 2025 Green Book revision added an expectation that management:
a) hire an outside auditor b) freeze all other projects c) obtain bar approval d) document its assessment of significant changes, treating the migration as a change to be identified, analyzed and responded to — **d.** Principle 9 covers responding to change and the 2025 edition requires documentation of change assessment for significant changes. *[Green Book 2025, Principle 9 and 2025 revision summary]*

---
## SECTION B — Data Quality, Reliability & Reporting (20: 6E/10M/4H)

**B1 (E)** GAO's data reliability guide judges data on three dimensions. They are:
a) speed, cost and volume b) format, color and font c) accuracy, completeness and applicability for the intended use d) age, source and owner — **c.** GAO-20-283G defines reliability as accuracy, completeness and applicability for the purpose at hand. *[GAO-20-283G, Assessing Data Reliability (2019)]*

**B2 (M)** A 40-lawyer firm's work-in-process report is accurate but is produced 45 days after month end. Against the Green Book's list of quality characteristics the report fails on being:
a) current and provided on a timely basis b) accurate c) appropriate d) accessible — **a.** Quality information is appropriate, current, complete, accurate, accessible and timely; a stale report fails the timing characteristics. *[Green Book 2025, Principle 13]*

**B3 (M)** An associate uses a generative AI tool to draft a memo in one hour that used to take four, then records four hours. ABA Formal Opinion 512's position on the time record is:
a) four hours is fine if the client is not told b) the extra hours may be billed as a technology fee c) the associate may bill the average of the two d) only the time actually spent using the tool and reviewing output may be billed — **d.** Hourly billers may not bill for time saved by the tool. *[ABA Formal Op. 512 (2024), Rule 1.5 discussion]*

**B4 (E)** A solo's billing system defaults every matter to one hourly rate even though several engagement letters set a flat fee. The Model Rule that the billing data must reflect is:
a) Rule 1.7 b) Rule 1.5(b), the basis or rate of the fee communicated to the client c) Rule 3.4 d) Rule 8.4 — **b.** Invoices must track the fee basis the client was told, so billing data has to carry the agreed basis per matter. *[ABA Model Rule 1.5(b)]*

**B5 (H)** A midsize firm sets partner compensation from a realization report it has never tested, exported from a billing system whose write-off codes staff apply inconsistently. Under GAO's framework the firm has:
a) satisfied reliability because the report is system-generated b) no obligation to test internal data c) relied on data of undetermined reliability for a high-stakes use without a risk-based assessment d) done enough if the vendor certifies the software — **c.** GAO calls for a risk-based assessment matched to the importance of the use before relying on computer-processed data. *[GAO-20-283G, risk-based framework]*

**B6 (M)** In a state that requires a monthly three-way trust reconciliation, a firm's client ledger total and check register agree but both differ from the bank statement by $412. The state rule expects:
a) the difference to be identified and explained before the month closes b) the bank to be asked to fix its statement c) the difference to be ignored if under $500 d) the ledgers to be adjusted to match the bank — **a.** Three-way reconciliation ties register, client ledger totals and bank balance and requires explanation of discrepancies. *[Minn. R. Prof. Conduct 1.15 App. 1; Cal. Rule 1.15(e) Standards; state-specific]*

**B7 (E)** A client asks for a full accounting of funds held for her. Model Rule 1.15 requires the lawyer to:
a) provide it at the end of the matter only b) provide it only if the bar requests c) charge for it first d) render a full accounting promptly on request — **d.** Rule 1.15(d) requires prompt accounting on request, which means the ledger must support a per-client statement at any time. *[ABA Model Rule 1.15(d)]*

**B8 (M)** A litigation partner signs a discovery response built on a collection report that omitted two custodians' mailboxes. Under FRCP 26(g) the signature:
a) is unrelated to how the data was gathered b) certifies that the response is warranted, not for an improper purpose, and not unreasonable or unduly burdensome, so the collection data behind it matters c) shifts responsibility to the vendor d) is only a formality — **b.** Rule 26(g) makes the signing lawyer accountable for the reasonableness of the inquiry behind the response. *[Fed. R. Civ. P. 26(g)(1)]*

**B9 (M)** A firm runs a data-quality check on client addresses once a year during a cleanup project. The Green Book distinguishes that from:
a) external communication b) fraud risk assessment c) ongoing monitoring built into the normal course of operations d) control environment — **c.** Principle 16 covers ongoing monitoring and separate evaluations; a once-a-year project is a separate evaluation, not ongoing monitoring. *[Green Book 2025, Principle 16]*

**B10 (E)** A client emails asking for an update and the firm cannot answer because its matter data is spread across personal folders. Model Rule 1.4 says a lawyer should:
a) promptly comply with reasonable requests for information or acknowledge and say when a response will come b) respond only at the end of the matter c) refer the client to the court docket d) wait for the next invoice — **a.** Rule 1.4(a)(4) requires prompt compliance with reasonable requests for information; comment 4 adds acknowledgment when a full answer must wait. *[ABA Model Rule 1.4(a)(4), cmt. 4]*

**B11 (H)** A large regional firm finds the same corporate client entered eleven ways across its systems, causing missed conflicts. The Green Book expects management to:
a) accept it as normal b) delete all duplicates without review c) blame the vendor d) evaluate the deficiency, determine its cause, remediate it and track completion — **d.** Principle 17 covers evaluating issues and remediating deficiencies on a timely basis. *[Green Book 2025, Principle 17]*

**B12 (M)** A small firm wants to compute its lockup (days from work to cash) against published small-firm benchmarks but its billing system does not record invoice dates reliably. The immediate data problem is:
a) the benchmark is wrong b) the data lacks completeness for the intended use, so the metric cannot be computed c) the firm is too small to measure d) lockup does not apply to law — **b.** A metric requires complete underlying fields; published small-firm benchmarks report a median total lockup of about 93 days. *[GAO-20-283G, completeness; Clio Legal Trends 2025 benchmarks; CITED]*

**B13 (E)** Partners at a midsize firm receive quality reports but the intake staff who create the data never see error reports. The Green Book principle this misses is:
a) Principle 6 b) Principle 8 c) Principle 14, communicate quality information internally to those who need it d) Principle 1 — **c.** Internal communication of quality information across the entity is Principle 14. *[Green Book 2025, Principle 14]*

**B14 (M)** In a state whose trust rule requires contemporaneous and accurate entries, a firm enters all trust transactions at month end from bank statements. The state rule's issue is:
a) entries are not contemporaneous b) the bank statement is the wrong source c) month-end entry is required d) the rule only covers paper ledgers — **a.** The rule requires entries to be made contemporaneously and accurately, not reconstructed after the fact. *[N.Y. Rule 1.15(d), 22 NYCRR Part 1200; state-specific]*

**B15 (M)** A firm's time data is reliable enough for invoicing but a partner wants to use it to prove staffing needs in a fee dispute. GAO's guide says:
a) reliability is a property of the data alone b) data reliable for one purpose is reliable for all c) reliability is never assessable d) reliability is judged against the intended use, so the same data may be sufficient for one purpose and not another — **d.** Applicability to the intended use is one of the three dimensions of data reliability. *[GAO-20-283G]*

**B16 (H)** A firm's dashboard shows matter summaries generated by an AI tool from case files. ABA Formal Opinion 512 and Rule 1.1 comment 8 together imply that:
a) the summaries can be relied on because the tool is licensed b) outputs must be independently verified before lawyers rely on them, and the firm must understand the tool's limits c) verification is only needed for court filings d) the vendor bears responsibility — **b.** The opinion requires reasonable understanding of the tool and independent verification of output; competence includes technology risks. *[ABA Formal Op. 512 (2024); ABA Model Rule 1.1, cmt. 8]*

**B17 (M)** A firm's hold tracker records that notices were sent but not who acknowledged them or which systems were suspended. When ESI is later lost, the reasonableness of the firm's steps under FRCP 37(e) is:
a) established by the notice alone b) irrelevant c) harder to show because the documentation of the hold process is incomplete d) shown by the vendor's contract — **c.** The rule turns on whether reasonable steps were taken, and Sedona recommends documenting the hold process where warranted. *[Fed. R. Civ. P. 37(e); Sedona Commentary on Legal Holds, Guideline 9; CITED]*

**B18 (E)** ABA Formal Opinion 483 says lawyers must make reasonable efforts to monitor for data breaches. The data practice that supports this is:
a) reviewing audit logs at a defined frequency for unusual activity b) deleting logs monthly to save space c) logging only failed logins d) asking the vendor once a year — **a.** Monitoring requires that log records be generated and reviewed; SP 800-53 AU-6 describes periodic review and analysis. *[ABA Formal Op. 483 (2018); NIST SP 800-53 Rev. 5, AU-6]*

**B19 (M)** A firm's profitability report is built from raw exports of three systems that were never reconciled to each other. The Green Book attribute this skips is:
a) identification of requirements b) external communication c) fraud risk d) processing data into quality information, including checks that the data is complete and accurate — **d.** Attribute 13.04 covers processing relevant data into quality information with the listed characteristics. *[Green Book 2025, Principle 13, attribute 13.04]*

**B20 (H)** A firm's management committee wants a single view of risk that combines conflicts exceptions, trust reconciliation breaks and security incidents. COSO ERM's information principles support:
a) keeping each report separate forever b) leveraging information systems and reporting on risk, culture and performance so the committee sees an integrated picture c) reporting only financial results d) replacing reports with verbal updates — **b.** ERM Principles 18 and 20 cover leveraging information systems and reporting on risk, culture and performance. *[COSO ERM 2017, Principles 18 and 20; CITED]*

---
## SECTION C — Data in Motion and at Rest, Records & Evidence Integrity (26: 8E/13M/5H)

**C1 (E)** Model Rule 1.6(c) sets the standard for protecting information relating to a representation as:
a) reasonable efforts to prevent inadvertent or unauthorized disclosure of or access to the information b) a guarantee against any breach c) encryption of all data at all times d) whatever the vendor recommends — **a.** The rule requires reasonable efforts, and comment 18 says unauthorized access alone is not a violation if reasonable efforts were made. *[ABA Model Rule 1.6(c), cmt. 18]*

**C2 (E)** A firm asks which NIST SP 800-53 controls describe encryption of data moving between its systems and data stored in them. They are:
a) AC-2 and PS-4 b) SC-8 (transmission confidentiality and integrity) and SC-28 (protection of information at rest) c) IR-3 and IR-8 d) CM-3 and CM-8 — **b.** SC-8 covers data in transit and SC-28 covers data at rest; CSF 2.0 groups both under PR.DS. *[NIST SP 800-53 Rev. 5, SC-8, SC-28; NIST CSF 2.0, PR.DS]*

**C3 (M)** A firm handling a trade-secret matter uses unencrypted email for everything. ABA Formal Opinion 477R's position is:
a) unencrypted email is never permitted b) unencrypted email is always sufficient c) unencrypted email may be reasonable for routine matters, but highly sensitive matters call for discussing stronger measures or another channel with the client d) only paper mail is acceptable — **c.** The opinion applies the Rule 1.6 comment 18 factors case by case rather than a fixed rule. *[ABA Formal Op. 477R (2017)]*

**C4 (M)** A firm's password policy forces a change every 60 days and requires a symbol and a number. Under NIST SP 800-63B-4 the two elements that the standard says verifiers shall not impose are:
a) minimum length and blocklists b) rate limiting and blocklists c) MFA and length d) mandatory periodic rotation and composition rules — **d.** The standard sets minimum length and blocklist screening but prohibits composition rules and forced periodic changes. *[NIST SP 800-63B-4 (2025), sec. 3.1.1]*

**C5 (E)** A firm's document system uses SMS codes as the second factor. NIST SP 800-63B-4 treats SMS as:
a) a restricted authenticator, with at least one phishing-resistant option to be offered at AAL2 b) the preferred second factor c) prohibited outright d) equivalent to a hardware key — **a.** PSTN out-of-band authentication is restricted and AAL2 verifiers shall offer a phishing-resistant option. *[NIST SP 800-63B-4 (2025), secs. 2.2.2, 3.1.3.3]*

**C6 (M)** A litigation support analyst copies a custodian's laptop and records matching hash values for the original and the copy. The Federal Rule of Evidence that lets that copy be self-authenticated by certification is:
a) FRE 803(6) b) FRE 902(14) c) FRE 502(d) d) FRE 1002 — **b.** Rule 902(14) covers data copied from a device or file authenticated by digital identification, shown by a qualified person's certification. *[Fed. R. Evid. 902(14)]*

**C7 (M)** A firm wants to introduce a server access log without calling the IT administrator to testify. The provision designed for a record generated by an electronic process that produces an accurate result is:
a) FRE 901(b)(1) b) FRE 502(b) c) FRE 902(13) d) FRCP 34(b) — **c.** Rule 902(13) permits certification in place of live foundation testimony for system-generated records. *[Fed. R. Evid. 902(13)]*

**C8 (H)** A firm serves a 902(13) certification for system logs the morning of trial and assumes the logs are now admitted. The rule's actual effect is:
a) the logs are admitted for all purposes b) the certification also cures hearsay c) no notice is needed for electronic records d) reasonable written notice under 902(11) is required, and the opponent may still object on hearsay, relevance or a genuine authenticity dispute — **d.** 902(13) and (14) incorporate the 902(11) notice requirement and address authenticity only. *[Fed. R. Evid. 902(11), (13), (14) and 2017 Committee Note]*

**C9 (E)** A request for production does not specify a form for ESI. FRCP 34 says the responding party must produce ESI:
a) in the form ordinarily maintained or a reasonably usable form, and need not produce it in more than one form b) on paper only c) in every available format d) as screenshots — **a.** Rule 34(b)(2)(E)(ii) and (iii) set the default form and the one-form rule. *[Fed. R. Civ. P. 34(b)(2)(E)]*

**C10 (M)** A responding firm objects to the requested native format for spreadsheets. FRCP 34 requires the objection to:
a) simply say "objection" b) state the form the party intends to use instead c) be filed with the court first d) be withheld until the meet and confer — **b.** Rule 34(b)(2)(D) requires the responder to state the form it intends to use when objecting to a requested form. *[Fed. R. Civ. P. 34(b)(2)(D)]*

**C11 (H)** A firm keeps e-signed engagement letters only inside the e-signature vendor's portal and has no export. Under ESIGN the retention risk is that the records may not:
a) be admissible at all b) be legally effective as signatures c) remain accessible and capable of accurate reproduction for later reference by everyone entitled to them, which is what electronic retention requires d) count as contracts — **c.** 15 U.S.C. 7001(d) satisfies retention only if the electronic record accurately reflects the original and stays accessible and reproducible. *[15 U.S.C. 7001(d)]*

**C12 (E)** A client challenges a settlement agreement because it was signed electronically. ESIGN's general rule is that a signature or record:
a) is invalid unless notarized b) is valid only in federal court c) is valid only for consumer contracts d) may not be denied legal effect solely because it is in electronic form — **d.** 15 U.S.C. 7001(a) states the rule of non-denial for electronic signatures, contracts and records. *[15 U.S.C. 7001(a)]*

**C13 (M)** A multi-office firm assumes the same e-signature statute applies in every state where it practices. The accurate statement is:
a) nearly every state has enacted UETA, but at least one state relies on its own electronic signatures statute, so the governing state law should be checked b) no state has adopted UETA c) UETA is a federal statute d) ESIGN replaced all state law — **a.** UETA is a uniform state act adopted by nearly all states; New York uses its own statute; ESIGN operates alongside state law. *[UETA (ULC 1999); N.Y. ESRA; state-specific; CITED]*

**C14 (H)** A firm produces a privileged memo by mistake, discovers it three weeks later, and sends a clawback letter. Under FRE 502 the strongest protection it could have arranged in advance is:
a) a confidentiality agreement with opposing counsel only b) a court order under 502(d) that disclosure in the litigation does not waive privilege, binding in other federal and state proceedings c) marking every document confidential d) producing only paper — **b.** 502(b) requires showing reasonable steps to prevent and rectify; a 502(d) order protects without that showing and binds other proceedings, while a party agreement alone binds only the parties. *[Fed. R. Evid. 502(b), (d), (e)]*

**C15 (M)** ESI a firm's client should have preserved is lost through negligent failure to suspend auto-deletion, with no intent to deprive. Under FRCP 37(e) the court may:
a) enter default judgment b) instruct the jury to presume the data was unfavorable c) order measures no greater than necessary to cure prejudice, but not the severe sanctions d) do nothing at all — **c.** Curative measures need only prejudice; adverse inference, presumption, dismissal or default require intent to deprive. *[Fed. R. Civ. P. 37(e)(1), (e)(2)]*

**C16 (E)** Under the Sedona Commentary on Legal Holds, once litigation is reasonably anticipated a firm's hold process should:
a) wait for a court order b) delete old data faster c) notify the opposing party only d) issue a written notice to identified custodians, suspend routine deletion, and obtain acknowledgment — **d.** Guideline 8 describes the elements of an effective hold notice and Guideline 1 the trigger. *[Sedona Commentary on Legal Holds, 2d ed. (2019), Guidelines 1 and 8; CITED]*

**C17 (M)** A firm's client holds relevant email only on disaster-recovery backup tapes that would cost a great deal to restore. Under FRCP 26(b)(2)(B) the responding party:
a) may identify the source as not reasonably accessible because of undue burden or cost, bearing the burden to show it, and the court may still order discovery for good cause b) must restore everything c) may destroy the tapes d) has no obligation to mention the tapes — **a.** The rule creates the not-reasonably-accessible showing with a good-cause override. *[Fed. R. Civ. P. 26(b)(2)(B)]*

**C18 (M)** A firm donates old laptops after deleting the files. The NIST position on what should happen before media leaves the firm's control is:
a) deletion is sufficient b) the media should be sanitized with an approved method and the sanitization documented c) the laptops should be sold, not donated d) only paper needs shredding — **b.** MP-6 requires sanitization before disposal or release, and SP 800-88 describes sanitization methods and a certificate of sanitization; 477R notes that "delete" does not erase data. *[NIST SP 800-53 Rev. 5, MP-6; NIST SP 800-88 Rev. 2 (2025); ABA Formal Op. 477R]*

**C19 (E)** A solo backs up her matter files nightly but has never tried to restore one. The NIST controls that describe both halves of the practice are:
a) IA-2 and IA-5 b) AU-2 and AU-6 c) CP-9 (system backup) and CP-10 (recovery and reconstitution to a known state within a defined time) d) SR-5 and SR-6 — **c.** CP-9 covers backups and protecting their confidentiality, integrity and availability; CP-10 covers recovery within defined periods. *[NIST SP 800-53 Rev. 5, CP-9, CP-10]*

**C20 (H)** In a state whose trust-record appendix addresses computer-maintained records, a firm keeps its trust ledgers only inside a cloud billing tool with no separate copies. The state appendix expects:
a) nothing beyond the vendor's backups b) paper ledgers only c) quarterly bar filings d) regular backups scaled to activity volume and monthly printouts or PDF retention on a separate device — **d.** The Minnesota appendix requires backups related to volume and monthly printout or PDF retention on a separate device. *[Minn. R. Prof. Conduct 1.15 App. 1; state-specific]*

**C21 (M)** A firm's e-filing workflow pastes a client's full Social Security number into a federal complaint exhibit. FRCP 5.2 permits the filing to include only:
a) the last four digits of the SSN, the year of birth, a minor's initials and the last four digits of a financial account number b) the full number if the client consents c) the full number in exhibits but not pleadings d) nothing about the client at all — **a.** Rule 5.2(a) lists the four permitted partial identifiers, with sealing and reference-list alternatives. *[Fed. R. Civ. P. 5.2(a), (d), (g)]*

**C22 (M)** A paralegal files pleadings using a partner's federal e-filing login. FRCP 5 says a filing made through a person's electronic-filing account and authorized by that person, with that person's name on the signature block:
a) is invalid b) constitutes that person's signature, which makes control of the account credentials a signature control c) requires a wet signature attached d) needs a notary — **b.** Rule 5(d)(3)(C) ties the account to the signature, so shared credentials carry signature consequences. *[Fed. R. Civ. P. 5(d)(3)(C)]*

**C23 (E)** A firm keeps a collection log recording who copied a device, when, with what tool and with what hash. The evidentiary purpose this serves under FRE 901 is:
a) proving relevance b) avoiding the hearsay rule c) evidence describing a process or system and showing it produces an accurate result d) satisfying the best evidence rule — **c.** Rule 901(b)(9) lists process or system evidence as a way to support a finding that an item is what it is claimed to be. *[Fed. R. Evid. 901(b)(9)]*

**C24 (H)** A firm that is a HIPAA business associate builds an integration that moves PHI from its DMS to a review platform. The Security Rule's technical safeguards it must account for include:
a) marketing consent b) a privacy notice on its website c) a state bar filing d) audit controls, integrity controls, person or entity authentication and transmission security — **d.** 45 CFR 164.312 lists access control, audit controls, integrity, authentication and transmission security. *[45 CFR 164.312]*

**C25 (M)** A firm converts native spreadsheets to PDF before production and removes the formulas and metadata in the process. The Sedona principle and rule at issue are:
a) production should be in the form ordinarily maintained or a reasonably usable form given the nature of the ESI, and the requester may specify form b) PDF is always acceptable c) metadata is never discoverable d) native files may never be produced — **a.** Sedona Principle 12 and Rule 34(b) tie form to how the ESI is maintained and to reasonable usability. *[Sedona Principles, 3d ed. (2018), Principle 12; Fed. R. Civ. P. 34(b); CITED]*

**C26 (M)** A remote associate records client videoconferences and keeps the recordings in a personal cloud folder. ABA Formal Opinion 498 expects:
a) recordings to be deleted immediately b) recordings and transcripts of virtual meetings to be stored securely and the platform's third-party access risks understood c) no recording ever d) recordings to be sent to the client only — **b.** The opinion addresses videoconference platforms and secure storage of any recordings or transcripts. *[ABA Formal Op. 498 (2021)]*

---
## SECTION D — Change, Interoperability, Vendor Data Exchange & Portability (20: 6E/10M/4H)

**D1 (E)** A client discharges a firm and asks for her file. Model Rule 1.16(d) requires the lawyer to:
a) hold the file until fees are paid b) send only the pleadings c) surrender papers and property to which the client is entitled and refund any unearned advance fee d) destroy the file — **c.** On termination the lawyer must take steps to protect the client's interests, including surrendering papers and property and refunding unearned fees; some states add file-ownership detail. *[ABA Model Rule 1.16(d); state variants add detail]*

**D2 (M)** A firm evaluates a cloud practice management vendor. A state ethics opinion on AI vendors lists, among selection factors, terms addressing:
a) the vendor's office location b) the vendor's logo c) the number of employees d) data retrieval and destruction if the vendor fails or the relationship ends, and whether the provider retains inputs — **d.** The opinion asks about reputation and stability, confidentiality terms, retrieval and destruction on failure, and input retention. *[N.C. State Bar 2024 FEO 1; state-specific; CITED]*

**D3 (M)** Before signing with an AI vendor, a firm asks what happens to matter data when the contract ends. ABA Formal Opinion 512 lists this as:
a) a vendor diligence item about data retention and ownership after the engagement b) irrelevant to ethics c) a matter for the client to negotiate d) something addressed only by insurance — **a.** The opinion's vendor factors include data retention and ownership after the engagement and available legal remedies. *[ABA Formal Op. 512 (2024), vendor section]*

**D4 (E)** ABA Formal Opinion 477R says due diligence on vendors, including cloud providers, should be:
a) done once at signing b) conducted at the outset and reassessed periodically c) delegated to the client d) skipped for well-known vendors — **b.** Consideration 7 calls for vendor due diligence that is reassessed periodically. *[ABA Formal Op. 477R (2017), consideration 7]*

**D5 (H)** A state bar cloud opinion lists inquiries a lawyer should make of a cloud provider. Two that bear directly on portability are:
a) fee discounts and referral bonuses b) branding and color scheme c) backup and retrieval control, and provisions for termination or the provider's business closure d) the provider's social media presence — **c.** The opinion's list includes security precautions, reputation, breach history, confidentiality agreements, backup and retrieval control, and termination or closure provisions. *[Ill. State Bar Ass'n Op. 16-06; state-specific; CITED]*

**D6 (M)** A firm's IT staff change the field mapping between intake and billing on a Friday afternoon with no record. The NIST control this bypasses is:
a) IR-4 b) PS-3 c) MP-6 d) CM-3, which calls for changes to be determined, documented, approved and tracked — **d.** CM-3 is configuration change control; CSF 2.0 places it under Platform Security. *[NIST SP 800-53 Rev. 5, CM-3; NIST CSF 2.0, PR.PS]*

**D7 (E)** A midsize firm is switching document management platforms. The Green Book principle that covers identifying, analyzing and responding to the change is:
a) Principle 9 b) Principle 2 c) Principle 15 d) Principle 5 — **a.** Principle 9 addresses changes that could affect the internal control system, such as new systems. *[Green Book 2025, Principle 9]*

**D8 (M)** A firm reviewed its e-discovery vendor's security report three years ago and has not looked since. NIST SP 800-53 describes supplier review as:
a) optional after the first year b) assessed and reviewed at a defined frequency c) required only for federal contractors d) satisfied by an invoice — **b.** SR-6 calls for supplier assessments and reviews at a defined frequency; CSF 2.0 GV.SC covers monitoring supply chain risk. *[NIST SP 800-53 Rev. 5, SR-6; NIST CSF 2.0, GV.SC]*

**D9 (M)** A corporate client directs its outside firm to use the client's chosen e-discovery platform. Rule 5.3 comment 4 suggests the firm should:
a) refuse b) use it without any oversight c) ordinarily reach agreement with the client on how responsibility for monitoring the provider is allocated d) bill the client for the platform at a markup — **c.** The comment addresses client-directed providers and allocation of monitoring responsibility under Rule 1.2. *[ABA Model Rule 5.3, cmt. 4]*

**D10 (H)** A firm's e-discovery vendor changes its processing engine mid-case and the firm's search results shift. Under Sedona Principle 6 and FRCP 26(g), the responsibility for the reasonableness of the method:
a) moves to the vendor b) moves to the requesting party c) is waived by the change d) stays with the responding party and its signing lawyer, who are best placed to evaluate and must be able to explain the method — **d.** The responding party chooses and answers for its methods, and the signing lawyer certifies reasonableness. *[Sedona Principles, 3d ed. (2018), Principle 6; Fed. R. Civ. P. 26(g); CITED]*

**D11 (E)** ABA Informal Opinion 1384 describes closed-file destruction practice as including:
a) screening files before destruction, protecting confidentiality in the method, and keeping an index of what was destroyed b) destroying everything after two years c) returning nothing to clients d) keeping every file forever — **a.** The opinion sets no fixed period but expects screening, confidential disposal, an index and preservation of trust records; states set actual periods. *[ABA Informal Op. 1384; state rules set periods; CITED]*

**D12 (M)** In a state whose rule addresses file return, a firm tells a former client the file will be released once the outstanding invoice is paid. That state's rule:
a) permits the condition b) prohibits conditioning return of the file on payment c) requires payment before any copy d) is silent — **b.** The Minnesota rule prohibits conditioning file return on payment and limits duplication charges to those agreed in advance. *[Minn. R. Prof. Conduct 1.16(e) to (g); state-specific]*

**D13 (M)** A survey reported that about one in eight firms planned to replace a cloud tool within a year and about half were unsure. The design implication for a firm signing a new cloud contract is:
a) never sign cloud contracts b) replacement is rare, so exit terms do not matter c) plan the data export and exit path before signing because replacement is common enough to expect d) sign only one-year terms — **c.** The 2024 ABA Cloud Computing TechReport reported about 12 percent planning replacement and about 52 percent unsure. *[ABA TechReport 2024, Cloud Computing; CITED]*

**D14 (E)** A firm exports its e-signature records to a format that cannot be opened by the client. ESIGN provides that an electronic record may be denied legal effect if it:
a) is older than five years b) was signed on a phone c) lacks a notary d) is not in a form that can be retained and accurately reproduced for later reference by all parties entitled to retain it — **d.** 15 U.S.C. 7001(e) ties legal effect to retainability and reproducibility. *[15 U.S.C. 7001(e)]*

**D15 (M)** A retiring solo sells her practice. Model Rule 1.17 requires, as part of the transfer of client files, that each client receive:
a) written notice of the proposed sale, the client's right to retain other counsel or take possession of the file, and that consent is presumed if no objection within 90 days of notice b) a phone call c) nothing if the buyer is in the same building d) an invoice from the buyer — **a.** The rule conditions sale on written client notice with a 90-day deemed-consent mechanism; states vary in structure and detail (Minnesota, for example, places the notice in 1.17(d)). *[ABA Model Rule 1.17(c); state variants differ; REVIEWER FLAG: read ABA 1.17(c) primary text before approval, neither the pack author nor the audit read it]*

**D16 (H)** A New York firm dissolves and its partners disagree about who keeps the trust records. The state rule provides that:
a) the records may be discarded on dissolution b) dissolving firms must make appropriate arrangements for maintenance of the required records, which run for seven years c) the bank keeps the records d) the last partner to leave owns them — **b.** New York Rule 1.15 requires dissolving firms to arrange record maintenance and sets a seven-year retention. *[N.Y. Rule 1.15(d), (h), 22 NYCRR Part 1200; state-specific]*

**D17 (M)** A firm's title affiliate that is a covered financial institution changes its loan-servicing software. The FTC Safeguards Rule element that reaches that change is:
a) annual board report b) Qualified Individual designation c) change management procedures under 314.4(c)(7) d) penetration testing — **c.** Section 314.4(c)(7) requires procedures for change management; the Rule does not reach the practice of law itself. *[16 CFR 314.4(c)(7); ABA v. FTC, 430 F.3d 457 (D.C. Cir. 2005)]*

**D18 (M)** A business-associate firm migrates to a new DMS and plans to discard its old security policies and risk analyses. The HIPAA Security Rule requires that documentation be:
a) discarded on migration b) kept for one year c) kept only if the client asks d) retained for six years from creation or last effective date and available to those responsible for implementing it — **d.** 45 CFR 164.316 sets written documentation, six-year retention, and updates as needed. *[45 CFR 164.316]*

**D19 (E)** A managing partner approves a platform switch without understanding how matter data will move. Rule 1.1 comment 8 frames the competence duty as including:
a) keeping abreast of the benefits and risks associated with relevant technology b) personally coding the migration c) certifying vendors d) avoiding all new technology — **a.** The comment added technology benefits and risks to the duty to maintain competence. *[ABA Model Rule 1.1, cmt. 8]*

**D20 (H)** A firm gives an offshore data-processing vendor standing access to its matter system with little day-to-day supervision. ABA Formal Opinion 08-451 indicates that:
a) no client involvement is needed b) client disclosure and informed consent are required where outside providers will access Rule 1.6 information and the arrangement lacks the close supervision of a firm employee c) the vendor becomes the lawyer of record d) only the fee must be disclosed — **b.** The opinion requires due diligence, supervision, and client consent where confidential information is shared without close supervision. *[ABA Formal Op. 08-451 (2008)]*

---
### Audit provisional candidates (superseded 2026-10-11 by the charter-tagged six in the Bank stats header line): C4, C10, C15, B9, D6, chosen for medium difficulty and public-domain sources; survey-figure items excluded.

### Bank source list
1. The NIST Cybersecurity Framework (CSF) 2.0, NIST CSWP 29, NIST, February 26, 2024, https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf, PUBLIC_DOMAIN
2. Security and Privacy Controls for Information Systems and Organizations, NIST SP 800-53 Rev. 5, NIST, September 2020 (release 5.2.0, August 27, 2025), https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final, PUBLIC_DOMAIN
3. Digital Identity Guidelines: Authentication and Authenticator Management, NIST SP 800-63B-4, NIST, August 2025, https://pages.nist.gov/800-63-4/sp800-63b.html, PUBLIC_DOMAIN
4. Guidelines for Media Sanitization, NIST SP 800-88 Rev. 2, NIST, September 2025 (supersedes Rev. 1, December 2014), https://csrc.nist.gov/pubs/sp/800/88/r2/final, PUBLIC_DOMAIN
5. Protecting Controlled Unclassified Information in Nonfederal Systems and Organizations, NIST SP 800-171 Rev. 3, NIST, May 14, 2024, https://csrc.nist.gov/pubs/sp/800/171/r3/final, PUBLIC_DOMAIN
6. Standards for Internal Control in the Federal Government (Green Book), GAO-25-107721, GAO, May 15, 2025, https://www.gao.gov/assets/gao-25-107721.pdf, PUBLIC_DOMAIN
7. Assessing Data Reliability, GAO-20-283G, GAO, December 16, 2019, https://www.gao.gov/products/gao-20-283g, PUBLIC_DOMAIN
8. Federal Rules of Civil Procedure 5, 5.2, 26, 34, 37, Administrative Office of the U.S. Courts, as amended through December 1, 2025, https://www.law.cornell.edu/rules/frcp, PUBLIC_DOMAIN
9. Federal Rules of Evidence 502, 901, 902, Administrative Office of the U.S. Courts, current edition (902(13) and (14) effective December 1, 2017), https://www.law.cornell.edu/rules/fre, PUBLIC_DOMAIN
10. Electronic Signatures in Global and National Commerce Act, 15 U.S.C. 7001, Pub. L. 106-229, June 30, 2000, https://www.govinfo.gov/content/pkg/USCODE-2023-title15/html/USCODE-2023-title15-chap96-subchapI-sec7001.htm, PUBLIC_DOMAIN
11. Standards for Safeguarding Customer Information, 16 CFR Part 314, FTC, amendments effective June 9, 2023 and May 13, 2024, https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314, PUBLIC_DOMAIN
12. Security Standards for the Protection of Electronic Protected Health Information, 45 CFR Part 164 Subpart C, HHS, current eCFR, https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C, PUBLIC_DOMAIN
13. Cyber Essentials, CISA, November 2019, https://www.cisa.gov/sites/default/files/publications/19_1106_cisa_CISA_Cyber_Essentials_S508C_0.pdf, PUBLIC_DOMAIN
14. ABA v. FTC, 430 F.3d 457 (D.C. Cir. 2005), U.S. Court of Appeals for the D.C. Circuit, December 6, 2005, https://law.justia.com/cases/federal/appellate-courts/F3/430/457/505455/, PUBLIC_DOMAIN (opinion; reporter pagination CITED)
15. ABA Model Rules of Professional Conduct, Rules 1.1, 1.4, 1.5, 1.6, 1.7, 1.10, 1.15, 1.16, 1.17, 5.1, 5.3 and Comments, American Bar Association, current edition, https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/, CITED
16. ABA Formal Opinion 512, Generative Artificial Intelligence Tools, ABA Standing Committee on Ethics and Professional Responsibility, July 29, 2024, https://www.americanbar.org/content/dam/aba/administrative/professional_responsibility/ethics-opinions/aba-formal-opinion-512.pdf, CITED
17. ABA Formal Opinion 477R, Securing Communication of Protected Client Information, ABA, May 22, 2017, https://www.americanbar.org/content/dam/aba/administrative/professional_responsibility/aba_formal_opinion_477.pdf, CITED
18. ABA Formal Opinion 483, Lawyers' Obligations After an Electronic Data Breach or Cyberattack, ABA, October 17, 2018, https://www.americanbar.org/content/dam/aba/administrative/professional_responsibility/ethics-opinions/aba-formal-op-483.pdf, CITED
19. ABA Formal Opinion 498, Virtual Practice, ABA, March 10, 2021, https://www.hklaw.com/en/insights/publications/2021/03/aba-offers-general-guidance-for-virtual-law-practices (summary; primary on americanbar.org), CITED
20. ABA Formal Opinion 08-451, Lawyer's Obligations When Outsourcing Legal and Nonlegal Support Services, ABA, August 5, 2008, https://www.americanbar.org/products/ecd/chapter/220013/, CITED
21. ABA Informal Opinion 1384, ABA, 1977 (REPORTED date), summarized at https://www.nhbar.org/resources/ethics/ethics-corner-practical-ethics-articles/1999-03/, CITED
22. The Sedona Principles, Third Edition, 19 Sedona Conf. J. 1, The Sedona Conference, 2018, https://www.thesedonaconference.org/sites/default/files/publications/The%20Sedona%20Principles%20Third%20Edition.19TSCJ1.pdf, CITED
23. The Sedona Conference Commentary on Legal Holds, Second Edition: The Trigger & The Process, The Sedona Conference, June 2019, https://www.thesedonaconference.org/publication/Commentary_on_Legal_Holds, CITED
24. Uniform Electronic Transactions Act, Uniform Law Commission, 1999, https://www.uniformlaws.org/committees/community-home?CommunityKey=2c04b76c-2b7d-4399-977e-d5876ba7e034, CITED
25. Minnesota Rules of Professional Conduct 1.15, Appendix 1, and 1.16, Minnesota Supreme Court via Revisor, amendments through July 1, 2025, https://www.revisor.mn.gov/court_rules/pr/subtype/cond/id/1.15/ and https://www.revisor.mn.gov/court_rules/rule/prcond-a0/, CITED (state-specific)
26. New York Rules of Professional Conduct 1.15, 22 NYCRR Part 1200, effective May 12, 2021, https://www.law.cornell.edu/regulations/new-york/22-NYCRR-1200.1.15, CITED (state-specific)
27. California Rule of Professional Conduct 1.15 and Standards, State Bar of California, operative November 1, 2018, https://www.calbar.ca.gov/Portals/0/documents/rules/Rule_1.15-Exec_Summary-Redline.pdf, CITED (state-specific)
28. North Carolina State Bar 2024 Formal Ethics Opinion 1, Use of Artificial Intelligence in a Law Practice, November 1, 2024, https://www.ncbar.gov/for-lawyers/ethics/adopted-opinions/2024-formal-ethics-opinion-1/, CITED (state-specific)
29. Illinois State Bar Association Opinion 16-06 (cloud storage), 2016, opinion PDF at https://www.isba.org/sites/default/files/ethicsopinions/16-06.pdf, CITED (state-specific)
30. COSO Enterprise Risk Management: Integrating with Strategy and Performance, Executive Summary, COSO, June 2017, https://www.coso.org/_files/ugd/3059fc_61ea5985b03c4293960642fdce408eaa.pdf, CITED
31. 2024 Cloud Computing TechReport, ABA Law Practice Division, 2025 (reporting the 2024 Legal Technology Survey), https://www.americanbar.org/groups/law_practice/resources/tech-report/2024/2024-cloud-computing-techreport/, CITED
32. Law Firm KPI Benchmarks (2025 Legal Trends data), Clio, 2025, https://www.clio.com/resources/legal-trends/benchmarks/, CITED
33. 2025 Technology Survey Executive Summary, ILTA, September 2025, https://bmtcorp.com/wp-content/uploads/2026/01/2025_ILTA_Executive_Summary_FINAL.pdf, CITED (context only; no item rests solely on it)

### Counts: total 90; E 27; M 45; H 18; correct-letter spread a/b/c/d = 23/23/22/22
