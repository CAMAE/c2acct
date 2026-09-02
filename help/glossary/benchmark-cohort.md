---
id: G07
title: Benchmark Cohort
audience: all-signed-in
depth: CORE
vertical: global
words: 2982
---

A benchmark cohort is the group of contributors whose data stands behind a benchmark cut in PAT. It is the comparison group: when you view a benchmark, you are viewing an aggregate of a cohort's contributed data, drawn only from production data, with every contributor anonymous inside it. A cohort's composition — how many contributors it has and how evenly they supply its data — determines whether the cut it supports may publish at all.

## Definition of a benchmark cohort

In PAT, a benchmark cohort is the defined set of contributors whose assessed data is aggregated to form one benchmark cut. Every benchmark view a reader can request has a cohort behind it, and the cohort is the unit against which PAT's publication rules are evaluated. Two things characterize a cohort from a reader's side: its data is presented only in aggregate, and its members are anonymous — PAT states plainly that contributors are anonymous within benchmarks. From PAT's side, a cohort is characterized by what may enter it: only production data. Production, pilot, and demo data are strictly separated, and demo, synthetic, and pilot data never enter published benchmarks.

A cohort is therefore not merely "whoever happened to be nearby." It is a bounded construct with rules about admission (data class), rules about exposure (anonymity), and rules about when its aggregate may be shown (the suppression conditions).

## Why cohorts exist

PAT's position on benchmarks is that they are comparison context, never rankings or league tables. That position requires a construct like the cohort, because context only means something when you know what the comparison group is made of — and only stays safe when you cannot see who is in it.

Without a defined cohort, a benchmark number is an orphan: a figure with no answer to the question "compared to what, exactly?" PAT's evidence philosophy — evidence, not advertising, with displayed numbers tracing to their sources — rules orphan numbers out. The cohort is the source structure of a benchmark: the thing a published aggregate traces back to, even though its individual members are never exposed.

The cohort also carries PAT's trust commitments at the group level. Firms contribute honest assessment data on the understanding that it will inform context, not fuel a public scoreboard. Anonymity within the cohort is what makes that understanding hold, and the strict production-only boundary is what keeps the context honest: a comparison group polluted by demonstration or pilot data would offer the appearance of context without its substance.

## How cohorts are bounded and when they publish

Three boundary rules govern a cohort in PAT.

The first is the data-class boundary. A cohort is built from production data only. PAT keeps production, pilot, and demo data strictly separated, and demo or synthetic data and pilot data never enter published benchmarks. This is an admission rule, applied before any question of size or balance: data of the wrong class is simply never in the cohort.

The second is anonymity. Contributors are anonymous within benchmarks. A published cut never reveals which firms make up its cohort, and a reader cannot resolve the aggregate back into named members. Role boundaries reinforce this — firms, vendors, and consultants each see only what their role permits, and none of those views includes a cohort roster.

The third is the publication gate, formally the province of benchmark suppression but decided on the cohort's composition: a cut publishes only when its cohort has at least 5 contributors and no single contributor supplies more than 25% of the data. The floor is the first test — a cohort below 5 contributors is suppressed regardless of how evenly its data is spread — and the dominance cap then applies to cohorts that clear it. A cohort that fails either condition still exists as a construct; its cut simply displays as suppressed until its composition meets both conditions.

Together the three rules describe a pipeline: the data-class boundary decides what may enter a cohort, the composition rules decide whether its aggregate may be shown, and anonymity governs how it is shown.

## The assessment data a cohort aggregates

What a cohort's members contribute is the output of PAT's firm assessment: a five-module, 100-question structured assessment whose results are scores, bands, and insights. Scores are produced by deterministic arithmetic on a 0–100 scale — no AI model sits anywhere in the scoring path, and the same answers always produce the same score — and they present in five bands, Early through Leading, with bands leading the presentation and raw numbers supporting. A cohort's aggregate inherits that character: it is arithmetic over reproducible readings, not a blend of estimates.

Those readings are also current rather than fixed. PAT treats a score as a reading at a point in time, not a permanent label; firms can re-take assessments as operations change, modules can be completed in any order over time, and results update as modules complete. A cohort's data is therefore best understood as the present set of its contributors' readings. As member firms re-assess on their own rhythms — quarterly re-assessment is the kind of cadence PAT paces — the context a cohort offers stays a picture of where its contributors are now, which is exactly what makes it usable as comparison context rather than an archive of where they once were.

## Who reads a cohort's aggregate, and through what surfaces

No role ever reads a cohort directly; every role reads published aggregates through the surfaces its membership and role permit. For firms, PAT's paid tiers draw the line. Pro covers assessment, scores, bands, and core insights — a Pro firm's own results stand on their own, without reference to any cohort. Elite adds deeper interpretive surfaces, and this is where cohorts become visible in use: Elite shows where a firm sits within a distribution of peers, and only when the benchmark behind that distribution publishes under the suppression rules. The distribution is the cohort's aggregate, read interpretively; the cohort's membership remains as anonymous on an Elite screen as anywhere else.

