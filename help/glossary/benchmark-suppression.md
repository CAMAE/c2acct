---
id: G06
title: Benchmark Suppression
audience: all-signed-in
depth: CORE
vertical: global
words: 3000
---

Benchmark suppression is the rule that decides whether a benchmark cut is allowed to publish in PAT. A cut publishes only when its cohort has at least 5 contributors AND no single contributor supplies more than 25% of the data; if either condition fails, the cut displays as suppressed. The contributor floor takes precedence: with fewer than 5 contributors a cut is suppressed outright, and the dominance cap is only a live question once the floor is met.

## Definition of benchmark suppression

Benchmark suppression is PAT's publication gate for benchmark data. Every benchmark cut — any slice of aggregate comparison data a reader might view — must satisfy two conditions before it can publish. First, the contributor floor: the cohort behind the cut must contain at least 5 contributors. Second, the dominance cap: no single contributor may supply more than 25% of the cut's data. Both conditions must hold; the test is a strict AND. A cut that fails either condition does not publish with caveats, does not publish partially, and does not publish to a privileged subset of readers. It shows as suppressed.

The two conditions are ordered in practice. The floor takes precedence: a cut with fewer than 5 contributors is suppressed on that ground alone, before any question of dominance arises. The dominance cap then applies to cuts that have cleared the floor — a cohort can be large enough and still fail publication because one contributor's data outweighs the 25% limit.

## Why suppression exists

Benchmarks in PAT are comparison context, never rankings or league tables, and contributors are anonymous within them. Suppression is what makes both of those commitments real rather than aspirational.

Anonymity is arithmetic before it is policy. In a very small cohort, an aggregate stops being an aggregate: with two or three contributors, anyone who knows their own numbers can begin to infer someone else's. The contributor floor keeps every published cut large enough that no individual contributor is exposed by simple subtraction. The dominance cap addresses the subtler version of the same failure: a cohort can have many members and still be, in substance, one contributor's data wearing an aggregate's clothing. If a single contributor supplies more than a quarter of a cut, the "benchmark" leans toward being that contributor's mirror — misleading as context for everyone else and thin as cover for the dominant contributor.

There is also a quality argument. PAT's membership model is paid tiers only, by design, because benchmark quality depends on committed participants. Suppression is the same philosophy applied at the point of display: a number that cannot bear weight should not be shown at all. This is consistent with PAT's evidence discipline — displayed numbers trace to their sources, and no number is displayed whose source structure would undermine what it appears to say.

## How the rules apply

When a reader requests a benchmark view, each cut in that view is evaluated against the two conditions using the cohort behind it.

The contributor floor is checked first and takes precedence. A cohort of 4 or fewer contributors fails, full stop; the cut displays as suppressed and the dominance cap is never reached. This precedence matters for how suppression should be read: a suppressed small cut says nothing about dominance, only that the group is too small to publish.

For a cohort of 5 or more, the dominance cap applies: if any single contributor supplies more than 25% of the cut's data, the cut is suppressed even though the floor is satisfied. Only a cut that passes both tests publishes.

Suppressed is what the reader sees — a stated status, not a blank or an error. The cut exists as a defined view; PAT is telling you that the data behind it does not currently meet publication conditions. Suppression is conditions-based, not permanent by nature: the same cut publishes if and when its cohort satisfies both rules. And because each decision reads the cohort as it currently stands, movement runs in both directions — a suppressed cut can publish when contributors join or shares rebalance, and a published cut can return to suppressed if its cohort's composition later fails a condition.

Two boundary facts complete the picture. Contributors remain anonymous within any benchmark that does publish — passing the gate never exposes who is in the cohort. And the data feeding any benchmark comes only from production data: PAT separates production, pilot, and demo data strictly, and demo, synthetic, and pilot data never enter published benchmarks. Suppression governs whether eligible data publishes; the data-class boundary governs what was eligible in the first place.

## The assessment data behind a suppression decision

What a benchmark cut aggregates is the output of PAT's firm assessment: a five-module, 100-question structured assessment whose results are scores, bands, and insights. Scoring is deterministic arithmetic on a 0–100 scale — no AI model sits anywhere in the scoring path, and the same answers always produce the same score — so the numbers a cut aggregates are themselves stable and reproducible. Suppression adds the group-level discipline on top of that individual-level one: a cut may only show an aggregate whose cohort structure can bear the reading a reader would take from it.

The underlying data also moves. PAT treats a score as a reading at a point in time, not a permanent label; firms re-assess as operations change, and results update as modules complete. A cut's cohort data is therefore not a frozen archive but a set of current readings, and each time the cut is evaluated for display, the two publication conditions are checked against the cohort as it now stands. This is part of why suppression describes a current state rather than a verdict: both the contributors and their contributions change over time, and the gate simply keeps asking the same two questions of whatever the cohort has become.

## Where suppression shows up in what members see

