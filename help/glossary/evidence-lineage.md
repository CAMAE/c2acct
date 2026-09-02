---
id: G08
title: Evidence Lineage
audience: all-signed-in
depth: CORE
vertical: global
words: 2898
---

Evidence lineage is PAT's rule that every number displayed anywhere on the platform must trace back to an identifiable source: the assessment it came from, the declaration it responds to, and the data class it belongs to. If a figure cannot show where it came from, it does not appear — a discipline summarized inside PAT as the no-orphan-numbers rule. Lineage is what turns a displayed score, delta, or benchmark from an assertion into evidence.

## What evidence lineage means

Evidence lineage is the property that every displayed number in PAT can be followed back to its origin. The origin has two dimensions. The first is the source material itself: a vendor's structured declaration of product capability, a firm's assessment responses, or both together, as with the alignment delta, which is computed from the gap between what a vendor declared and what firms assessed. The second dimension is the data class the source belongs to — production, pilot, or demo — because those three classes are strictly separated in PAT, and only production data can stand behind a published benchmark.

The companion principle is the no-orphan-numbers rule: no figure appears on any surface without a source it can point to. A score exists because a specific set of assessment answers produced it through deterministic arithmetic. A delta exists because a specific declaration and specific assessed experience diverged. A benchmark exists because a qualifying cohort of contributors supplied production data. There is no category of PAT number that simply is; every one descends from something a participant actually stated or answered.

## Why evidence lineage exists

Evidence lineage exists because PAT's founding stance is "evidence, not advertising." In the accounting ecosystem PAT serves — firms, the software vendors who serve them, and the consultants who manage firm ecosystems — numbers about product capability and operational maturity carry real weight in real decisions. A number without a traceable source is functionally an advertisement: it asks to be believed rather than checked. PAT's answer is structural. Vendors make structured declarations rather than open-ended claims; firm assessments verify those declarations from lived experience; and every figure that reaches a screen must be able to show which of those sources it descends from.

Lineage also protects readers from a subtler failure: a true number presented without the context that tells you how much weight it can bear. That is why lineage in PAT travels with two kinds of accompanying information. Signal-integrity checks ride alongside scores, so a reader knows whether the response patterns behind a result were sound. And benchmark publication rules ensure that any comparison figure a reader sees came from a cohort of at least five contributors, with no single contributor supplying more than a quarter of the data. A number you can trace, whose response quality you can see, and whose cohort met publication standards is a very different object from a bare statistic.

## How lineage works in practice

Lineage in PAT rests on three sheet-level mechanisms working together.

First, deterministic scoring makes every trace reproducible. PAT scores are computed by deterministic arithmetic on a 0–100 scale, with no AI model anywhere in the scoring path; the same answers always produce the same score. That means the lineage of a score is not merely a citation — it is a recomputable path. Given the same underlying responses, the arithmetic lands in the same place every time, so a traced number can always be reconciled with its source.

Second, data-class separation keeps lineage honest at the source. Production, pilot, and demo data are strictly separated, and demo or synthetic data and pilot data never enter published benchmarks. Because the class of every piece of source data is known, the class of every derived number is known too. A published benchmark figure is, by construction, a production-data figure; nothing synthetic or exploratory can leak into it upstream and quietly corrupt what the number appears to say.

Third, the structured declaration-and-verification model gives every alignment figure a two-sided anchor. A vendor's declaration is a structured statement of product capability, not free-form marketing text. Firm assessments then measure the experienced reality of that capability. The alignment delta between them flows both ways — a product can outperform its declaration as well as underperform it — and either way, the delta a reader sees traces to a specific declaration on one side and specific assessed experience on the other.

The same principle extends beyond numbers into assistance. Ask Pat, the platform's assistant, answers only from PAT's own documented content, and when it lacks documented evidence it says so rather than guessing. Lineage for prose works the way lineage for numbers works: nothing is asserted that cannot be pointed at.

## Lineage for words, not only numbers

Evidence lineage in PAT governs written content as well as figures. Learning and assessment module content must cite authoritative sources to enter the system at all: unsourced content is rejected mechanically at import, before any editorial judgment is applied. The gate is structural, which is the point — content without a source cannot become PAT content any more than a number without a source can reach a PAT screen. Clearing the import gate is still not enough for content to serve. Content goes live only after a named human reviewer has signed it off, and that review discipline is itself recorded: who reviewed the content, and when. A piece of content that serves inside PAT therefore carries a double trail — the authoritative sources it cites, and the recorded sign-off of the person who reviewed it.