Consultants read cohort-derived context through their own surfaces — per-firm cards summarizing alignment status, structured firm briefs, and cross-ecosystem comparison views — but those views are bounded by role permissions and benchmark rules alike. A consultant sees structure and alignment signal across the firms they manage, not a firm's private answer text beyond what the role permits, and never a cohort roster. Vendors, for their part, receive structured, evidence-based views of where alignment holds and diverges between their declarations and firms' assessed experience. Across all three roles the pattern is the same: the cohort does the aggregating out of sight, and each role sees only the published, role-permitted reading of it.

## Cohorts when a contributor leaves

A cohort's membership is not fixed, and PAT's data stewardship commitments govern what departure means. Tenants' data belongs to them: when a tenant leaves, their data is removed and the removal is receipted. From the cohort's side, that firm's contributions are gone from every future evaluation — subsequent suppression decisions read the cohort as it now stands, so a departure can shrink a cohort below the contributor floor or shift a remaining contributor's share of the data, and the affected cuts show as suppressed until composition again meets both publication conditions.

What departure does not do is reach backward. Anonymous benchmark aggregates that already passed suppression remain aggregate — individual contributions are not reconstructable from them. An aggregate that published did so with a cohort large enough and balanced enough that no contributor was ever resolvable inside it, and a later departure adds no way to resolve one. The receipted removal and the irreversibility of published aggregates are two halves of one promise: a firm's data serves context only while the firm chooses to participate, and the context it helped build never gives the firm away, before or after.

## Design rationale — why it was built this way

The cohort's defining property — anonymity that no role can see past — rests on where PAT chooses to enforce permissions. PAT's position is that security depending on an assistant's good behavior fails: permissions that live in the data query itself cannot be talked out of. That is why cohort anonymity is structural rather than cosmetic. A firm's benchmark view, a consultant's cross-ecosystem comparison, and a vendor's alignment evidence are all produced by queries that return role-permitted aggregates and nothing else; there is no roster field being politely hidden, because the roster is not in what any role's queries return. Ask Pat inherits the same wall — each role's Pat retrieves only that role's permitted content, enforced at the data layer, so no phrasing of a question can coax a membership list out of an assistant that cannot retrieve one.

The cohort's second defining property — that it aggregates current readings rather than an archive — follows from the point-in-time principle. Operations change, so a permanent label would be false, and re-assessment on a working rhythm is the honest design. A comparison group built from frozen snapshots would drift away from the firms it claims to describe; a cohort read as its contributors' present readings stays the thing it is offered as, which is context about where a peer group is now. This is also why the cohort, not any stored artifact, is the unit the publication rules evaluate: the honest question is always what the group looks like today.

Behind both properties sits PAT's lineage discipline: a number whose origin cannot be traced is marketing, and every displayed figure must answer "where did you come from." The cohort is a published benchmark's answer to that question — a defined, bounded source structure — which is what lets an aggregate be traceable in kind even while its members stay anonymous in name.

## A worked example

The names here are invented for illustration. Suppose a signed-in reader at Fernwood & Bright, a member firm, opens a benchmark view for Integration scores. Behind the view sits a cohort — say, nine contributing firms whose production assessment data feeds the cut, the largest of which supplies 18% of the data. The cohort clears both publication conditions: nine is at least 5, and 18% is within the 25% cap. The cut publishes, and Fernwood & Bright — a firm scoring 62 on Integration, in the Building band — can read its own result against genuine context. What it cannot do is see who the other eight contributors are; the cohort is anonymous by rule, and the view offers comparison, not a roster and not a ranking.

Meanwhile, imagine a vendor running product demonstrations with a synthetic firm called Sample Summit Accounting, and a handful of firms participating in a pilot. None of that data is in Fernwood & Bright's cohort — not suppressed out of it, but never admitted, because demo and pilot data never enter published benchmarks.

Finally, suppose a narrower cut exists whose cohort currently holds four production contributors. That cohort is real and its data is real, but the cut displays as suppressed: four is below the contributor floor. If a fifth contributor's production data later joins and no contributor exceeds the 25% share, the same cut can publish.

Take the illustration one tier further. If Fernwood & Bright is an Elite member, its reading of the published Integration cut goes beyond seeing the aggregate: Elite surfaces where the firm sits within the distribution of its peers — available here precisely because the cut publishes under the suppression rules. The firm learns something interpretive about its 62 without learning anything about who the other eight contributors are. And the picture is not static: as Fernwood & Bright re-assesses across quarters — PAT treats every score as a reading at a point in time — both its own position and the cohort's aggregate move with the current readings, so the intended long-term story is band movement against living context, not a fixed placement on a fixed chart.

