---
id: G01
title: Alignment Delta
audience: all-signed-in
depth: CORE
vertical: global
words: 2993
---

The alignment delta is the measured gap between a vendor's declared product capability and firms' assessed experience of that capability. It is a signed quantity in effect if not in ceremony: it flows both ways, because a product can outperform its declaration just as it can underperform it. The delta is the central measurement PAT exists to produce, and everything else in the platform — declarations, assessments, evidence lineage, benchmarks — either feeds it or gives it context.

## Definition of the alignment delta

The alignment delta is the measured difference between two positions on the same capability: the position a vendor declares for its product, and the position firms report through their assessed experience of that product in operation. Both positions are structured — the declaration is a structured statement of capability, not marketing copy, and the firm side comes from assessments scored by deterministic arithmetic on a 0–100 scale. Because the delta is a gap between two measurements rather than a judgment about either party, it carries no inherent blame. A delta in the vendor's favor means firms are experiencing more than was declared; a delta against means firms are experiencing less. Either direction is information both sides can use.

## Why the alignment delta exists

The alignment delta exists because declared capability and experienced capability are routinely different things, and the accounting ecosystem had no structured way to measure that difference. PAT's philosophy is "evidence, not advertising": a vendor's claim about its product is treated as a structured declaration to be verified by firm assessments, not as a statement to be taken on trust. Without a delta, a vendor cannot know whether its product is landing as intended, a firm cannot distinguish a product problem from an adoption problem in any comparable way, and a consultant managing an ecosystem of firms cannot see where the group's tool stack is genuinely serving it. The delta turns "does this product do what it says?" from an argument into a measurement — and because it flows both ways, it also surfaces the quieter case where a product is delivering more than its vendor thought to claim. For firms, that same measurement works in reverse: it distinguishes tools that quietly overdeliver from tools whose declarations run ahead of the experience, using the firms' own assessed evidence rather than anyone's assertion.

## How the alignment delta is computed

The alignment delta is computed from two inputs, both of which are structured data inside PAT. On one side sits the vendor's declaration: a structured statement of what the product can do. On the other side sits firms' assessed experience: firm assessments are answered on a consistent numeric scale and scored by deterministic arithmetic from 0 to 100, with no AI model anywhere in the scoring path, so the same answers always produce the same score. The delta is the measured gap between the declared position and the assessed experience, and it can run in either direction.

Several platform rules shape what a delta is allowed to rest on. Every displayed number in PAT traces to its sources under evidence lineage — there are no orphan numbers, and a delta is a displayed number like any other. Signal-integrity checks accompany scores, so a reader of a delta knows how much weight the underlying firm responses can bear; an integrity flag is information, not an accusation. And data boundaries apply: production, pilot, and demo data are strictly separated, so demo and pilot material never contaminates the assessed-experience side of a real delta. Open-ended assessment questions carry zero score weight — they are qualitative only — so the delta rests entirely on the numerically scaled responses. The consistency of the assessment design matters here too: the repeated question set across modules is what makes assessed experience comparable across the five pillars, which in turn is what lets a declared capability be met by firm-side evidence measured on a consistent footing.

Each input has its own internal structure, and knowing it clarifies what a delta actually rests on. The firm side comes from a five-module, 100-question structured assessment: twenty scored questions per module, worded identically across all five modules on purpose, with the module supplying the context — so "this area" means integration and data flow in one module and governance in another while the instrument itself stays constant. Each module covers its pillar through those twenty scored questions plus a small set of open-ended questions that carry zero score weight and exist to capture context in the firm's own words; none of that qualitative material enters the arithmetic behind a delta. The vendor side is structured too: vendors declare capabilities across defined function areas of practice software, so the declared position a delta measures against is specific to a function area rather than a product-wide claim. A delta is therefore a gap between two positions that were both built to be measured — not a comparison between a slogan and a survey.

Presentation follows the same discipline as every other number in PAT. Firm-side scores present through five bands — Early, Developing, Building, Established, Leading — with the band leading and the raw 0–100 number in support, and the assessed-experience side of a delta is read against that presentation. The delta itself remains a measured quantity underneath: deterministic on the firm side, structured on the vendor side, traceable on both.

## How the alignment delta moves over time

A delta is a reading at a point in time, not a permanent label — because the assessed-experience side of it is. PAT treats every score that way: assessments can be re-taken as operations change, the assessment experience itself is a paged flow with autosave in which modules can be completed in any order over time, and results update as modules complete. When a firm re-assesses, the assessed-experience side of any delta resting on its scores refreshes with it, while the declaration side stays wherever the vendor last set it. Movement in a delta can therefore come from either shore: firms' experience shifting, or a vendor revising its declared position to match measured reality.

