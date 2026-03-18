# Module 5: Delivery, Evidence, and Automation Operations

## Position

This module is part of an internal professional-learning package. It is designed to be CPE-ready in architecture and accreditation-aligned in structure, but it does not claim approved CPE credit.

## Field of Study Focus

Information Technology / Regulatory Ethics

## Module Purpose

Translates the research and architecture into an execution model that can run headlessly, preserve evidence, and remain Mac mini friendly.

## Learning Objectives

- Explain why delivery infrastructure and evidence infrastructure belong together.
- Identify what must be retained for learner proof, operational proof, and review proof.
- Connect Mac mini automation practices to serious institutional operation.

## Key Topics

### Launchd-first automation
- Principle: macOS background automation should prefer launchd-oriented job design over ad hoc scheduling patterns.
- Operational implication: Package recurring jobs with explicit labels, logs, and non-interactive behavior suited to launchd.
- Required evidence artifact: A launchd-ready job wrapper with stable label, stdout and stderr capture, and exit codes.
- Primary failure risk: Background execution becomes fragile, opaque, or host-specific.
- Why it matters: On macOS, operational reliability depends on using the platform-supported job model correctly.
- Source: SRC18 | Apple Creating Launchd Jobs | https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html

### Learning-evidence retention
- Principle: Completion records, source maps, and versioned assessments are part of the learning deliverable.
- Operational implication: Store learner evidence so it can be exported, audited, and reconciled to the active content version.
- Required evidence artifact: A completion record linking learner, module, assessment version, source map, and score.
- Primary failure risk: The platform can show a badge but cannot defend why it was earned.
- Why it matters: A professional-learning result is only as strong as the evidence that explains it.
- Source: SRC01 | NASBA / AICPA / QAS CPE Standards | https://www.nasbaregistry.org/sponsor/site/docs/CPEStandards.pdf

### Institutional review loops
- Principle: Operational learning systems need review cadence, not only initial content publication.
- Operational implication: Set review checkpoints for content currency, source validity, and assessment performance.
- Required evidence artifact: A dated review log showing when content, thresholds, and sources were revalidated.
- Primary failure risk: The corpus drifts away from the current standards it claims to reflect.
- Why it matters: Institutional credibility weakens when review is implied rather than documented.
- Source: SRC03 | AACSB Business Accreditation Standards | https://www.aacsb.edu/accredited/standards/business

### Business recordkeeping
- Principle: Recordkeeping supports statements, operations, and compliance at the same time.
- Operational implication: Treat learning evidence as part of the platform's wider recordkeeping and reporting posture.
- Required evidence artifact: Retention rules that specify what is stored, for how long, and why.
- Primary failure risk: Evidence is created but not retained long enough to support later operational or regulatory needs.
- Why it matters: Records matter because future review almost never occurs at the moment the activity happens.
- Source: SRC19 | IRS Recordkeeping Guidance | https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping

### Control-backed operations
- Principle: Operational controls should make failures visible early and support remediation before trust erodes.
- Operational implication: Monitor nightly learning jobs, export jobs, and verification jobs with structured status reporting.
- Required evidence artifact: A job health record showing last run, outcome, retries, and next action.
- Primary failure risk: Automation silently degrades while the interface still implies system health.
- Why it matters: Controls are only effective if failure states become observable and actionable.
- Source: SRC13 | GAO Green Book | https://www.gao.gov/greenbook

## Assessment Structure

- Reading completion is required before the quiz is treated as eligible.
- This module contributes 25 source-backed question-bank items and 10 quiz items.
- Questions are tied to explicit topics rather than generic engagement prompts.

## Source List

- SRC18: Apple Creating Launchd Jobs | https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
- SRC01: NASBA / AICPA / QAS CPE Standards | https://www.nasbaregistry.org/sponsor/site/docs/CPEStandards.pdf
- SRC03: AACSB Business Accreditation Standards | https://www.aacsb.edu/accredited/standards/business
- SRC19: IRS Recordkeeping Guidance | https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping
- SRC13: GAO Green Book | https://www.gao.gov/greenbook