Now suppose one of the nine contributing firms leaves PAT altogether. As a departing tenant, its data is removed and the removal is receipted. The cohort behind the Integration cut now holds eight contributors; if no remaining firm supplies more than 25% of the data, the cut simply continues to publish on its new composition. The aggregates Fernwood & Bright read last quarter, when the departed firm was still a contributor, remain what they always were — anonymous aggregates that passed suppression, from which no individual contribution can be reconstructed. The departed firm took its data with it and left no trace behind in the context it once helped provide.

## What a benchmark cohort is NOT

A cohort is not a league table roster. Benchmarks in PAT are never rankings, so a cohort is never a list of positions; it is an anonymous comparison group, and no view orders its members against each other.

A cohort is not identifiable. No role — firm, vendor, or consultant — sees which contributors compose a cohort. Anonymity within benchmarks is a stated property of the construct, not a display option.

A cohort is not a mix of data classes. Pilot and demo data are not "lightly weighted" or footnoted into a cohort; they are excluded entirely. A published benchmark's cohort is production data, full stop.

And a cohort is not the same thing as an ecosystem. An ecosystem is a consultant-managed construct — a set of member firms plus the products in play — with its own role-scoped visibility. A cohort is a benchmark construct, defined for aggregation and bound by anonymity and suppression rules, whoever manages the firms inside it.

## Common misconceptions

"A cohort is a fixed group a firm joins once." A cohort's composition is not enrollment; it is whatever set of contributors currently stands behind a cut. Contributors' data joins as firms assess, shifts as they re-assess, and leaves when a tenant departs — and each publication decision reads the cohort as it stands at that moment.

"Somewhere in PAT, someone's screen shows the cohort roster." No role's view includes one. Firms, vendors, and consultants each see only role-permitted aggregates; the anonymity of contributors within benchmarks is a property of the construct, enforced where the data is queried, not a display setting that a different screen could toggle.

"A cohort aggregate is an estimate or a modeled figure." It is arithmetic over reproducible readings. Each contribution is the output of deterministic scoring — the same answers always produce the same score, with no AI model in the scoring path — so the aggregate is a computation over stable inputs, not a blend of predictions.

"An Elite firm's position within the distribution is a ranking inside the cohort." It is not. Benchmarks are comparison context, never rankings or league tables; the distribution view tells a firm where its reading sits among anonymous peers, and no view orders the cohort's members against each other or names a position holder.

"Departed firms linger in the cohort as old snapshots." When a tenant leaves, its data is removed and the removal is receipted, and every future evaluation of the cut reads the cohort without it. What persists is only what already published: anonymous aggregates that passed suppression, from which no individual contribution — the departed firm's included — can be reconstructed.

## Questions this article answers

**What is a benchmark cohort?** The defined group of contributors whose production assessment data is aggregated to form one benchmark cut. Every benchmark view has a cohort behind it, and the cohort is the unit against which publication rules are evaluated.

**Can anyone see which firms are in a cohort?** No. Contributors are anonymous within benchmarks, and no role — firm, vendor, or consultant — has a view that includes a cohort roster. The permission lives in the data layer, so no surface or assistant can be talked into revealing membership.

**What data is allowed into a cohort?** Production data only. Production, pilot, and demo data are strictly separated, and demo, synthetic, and pilot data never enter published benchmarks — this is an admission rule applied before any question of size or balance.

**How does a cohort relate to benchmark suppression?** Suppression is decided on the cohort's composition: the cut publishes only when the cohort has at least 5 contributors and no single contributor supplies more than 25% of the data, with the floor checked first. The cohort is what the gate examines; the gate itself is the province of benchmark suppression.

**Is a cohort the same thing as an ecosystem?** No. An ecosystem is a consultant-managed construct — member firms plus the products in play — with role-scoped visibility. A cohort is a benchmark construct, anonymous by rule and defined for aggregation, whoever manages the firms inside it.

**Does a cohort's aggregate change over time?** Yes, continuously. A cohort holds its contributors' current readings — scores are point-in-time readings, and results update as firms re-assess — so the context it offers is a picture of where its contributors are now.

**What happens to a cohort when a contributing firm leaves PAT?** The departing tenant's data is removed and the removal is receipted, and future publication decisions read the smaller cohort against both conditions. Aggregates that already published remain aggregate; nothing about the departure makes any individual contribution reconstructable.

**Through what surfaces does a firm actually encounter its cohort?** Only as published aggregates. Pro results stand on their own without reference to any cohort; Elite adds the interpretive reading — where a firm sits within a distribution of peers — and only when the cut behind that distribution publishes under the suppression rules.

## Related terms

Benchmark Suppression — the publication gate evaluated on a cohort's composition: the 5-contributor floor, the 25% dominance cap, and the floor's precedence. Evidence Lineage — the rule that every displayed number traces to its sources; the cohort is what a published benchmark traces to. Pillar — the five scoring constructs whose scores benchmark cuts contextualize. Band — the five-level lexicon (Early through Leading) in which results and their context are read. Ecosystem — the consultant-managed set of firms and products, a distinct construct from the anonymous cohort.