This content discipline reaches everything that can serve to a firm, including the adaptive modules PAT defines at concept level — the short diagnostic, strength, and remediation modules that can open based on a firm's scoring pattern. All adaptive-module content is reviewed and sourced before it can serve; nothing opens for a firm that has not passed that review.

Ask Pat closes the loop on the assistance side. Its answers cite the documented content they draw from, so a user can see where an answer came from, exactly as a displayed number can show where it came from. Each role's Pat retrieves only that role's permitted content, enforced at the data layer, and when documentation does not cover a question, Pat says so plainly rather than improvising. Traceable numbers, sourced and human-reviewed content, and citing answers are three expressions of one rule.

## Lineage and data stewardship

Evidence lineage traces a displayed number forward from its source; data stewardship governs who that source material belongs to and what happens to it over time. In PAT the two disciplines are designed to fit together. Tenants' data belongs to them. When a tenant leaves the platform, their data is removed, and the removal is receipted — departure produces a record, not a shrug. Stewardship, in other words, has its own lineage: even the act of removal traces to an accountable event.

What survives a tenant's departure are only the anonymous benchmark aggregates that had already passed PAT's suppression rules — the requirement of at least five contributors per cohort with no single contributor supplying more than a quarter of the data. Those aggregates remain aggregate: individual contributions are not reconstructable from them. This is why traceability and anonymity can coexist without tension. The lineage of a published benchmark runs to its data class and to the cohort standards it met, never to an identifiable contributor, because contributors are anonymous within benchmarks by rule. A reader can trust both facts at once: every published figure rests on qualifying production data, and no published figure can be worked backward to expose the firms that supplied it.

## Design rationale — why evidence lineage was built this way

Two convictions from PAT's design underpin evidence lineage, and both are worth stating plainly, because the discipline makes little sense without them.

The first is that a number whose origin cannot be traced is marketing. That is not a rhetorical flourish; it is a working definition. A figure that asks to be believed without offering a way to be checked is doing the job of advertising regardless of who displays it or how sober it looks. PAT's founding stance — evidence, not advertising — therefore had to be enforced somewhere structural, and lineage is that enforcement: every displayed figure must be able to answer the question "where did you come from," and a figure that cannot answer does not display. The rule is aimed at the platform itself as much as at any participant. PAT does not exempt its own surfaces from the standard it applies to vendor claims: a benchmark, a delta, and a score are held to the same no-orphan discipline as a declaration.

The second conviction extends the first from numbers to words. The accounting profession is built on standards, and in such a profession content is only as trustworthy as its sources. This is why the sourced-content gate is mechanical rather than editorial: unsourced material is rejected at import, before any human judgment enters, so trustworthiness never depends on a reviewer's mood or workload on a given day. Human judgment then arrives where it belongs — as a named sign-off, recorded with who reviewed and when — so the accountability trail behind a piece of content is as inspectable as the arithmetic trail behind a score. Machine enforcement where consistency matters, named human review where judgment matters, and a record of both: that division of labor is the sourced-content rationale in one sentence, and it is the same shape as lineage itself — a structural gate first, an accountable human trail alongside it.

## A worked example

The names in this example are invented for illustration. Suppose a consultant reviewing an ecosystem sees an alignment delta for a product called Cloudform Books, showing that firms' assessed experience of an integration capability sits below what the vendor declared. Following the lineage of that delta, the consultant finds a two-sided trail. On one side sits Cloudform Books' structured declaration of the capability. On the other side sit the assessment results of contributing firms — say a firm scoring 62 on Integration — each produced by deterministic arithmetic from that firm's own answers, each drawn from production data, and each accompanied by its signal-integrity indication.

Now suppose the same consultant looks for a benchmark cut to put those results in context, and the cut in question has only four contributors. The cut displays as suppressed. That suppression is lineage doing its job at the publication boundary: rather than showing a number whose provenance could not bear the weight of comparison, PAT shows no number at all. The reader ends the session knowing exactly what every visible figure rests on — and knowing that the figures which could not meet that standard were withheld, not padded.

The trail can be followed one step further, into prose. Suppose the consultant, wanting to be precise before discussing the delta with the vendor, asks Ask Pat how an alignment delta is computed. The answer draws on PAT's documented content and cites the documentation it came from, so the consultant can see the source of the explanation just as they saw the sources of the numbers. Had the question wandered somewhere the documentation does not cover, Pat would have said so plainly rather than guessed — the prose counterpart of a suppressed benchmark cut: no source, no assertion.

Finally, imagine that some quarters later one of the contributing firms leaves PAT. As a tenant, its data belongs to it, so departure means removal — and the removal is receipted. The benchmark aggregates that had already published under the suppression rules remain aggregate; nothing in them permits reconstructing the departed firm's individual contribution. Lineage held while the firm was present, tracing every derived figure back to production-class sources; stewardship holds at the exit, closing the account with a record rather than a residue. The consultant's remaining views still trace cleanly, because every number they contain descends from data that is still supposed to be there.

