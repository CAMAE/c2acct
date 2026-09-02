---
id: P12
title: Security and privacy posture
audience: public
depth: CORE
vertical: global
words: 2989
---

PAT's security and privacy posture rests on a simple principle: every participant sees exactly what their role permits, and nothing else. Firms, vendors, and consultants each work behind role walls; each participant's data lives in its own isolated tenancy; and even PAT's built-in assistant is permission-scoped at the data layer, so it can only ever answer from content the asking user is entitled to see. This page describes that posture at the level a trust review needs — what is walled from what, and why the walls are structural rather than procedural.

## Three roles, three views, one rule

Performance Alignment Technology (PAT), a Patalign product serving the accounting ecosystem, is used by three kinds of participants: accounting firms assessing their own operations, software vendors declaring product capabilities and receiving alignment evidence, and consultants or ecosystem owners viewing the alignment picture across a managed set of firms. Because these three roles work with material that is sensitive in different ways, PAT's first privacy commitment is that role determines visibility.

A firm sees its own assessment work and results. A vendor sees its own declarations and the alignment evidence the platform produces for it. A consultant sees cross-firm alignment structure for the ecosystem of firms they manage — and firms and vendors within that ecosystem see only what their own role permits, not the consultant's cross-firm vantage and not each other's private material. The rule is uniform: no role inherits another role's view, and no participant's window widens because someone else's engagement happens to touch theirs.

This matters most where the platform's value is created — at the meeting point of vendor claims and firm experience. PAT can measure the gap between a vendor's declared capability and firms' assessed experience precisely because both sides contribute; the role walls exist so that contributing to that shared measurement never means surrendering your private working data to the other side.

## Tenancy isolation: your data lives in your space

Underneath the role walls sits tenancy isolation. Each participant's data belongs to that participant's own tenancy — a firm's assessment answers and results are the firm's; a vendor's declarations and evidence are the vendor's. Isolation means the separation is a property of where data lives, not merely of what an interface chooses to display.

The distinction is worth pausing on, because it is the difference between a curtain and a wall. A platform could hold everyone's data in one undifferentiated pool and rely on screens to show each user only their slice; the data would be mingled, and only the presentation would be private. PAT's posture is the opposite: separation first, presentation second. What a user's screen shows is a consequence of what their role and tenancy actually reach, so a presentation-layer mistake cannot expose material the data layer never served.

This is also the design stance behind PAT's other boundaries. Production, pilot, and demo data are strictly separated as classes — a wall covered in detail in its own article — and the same philosophy applies here: important separations are built into how the system holds data, not enforced by remembering to filter it.

## Ownership that survives the relationship — including its end

Tenancy isolation describes where a participant's data lives while an engagement is active. PAT's stewardship position goes one step further: the data in a tenancy belongs to the tenant. A firm's assessment answers and results are the firm's property; a vendor's declarations and alignment evidence are the vendor's. PAT holds the material in order to serve the participant it describes — not the other way around.

That position is tested at the moment a relationship ends, so PAT gives the ending a mechanism. When a tenant leaves, their data is removed — and the removal is receipted. The departing tenant receives confirmation that the removal took place, rather than a policy sentence promising that it would. For a trust review, the receipt is the significant detail: it converts an exit promise into an exit record, something a firm or vendor can hold rather than hope.

One class of material remains after a departure, and its remaining is itself a privacy property rather than an exception. Anonymous benchmark aggregates that already passed PAT's suppression rules stay aggregate — and they can stay precisely because individual contributions are not reconstructable from them. A published aggregate never contained an identifiable trace of any contributor, so there is nothing in it to remove that belongs to anyone in particular. Everything that was identifiably yours goes with you; everything that remains identifies no one.

## Permission-scoped assistance: Ask Pat answers within your walls

An assistant embedded in a platform is a common place for privacy postures to quietly fail, because assistants are designed to be helpful and helpfulness tempts systems to reach across boundaries. PAT's assistant, Ask Pat, is built so that this temptation has no mechanism.

Ask Pat answers questions using PAT's own documented content only, and it is role-scoped: each user sees only content for their role. Critically, that scoping is enforced at the data layer — the assistant is not trusted to decline politely after retrieving something it shouldn't have; the content outside your permissions is simply not available to it when it answers you. A firm user asking Pat a question is served from firm-visible content; a vendor user from vendor-visible content. The wall the rest of the platform enforces is the same wall the assistant operates behind.

Two further habits complete the picture. When Ask Pat lacks documented evidence for a question, it says so rather than guessing — so the assistant never papers over a permission boundary with invention. And Pat never generates scores: scoring in PAT is deterministic arithmetic with no AI model anywhere in the scoring path, so the assistant's job is understanding, not measurement. Assistance and scoring are kept apart on purpose, which means there is no route by which a conversational system could influence the numbers your organization is described by.