Band movement is the intended long-term reading. A firm re-assessing across quarters can see whether an area moved — for example, from Developing to Building — and a vendor watching its alignment evidence across the same quarters can see whether the gap between declaration and experience is closing, holding, or widening. At Elite, interpretive surfaces extend this reading at concept level: how scores are trending across assessments, and where a firm sits within a distribution of peers when benchmarks publish under the suppression rules. None of that changes what the delta is; it changes how much history a reader can see behind it. A shrinking delta over time describes alignment as measured — it is evidence of convergence, never a guarantee of any outcome.

## Who sees the alignment delta

Visibility of the delta is role-scoped, like everything else in PAT. Vendors receive structured, evidence-based views of where alignment holds and where it diverges — the form of the delta most useful in honest sales and product conversations, because every number in those views traces to its sources. Firms see their own assessed experience and how it meets the declarations of the products they use. Consultants and ecosystem owners see alignment signal across the set of firms they manage, at concept level through per-firm cards summarizing alignment status, structured firm briefs for deeper review, and cross-ecosystem comparison views — structure and signal, not a firm's private answer text beyond what the role permits.

Ask Pat sits alongside all three views in the same role-scoped way: it can help a signed-in user understand what a delta means using that role's documented content, and its answers cite the documented content they draw from — but it never generates a delta, a score, or any other number. The delta a user sees always came from the measurement machinery, never from the assistant.

## Design rationale — why the delta was built this way

The delta's construction follows from what it has to survive: being quoted, in sales conversations and ecosystem reviews, by parties with opposite interests in its direction. That is why evidence lineage is not decoration here. A number whose origin cannot be traced is marketing, and a delta would decay into marketing if it could not answer "where did you come from" — so every delta traces to a specific declaration on one side and specific firm assessments on the other, with no orphan numbers in the chain.

Determinism on the firm side exists for the same reason. A measurement must be repeatable and auditable; model behavior can shift over time, and a score that could read the same answers differently on different days would be an opinion with a timestamp, not a measurement. A delta resting on such a score would inherit the opinion. Because the firm side is deterministic arithmetic — same answers, same score, every time — a disputed delta can be re-derived rather than re-argued.

Two quieter choices protect the delta's comparability. Open-ended answers carry zero score weight because qualitative context should inform human judgment, not sway arithmetic: a firm's own words travel with its results but cannot tilt the number a declaration is measured against, keeping deltas comparable across firms that wrote much and firms that wrote little. And the identical question stems across all five modules mean the instrument never changes — only the lens does. If wording varied by pillar, a delta in one function area could differ from a delta in another partly through phrasing artifacts; with a constant instrument, the gap a delta reports is a gap in experience, not in vocabulary.

Finally, the delta refreshes because a permanent label would be false. Operations change, products change, declarations can be revised — so the honest design treats every reading as a point in time, with re-assessment on a working rhythm keeping the delta describing the present rather than embalming the past.

## A worked example

The names and numbers here are invented for illustration. Suppose a vendor, Harborlight Software, makes a structured declaration about its practice-management product's data-flow capability — the territory PAT's Integration pillar assesses. Now suppose the firms using that product complete their assessments, and their assessed experience of integration and data flow comes out around 62 on the 0–100 scale — solidly mid-range, but noticeably below the position Harborlight declared. That gap is an alignment delta running against the declaration: firms are experiencing less than was declared.

What happens next is where the delta earns its keep. Harborlight receives alignment evidence rather than a complaint: a measured, traceable gap it can investigate — is the shortfall in the product, in how firms have implemented it, or in what the declaration assumed? Meanwhile, imagine a second illustrative vendor, Kestrel Books, whose declared position was modest but whose firms' assessed experience comes out above it. Kestrel's delta flows the other way: the product is outperforming its declaration, which is evidence the vendor is under-claiming a genuine strength. In both cases the delta traces to its sources — the declaration on one side, the firm assessments on the other — and any signal-integrity flags on the firm responses travel with it, so every reader knows exactly what the number rests on.

It is worth walking the mechanics of the Harborlight case one layer down. The declaration side is structured across defined function areas of practice software, and the data-flow function area is the one at issue here — Harborlight declared a specific position for it, not a general boast about the product. The firm side came from each participating firm completing the Integration & Data Flow Maturity module: twenty scored questions on a consistent numeric scale, worded identically to the questions in the other four modules, with the module supplying the integration context. Deterministic arithmetic turned each firm's answers into a 0–100 score — the same answers would produce the same score every time — and the open-ended questions those firms also answered contributed context but no score weight. The 62 that anchors this example presents the way every PAT score presents, band first with the number in support. Suppose one participating firm's responses tripped a straight-lining check: that firm's result carries an integrity flag, the flag travels with the delta, and a reader weighing Harborlight's evidence knows exactly how much load that one contribution can bear. The flag accuses no one; it calibrates the reading.