Suppression is not a back-office filter; its effects are visible in the surfaces members use. PAT's membership is paid tiers only — Pro and Elite. Pro covers assessment, scores, bands, and core insights: a Pro firm's own results do not depend on any benchmark publishing. Elite adds deeper interpretive surfaces, and one of them is exactly where suppression bites: Elite shows where a firm sits within a distribution of peers only when benchmarks publish under the suppression rules. If the relevant cut is suppressed, there is no distribution position to show — not an estimate, not a partial percentile, nothing that would let an interpretive surface become a route around the gate. The Elite reading is deeper interpretation of published aggregates, never a substitute for publication conditions.

The same holds across roles. Consultants see cross-ecosystem comparison views, but those views are bounded by role permissions and benchmark rules alike — managing an ecosystem does not unlock a suppressed cut. Vendors receive structured, evidence-based alignment views, and Ask Pat answers each role's questions from that role's permitted documented content only. Whatever the surface and whoever the reader, a cut that fails the floor or the cap shows as suppressed to everyone. That uniformity is itself part of the rule: a cut that fails publication conditions does not publish to a privileged subset of readers.

## Suppression and long-term data stewardship

Suppression at publication time is also what makes PAT's data stewardship commitments hold over the long run. Tenants' data belongs to them: when a tenant leaves, their data is removed and the removal is receipted. The natural question is what happens to benchmarks the departed tenant once contributed to. PAT's answer is that anonymous benchmark aggregates that already passed suppression remain aggregate — individual contributions are not reconstructable from them. The gate is why that promise is credible: every aggregate that ever published did so with at least 5 contributors and with no single contributor supplying more than 25% of the data, so no reader could ever resolve an individual's contribution out of it, and nothing about a later departure changes that arithmetic.

Going forward, the gate keeps working on whatever remains. Future evaluations of a cut read the cohort as it currently stands, so a departure that drops a cohort below the contributor floor, or leaves one remaining contributor supplying more than 25% of the data, moves the cut to suppressed. The published past stays safely aggregate; the publishable future is re-earned under the same two conditions.

## Design rationale — why it was built this way

Small-cell suppression is not a PAT invention; it is the same discipline statistical agencies apply when they publish aggregates. The principle is that below a minimum group size, a "group" number is barely distinguishable from someone's private data. PAT adopts that discipline as its contributor floor: no cut publishes with fewer than 5 contributors, because beneath that size the aggregate stops protecting the individuals inside it. The dominance cap addresses the failure the floor alone cannot catch. A cohort can clear any size threshold and still be dominated in substance, so the cap stops any single contributor's results from steering a number that is presented as a peer group: the moment one contributor supplies more than 25% of a cut's data, the cut is suppressed no matter how many contributors it counts. The precedence between the two conditions follows from what each one tests: the floor asks whether a publishable group exists at all, and only once that is answered does it make sense to ask whether the group speaks with one voice — which is why the cap becomes a live question only once the floor is met.

The membership model backs the same commitment from the other end. PAT has no free tier by design, because benchmark quality depends on committed participants — a free tier optimizes for volume over signal, and the numbers everyone compares against are only as good as the care behind the answers. Suppression and paid-only membership guard opposite ends of the same pipeline: membership shapes what enters the pool, and suppression decides what may leave it as a published number.

Finally, suppression is evidence lineage applied at the aggregate level. PAT's rule is that a number whose origin cannot be traced is marketing, and every displayed figure must be able to answer "where did you come from." A cut that fails the floor or the cap could not answer that question honestly — its origin would be a group too small to be a group, or one contributor wearing an aggregate's name — so the honest display is no number at all. The suppressed status is that refusal made visible.

## A worked example

The firms here are invented for illustration. Consider three benchmark cuts a signed-in reader might request.

The first cut has a cohort of 4 firms — Cobalt Ledger, Marsh & Vine, Ashfield Partners, and Trellis Accounting — each supplying an even quarter of the data. The distribution is perfectly balanced, but the cut is suppressed: 4 contributors is below the floor of 5, and the floor takes precedence. Balance cannot rescue a cohort that is too small.

The second cut has 8 contributors, comfortably above the floor. But one of them, an illustrative regional firm called Granite Row, supplies 40% of the cut's data. The floor is satisfied and the cap now applies: 40% exceeds the 25% dominance limit, so this cut is suppressed too. A reader comparing against it would largely be comparing against Granite Row, and Granite Row would be wearing an aggregate as a thin disguise.

The third cut has 6 contributors, the largest of which supplies 22% of the data. Both conditions hold — at least 5 contributors, no contributor above 25% — and the cut publishes. None of the six firms is identifiable within it; the reader sees comparison context, not a membership list.

The scenarios keep moving, because suppression reads current state. Return to the first cut a quarter later: a fifth firm's production data has joined the cohort, and no contributor supplies more than 25% of the data. Both conditions now hold and the cut publishes — the same cut, unchanged in definition, publishable because its cohort changed. The second cut can travel the same road in its own way: as more firms contribute to it, Granite Row's share of the data dilutes, and once it no longer exceeds 25% — with the floor still comfortably met — that cut publishes too. Nothing about Granite Row's data had to change; what changed is that the aggregate stopped leaning on one contributor.