## Answers you can verify, not just trust

An assistant that operates behind permission walls raises a fair follow-up question: how would a user know the walls held? Ask Pat's answer format supplies part of the check. Its answers cite the documented content they draw from, so a user can see where an answer came from and read the underlying material for themselves. The citation is more than a courtesy — it makes the assistant's scoping observable in ordinary use. Because each role's Pat retrieves only that role's permitted content, every source an answer cites is a source the asking user is entitled to open. You are never shown a citation you cannot follow.

The habit of declining carries privacy weight too. When documentation does not cover a question, Pat says so plainly rather than assembling something that merely sounds right. An assistant willing to improvise would be an assistant whose outputs could not be traced — and untraceable output is exactly the kind of material a permission model cannot vouch for. Pat's refusal to guess keeps every answer inside the same checkable territory as the rest of the platform: sourced, scoped, and visible to exactly the people it should be.

## Anonymity in shared surfaces

Some of PAT's value comes from surfaces that are, by design, shared — benchmarks that give participants comparison context. Shared context creates its own privacy question: can others work out who contributed what? PAT's answer is layered. Contributors are anonymous within benchmarks. Benchmarks are context, never rankings or league tables, so no surface exists that names and orders participants. And a benchmark publishes only when its cohort has at least five contributors with no single contributor supplying more than a quarter of the data — thresholds that exist for statistical honesty, but which also mean no published cut is thin enough or dominated enough for a reader to reverse-engineer an individual contributor's position. Where those conditions are not met, the cut shows as suppressed rather than published.

The posture, in short: even where your data contributes to something others see, it contributes as anonymous material inside a cohort, never as an identifiable data point.

## Evidence you can trace, walls you can trust

Privacy postures and evidence postures usually pull in opposite directions — the more traceable a number, the more it seems to expose. PAT resolves the tension by scoping the tracing. Every displayed number in PAT traces to its sources; there are no orphan numbers. But lineage operates within the same role walls as everything else: tracing a number means the people entitled to that number can see where it came from, not that its underlying material becomes visible across boundaries. Firms get accountability for the numbers describing them; vendors get evidence that stands up to scrutiny; and neither transparency comes at the price of the other's isolation.

Signal-integrity information follows the same pattern. Response-pattern quality checks accompany scores so readers know how much weight a result can bear — and an integrity flag is information for the parties entitled to the result, not an accusation broadcast beyond them.

## Content governance: sourced, reviewed, and signed for

A trust review usually asks not only who can see data but how the platform's own content earned its place — and PAT's answer is a recorded discipline rather than an editorial habit. Learning and assessment module content must cite authoritative sources to enter the system at all; unsourced content is rejected mechanically at import. The gate is mechanical, not discretionary: material without sources does not get in, whoever submitted it and however useful it looks.

Passing that gate is still not enough to reach users. Content goes live only after a named human reviewer signs off — and the review discipline is recorded: who reviewed the content, and when. That record is the accountability layer a reviewer should look for. A control that leaves no trace cannot be audited, and an unauditable control is hard to distinguish from no control at all. In PAT, the material your team will read, answer, and be assessed through arrived with sources, passed a named review, and carries the record to show it.

The pattern should feel familiar by this point in the posture: mechanical enforcement where a rule can be mechanical, named accountability where human judgment is involved, and a record either way. It is the same shape as the tenancy walls and the role scoping — a promise backed by structure, with evidence that the structure was applied.

## What this posture means for a trust review

If you are evaluating PAT for your firm or your product organization, the posture summarizes cleanly. Visibility is governed by role, uniformly, with no exceptions for adjacent parties in the same ecosystem. Data separation is structural — tenancy isolation underneath, role walls above, and strict class separation between production, pilot, and demo data. The assistant operates inside the same permissions as the human asking, enforced where the data lives. Shared surfaces are anonymous, contextual, and published only when they cannot expose an individual contributor. And every number can be traced by the people entitled to it.

None of this posture is decorative, because PAT's entire premise depends on it. The platform asks firms to answer honestly about their operations and asks vendors to make declarations specific enough to be tested. Participants only do either of those things candidly when they trust exactly where the material goes and exactly who can see it. The walls are not an add-on to the product; they are the condition under which the product's evidence can exist at all.

## Why PAT works this way

The choice to enforce role walls in the data layer, rather than at the interface or in the assistant's manners, comes from a blunt premise: security that depends on an assistant's good behavior fails. An assistant instructed to decline politely can, in principle, be coaxed, confused, or misled into forgetting its instructions — but permissions that live in the data query itself cannot be talked out of. When content outside a user's role is simply never served, there is nothing for cleverness to extract. PAT places the wall where failure is structural rather than behavioral.