Now let time pass. The next quarter, several of Harborlight's firms re-assess after working on their integrations — re-taking is by design, since a score is a reading at a point in time — and the assessed experience of data flow moves upward from 62. The delta against Harborlight's declaration narrows: not because anyone adjusted a number by hand, but because the firm-side measurement changed and the arithmetic followed. Harborlight can watch that convergence in its alignment evidence, quarter over quarter, and bring it into product and sales conversations as measurement rather than assertion. Kestrel Books, on the other side, has a different decision to make: its firms' experience sits above its modest declaration, so the honest move is to raise the declared position to match measured reality — at which point Kestrel's delta narrows from the declaration side. Both stories end the same way: two structured positions, one measured gap, every number traceable.

## What the alignment delta is not

The alignment delta is not a ranking, and it is not a score for the vendor. PAT publishes no league tables, and a delta compares a product's declaration with its own firms' experience — it does not place one vendor above another. The delta is not an accusation: because it flows both ways, its existence says only that two measurements differ, not that anyone misrepresented anything. It is not AI-generated: the firm side comes from deterministic arithmetic, and no model sits in the scoring path; Ask Pat can help a signed-in user understand a delta from documented content, but it never generates one. The delta is not a benchmark: benchmarks are comparison context across anonymous cohort contributors, with their own suppression rules, while a delta is a two-sided measurement between a specific declaration and the assessed experience of it. It is not a firm's pillar score, either — a firm scoring 62 on Integration has a score; the delta only appears when that assessed experience is set against a vendor's declared capability. And it is not a promise: a shrinking delta describes alignment as measured, not an outcome PAT guarantees.

## Common misconceptions

One frequent misreading is that a delta is a single product-wide number. It is not: vendors declare capabilities across defined function areas of practice software, and a delta measures a declared position in a function area against the assessed experience of it. A product can sit close to its declaration in one function area and far from it in another, and one collapsed figure would discard the specificity that makes the delta usable.

A second misreading is that a delta springs into existence the moment a vendor declares. A declaration alone is one shore; the delta needs the other. Until member firms have assessed their experience of the product, there is no measured gap — only a declared position waiting for evidence to meet it.

A third is that an integrity flag on firm responses invalidates a delta. It does not: signal-integrity checks calibrate how much weight the underlying responses can bear, and the delta remains a measured quantity read with appropriate care rather than a number struck from the record.

A fourth is treating a zero delta as proof of an excellent product. A zero delta means declaration and experience agree — nothing more. A modest product honestly declared shows no gap; the delta measures alignment between two positions, not the height of either one.

A fifth is assuming a delta can only move when firms re-assess. Movement can come from either shore: firms' assessed experience shifting, or a vendor revising its declared position toward measured reality.

## Questions this article answers

What is the alignment delta? The measured gap between a vendor's declared product capability and firms' assessed experience of that capability, flowing in either direction.

Can a delta favor the vendor? Yes — when firms' assessed experience comes out above the declared position, the product is outperforming its declaration.

Is the delta computed per product or per function area? Per function area: declarations are structured across defined function areas of practice software, and each delta measures against a specific declared position.

Does any AI model produce the delta? No. The firm side is deterministic arithmetic on a 0–100 scale, the vendor side is a structured declaration, and Ask Pat never generates scores or deltas.

What makes a delta change? Either side moving: firms re-assessing as operations change, or a vendor revising its declaration.

Does an integrity flag void a delta? No — the flag travels with the delta as information about how much weight the firm responses can bear; it calibrates the reading rather than cancelling it.

Is the delta a benchmark? No. Benchmarks are anonymous cohort comparison context with their own suppression rules; a delta is a two-sided measurement between a specific declaration and the assessed experience of it.

Who can see a delta? Each role sees its own scoped view: vendors see structured alignment evidence, firms see their experience against declarations of products they use, and consultants see alignment signal across their managed ecosystem.

## Related terms

Capability — the declared and assessed construct whose two positions the delta measures between. Pillar — the five scoring domains (Operations, Automation, Integration, Governance, Strategy) in which assessed experience is scored. Band — the five-level lexicon (Early through Leading) that leads presentation of scores. Integrity Score — the signal-integrity checks that accompany the firm-side responses a delta rests on. Evidence Lineage — the rule that every displayed number, deltas included, traces to its sources. Benchmark Cohort and Benchmark Suppression — the comparison-context machinery the delta is often read alongside but is distinct from. Module — the assessment unit that produces firm-side scores. Ecosystem — the consultant-managed construct in which cross-firm alignment structure, deltas included, is viewed.