## What evidence lineage is not

Evidence lineage is not an audit, a certification, or any form of legal or compliance attestation; it is an internal design discipline about where displayed numbers come from, not a professional opinion about a firm or product. Lineage is not a promise of outcomes: the fact that a number is traceable says what the number rests on, not what acting on it will achieve. Nor is a citation a substitute for review: an authoritative source gets content past the mechanical import gate, but nothing serves until a named human reviewer has signed it off, with that sign-off recorded.

Evidence lineage is also not a de-anonymization mechanism. Contributors to benchmarks remain anonymous within those benchmarks; tracing a benchmark figure to its data class and cohort standards does not expose which firms contributed. Nor is lineage an accusation engine — the signal-integrity flags that travel with scores are information about how much weight a result can bear, not judgments about the people who answered. Finally, lineage is not machine-generated provenance: because no AI model sits in the scoring path, the trail behind a number is arithmetic and source data, not a model's account of itself.

## Common misconceptions about evidence lineage

A first misreading treats lineage as a dispute mechanism — something a reader invokes only when a number looks wrong. Lineage is a standing property, not a remedy: every displayed figure carries its trace from the moment it appears, whether or not anyone ever questions it. The aim is not to adjudicate arguments about numbers but to display only numbers that never need arguing over.

A second misreading takes a suppressed benchmark cut as a sign of missing or lost data — a gap, an error, a report left unfinished. Suppression is lineage working at the publication boundary. The cut had fewer than five contributors, or a single contributor supplied more than a quarter of its data, so the figure could not meet the standard every displayed number must meet. What the reader sees is a deliberate withholding, not an absence.

A third misreading assumes lineage applies only to benchmark figures, on the theory that shared numbers need provenance while private ones do not. In fact the rule covers every displayed number. A single firm's own score traces to its own assessment answers through deterministic arithmetic; an alignment delta traces to a specific declaration and specific assessed experience; a benchmark traces to its data class and cohort standards. No surface is exempt.

A fourth misreading concludes from Ask Pat's citations that Pat produces the figures it discusses. Pat never generates scores; it assists with understanding, answering from PAT's documented content only, and its citations show which documentation an answer draws from — the same relationship a displayed number has to its sources, applied to prose.

A fifth misreading holds that demo or pilot data could appear in published figures so long as it were labeled as such. PAT's separation is stricter than labeling: production, pilot, and demo data are strictly separated, and demo, synthetic, and pilot data never enter published benchmarks at all. Because the class of every source is known, the class of every derived number is known — and only production data stands behind anything published.

## Questions this article answers

What is evidence lineage in PAT? It is the rule that every displayed number must trace back to an identifiable source — the assessment it came from, the declaration it responds to, and the data class it belongs to.

What is the no-orphan-numbers rule? It is the companion principle that no figure appears on any PAT surface without a source it can point to; a number that cannot show where it came from does not display.

Can a published benchmark include demo or pilot data? No. Production, pilot, and demo data are strictly separated, and only production data stands behind published benchmarks.

How does deterministic scoring support lineage? Because the same answers always produce the same score, the trail behind a score is recomputable, not merely citable — a traced number can always be reconciled with its source.

Does evidence lineage apply to written content as well as numbers? Yes. Content must cite authoritative sources to enter the system — unsourced content is rejected mechanically at import — and it goes live only after a named, recorded human review sign-off.

Can a benchmark figure be traced back to an individual contributing firm? No. Contributors are anonymous within benchmarks, and aggregates that passed suppression remain aggregate — individual contributions are not reconstructable from them.

What happens when a benchmark cut fails the publication standards? The cut shows as suppressed rather than displaying a number whose provenance could not bear the weight of comparison.

What does Ask Pat do when documentation does not cover a question? It says so plainly rather than guessing — the prose counterpart of a suppressed cut: no source, no assertion.

What happens to a tenant's data when the tenant leaves PAT? The data is removed and the removal is receipted; only anonymous aggregates that had already passed suppression remain, and they stay aggregate.

## Related terms

Alignment Delta, the two-sided figure whose lineage runs to a declaration and an assessment. Benchmark Suppression, the publication rule that withholds cuts whose sourcing cannot bear comparison. Benchmark Cohort, the contributor group behind any published comparison figure. Integrity Score, the response-quality signal that accompanies scores along their lineage. Capability, the declared construct that firm assessment verifies. Band, the presentation layer that leads while traced raw numbers support.