The suppression thresholds on benchmarks come from a related discipline with a long pedigree: small-cell suppression, the same practice statistical agencies use. Below a minimum group size, a "group" number is barely distinguishable from someone's private data — an average of three is uncomfortably close to a disclosure of one. The five-contributor minimum keeps every published figure genuinely collective, and the dominance cap — no single contributor supplying more than a quarter of the data — stops any one participant's results from steering a number presented as a peer group. Together they make PAT's shared surfaces incapable of pointing back at an individual — suppression is a privacy control, not merely a statistical nicety.

## How this looks for a firm, a vendor, and a consultant

For a firm, the posture means your assessment answers and results live in your own tenancy, your version of Ask Pat draws only on firm-visible content, and your contribution to any benchmark is anonymous inside a cohort that cannot be reverse-read. What others gain from your participation is context; what they never gain is you.

For a vendor, the posture means your declarations and your alignment evidence are yours, and what you learn about firms arrives as structured, evidence-based views of where alignment holds and diverges — never as access to any firm's private working material. The evidence you can show a skeptical prospect was produced without either side surrendering its data to the other.

For a consultant or ecosystem owner, the posture means your cross-firm vantage is real but bounded: you see alignment structure and signal across the firms you manage, not their private answer text beyond what the role permits. Your view is wider than any single participant's and still walled like everyone else's.

## A closer look: one scenario, start to finish

Picture an illustrative ecosystem: a consultant manages a set of member firms, among them an invented practice called Merrow & Voss, which uses a product from a vendor in the same ecosystem. One shared measurement runs through all three parties — the vendor has declared its product's capabilities, Merrow & Voss has assessed its experience, and an alignment delta has been computed — yet each party's window onto that measurement is different.

Merrow & Voss sees its own assessment work: scores, bands, and insights built from its own answers, in its own tenancy. The vendor sees evidence — where firm experience supports its declarations and where it diverges — without ever seeing the firm's private material. The consultant sees the alignment structure across the whole managed set, Merrow & Voss included, as signal rather than as anyone's raw answer text. Now let each of them ask Ask Pat a question about what they are looking at. Three users, three role-scoped retrievals: each Pat answers from that role's permitted content only, cites what it drew on, and says so plainly when documentation is silent. No question, however phrased, pulls material from behind another party's wall — the data layer never serves it. One measurement, three entitled views, zero crossings — that is the posture working end to end.

## Common misconceptions

"Consultants can read the private answers of the firms they manage." A consultant's vantage is cross-firm structure and alignment signal — not a firm's private answer text beyond what the role permits. Managing an ecosystem widens the view of alignment, not the view into any firm's working data.

"A cleverly worded question could get Ask Pat to reveal another role's content." No phrasing works, because the constraint is not in Pat's judgment: scoping is enforced at the data layer, and content outside the asking user's role is never available to the assistant.

"Being in the same ecosystem relaxes the walls between participants." It does not. Adjacency creates shared measurement, never shared access: no participant's window widens because someone else's engagement touches theirs.

"Tenancy isolation is just the interface showing each user their slice." That would be a curtain, not a wall. In PAT, separation is a property of where data lives; presentation is downstream of it, so a display mistake cannot expose what the data layer never served.

"A signal-integrity flag is a public mark against a firm." An integrity flag is information, not an accusation — and it accompanies a result for the parties entitled to that result, not as anything broadcast beyond them.

## Questions this article answers

Who can see a firm's assessment answers and results? The firm itself, within its own tenancy. Consultants managing an ecosystem see alignment structure and signal across firms — not private answer text beyond what their role permits — and vendors see none of a firm's private material.

What can a vendor see about the firms using its product? Structured, evidence-based views of where firm experience aligns with its declarations and where it diverges — alignment evidence, never firms' private working data.

What is tenancy isolation? The principle that each participant's data lives in its own separated space, so privacy is a property of where data resides rather than of what an interface chooses to display.

Who owns the data a participant puts into PAT? The tenant it describes. A firm's assessment material is the firm's and a vendor's declarations are the vendor's; PAT holds the material to serve the participant, not the reverse.

How is Ask Pat prevented from crossing role boundaries? Its role scoping is enforced at the data layer: each role's Pat can only retrieve that role's permitted content, so out-of-scope material is unavailable to it rather than merely off-limits.

Could someone identify a contributor inside a published benchmark? No. Contributors are anonymous, benchmarks are context rather than rankings, and a cut publishes only with at least five contributors and no contributor above a quarter of the data — otherwise it shows as suppressed.

For a closer look at the strict separation between real, trial, and demonstration data, the article on why production, pilot, and demo data never mix is the natural next read.