The third cut illustrates the other direction and the stewardship boundary. Suppose one of its six contributors later leaves PAT entirely. As a tenant, its data is removed and the removal is receipted; the cohort now holds 5 contributors. If no remaining contributor supplies more than 25% of the data, the cut continues to publish at exactly the floor; if the departure pushes a remaining firm's share above the cap, the cut shows as suppressed until composition rebalances. Either way, the aggregates that already published while the departed firm was a contributor remain aggregate — having passed suppression, they never exposed any individual contribution, and there is nothing in them to unwind.

## What benchmark suppression is NOT

Suppression is not a judgment on the data or the contributors. A suppressed cut does not mean the underlying assessments were weak, flagged, or wrong; it means the cohort's size or composition does not meet publication conditions.

Suppression is not ranking management. PAT benchmarks are never rankings or league tables in the first place, so suppression is not a mechanism for hiding poor performers or curating winners. It applies identically regardless of what the numbers in the cut would have shown.

Suppression is not the data-class boundary. Keeping demo, synthetic, and pilot data out of published benchmarks is a separate, absolute wall; suppression evaluates cohorts of data that were already eligible.

And suppression is not permanent by definition. It describes a cut's current state against two published conditions, not a verdict on the cut's future.

## Common misconceptions

"Suppressed means the data is missing or lost." Nothing is missing. The cut is a defined view, the cohort behind it exists, and its contributors' data is intact; the cohort's size or composition simply does not meet publication conditions right now. Suppressed is a stated status, not a blank or an error.

"Elite members, or consultants, can see through a suppressed cut." No reader can. A cut that fails either condition does not publish to a privileged subset: Elite's distribution-of-peers surface appears only when the underlying benchmark publishes under the suppression rules, and a consultant's cross-ecosystem views are bounded by benchmark rules just as firmly. A suppressed cut shows as suppressed to everyone.

"The dominance cap excludes large contributors." The cap governs publication of the cut, not admission to the cohort. A contributor supplying more than 25% of a cut's data is not removed or trimmed; the cut waits, suppressed, until composition rebalances, and then publishes with everyone's data included.

"A cut publishing at exactly 5 contributors is cutting a corner." The floor is the published condition, not a soft guideline with an unstated margin. A cohort of exactly 5 contributors that also satisfies the dominance cap meets both conditions and publishes; a cohort of 4 fails, whatever else is true of it.

"Four contributors at an even 25% each should be safe to publish." Balance cannot rescue a cohort that is too small. The floor takes precedence: with fewer than 5 contributors the cut is suppressed before the dominance question is ever reached.

## Questions this article answers

**When does a benchmark cut publish in PAT?** Only when its cohort has at least 5 contributors and no single contributor supplies more than 25% of the data. Both conditions must hold; failing either one means the cut shows as suppressed.

**Which suppression condition is checked first?** The contributor floor takes precedence. A cohort with fewer than 5 contributors is suppressed on that ground alone, and the dominance cap only becomes a live question once the floor is met.

**What does a reader actually see when a cut is suppressed?** A stated suppressed status — not an error, not a partial number, and not a caveated estimate. PAT is saying the data behind that view does not currently meet publication conditions.

**Can a suppressed cut publish later?** Yes. Suppression is conditions-based, not permanent: each evaluation reads the cohort as it currently stands, so a cut publishes when contributors join or shares rebalance — and a published cut can return to suppressed if its cohort later fails a condition.

**Does demo or pilot data help a cohort reach the 5-contributor floor?** No. Demo, synthetic, and pilot data never enter published benchmarks; the strict data-class separation decides what is eligible before suppression ever counts contributors.

**Does any role or tier get access to suppressed cuts?** No. A cut that fails publication conditions does not publish to a privileged subset of readers — not Elite members, not consultants managing an ecosystem, and not through Ask Pat, which answers only from role-permitted documented content.

**Why is the dominance threshold a share of the data rather than a count of firms?** Because a cohort can be large and still be one contributor's data wearing an aggregate's clothing. The cap stops a single contributor's results from steering a number presented as a peer group, which is a question of weight, not headcount.

**What happens to published benchmarks when a contributor leaves PAT?** Aggregates that already passed suppression remain aggregate — individual contributions are not reconstructable from them. Future evaluations read the remaining cohort against both conditions and publish or suppress accordingly.

## Related terms

Benchmark Cohort — the contributor group a suppression decision evaluates. Integrity Score — the signal-quality reading that accompanies individual results, a distinct protection from the cohort-level gate described here. Evidence Lineage — the rule that displayed numbers trace to their sources, of which suppression is the aggregate-level expression. Band — the five-level presentation lexicon in which published comparison context is read. Ecosystem — a consultant-managed construct whose cross-firm views are still bound by role permissions and benchmark rules.
