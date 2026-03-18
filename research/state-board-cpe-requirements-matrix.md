# State Board CPE Requirements Matrix

Accessed: 2026-03-16

## Official-source facts

This matrix is intentionally selective rather than pretending to be a 50-state survey. It covers six states with directly reviewed board materials.

| State | Official source URL(s) | Core requirement signal | Evidence / audit signal | AAE implication |
| --- | --- | --- | --- | --- |
| California | https://www.dca.ca.gov/cba/licensees/ce-requirements.shtml | Board-defined CE requirements govern renewal and licensure status | Board-level compliance framing; state-specific requirements matter | AAE must stay state-configurable |
| Virginia | https://boa.virginia.gov/wp-content/uploads/2025/07/CPE-Informational-Handout.pdf | Board handout details annual/triennial treatment and carryforward | Documentation and compliance specifics are explicit | Completion evidence must be exportable |
| Illinois | https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/faq/dpr/cpa-cpe-faqs-6-28-18.pdf | 120 hours per three-year renewal period with ethics requirement | FAQ and reporting form show board documentation posture | Three-year reporting is a needed future config seam |
| Illinois | https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/renewals/apply/forms/f1574-cpa-conted.pdf | Reporting form reflects category and sponsor expectations | Renewal documentation matters, not just learner completion | Course records need sponsor/source metadata |
| New York | https://www.op.nysed.gov/professions/certified-public-accountants/mce-questions-answers | 24 concentrated hours or 40 mixed hours, plus ethics | Acceptable providers and recognized subject areas are tightly framed | AAE should support concentrated-track and mixed-track reporting |
| New York | https://www.op.nysed.gov/professions/certified-public-accountants/laws-rules-regulations/part-70 | Part 70 provides regulatory detail behind continuing education | Legal text matters beyond summary FAQs | Regulatory references should be preservable per module |
| Texas | https://www.tsbpa.texas.gov/php/fpl/options/CPEGuidelines.html | Technical/non-technical classification and method limits are operationalized | Licensees must retain evidence and classify courses correctly | AAE should preserve content-type metadata and completion records |
| Texas | https://www.tsbpa.texas.gov/pdffiles/br/br202505.pdf | Texas board material emphasizes evidence retention and sponsor name/id | Board can verify and discipline for under-reporting | AAE needs certificate-grade completion artifacts |
| Texas | https://www.tsbpa.texas.gov/info/submitCPE.html | Report-CPE workflow makes ongoing status visible to licensees | Operational reporting posture is explicit | AAE future integration should aim for clean reporting exports |
| Florida | https://www2.myfloridalicense.com/certified-public-accounting/licensure/continuing-professional-education/ | 80 hours in two years with provider and course treatment | Committee review, provider lists, and ethics treatment are explicit | Florida-like provider governance cannot be implied by content alone |
| Florida | https://www2.myfloridalicense.com/cpa/documents/CPEGuidelines.pdf | Florida categories include accounting/auditing, technical business, behavioral, ethics | Board-approved ethics is distinct and enforceable | Ethics modules need separate metadata and stronger validation |
| Florida | https://www2.myfloridalicense.com/certified-public-accounting/annual-cpe-audit/ | Annual audit process requires proof of completed hours | Audit-ready evidence is mandatory | AAE should retain learner evidence, timestamps, and source references |

## Cross-state conclusions

- State variability is material, not cosmetic.
- Ethics treatment varies and often requires board-approved or specifically acceptable coursework.
- Provider acceptance varies by board, sponsor status, and subject area.
- Documentation and auditability are recurring themes across every state reviewed.
- AAE can honestly claim `state-configurable compliance path`; it cannot honestly claim `universally accepted CPE delivery`.

## Design recommendations

- Preserve one canonical learning architecture with state overlays.
- Store at minimum:
  - field of study
  - instructional method
  - completion timestamp
  - source/citation reference
  - question or assessment version
  - evidence artifact ID
- Add future state-board configuration tables only when actual sponsor-governance work starts.
