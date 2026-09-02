---
id: G10
title: Ecosystem
audience: all-signed-in
depth: CORE
vertical: global
words: 2783
---

An ecosystem in PAT is a consultant-managed construct: a defined set of member firms together with the products in play across them. It exists so that a consultant or ecosystem owner can see alignment structure across a whole portfolio of firms, while each firm and each vendor continues to see only what its own role permits. The ecosystem is the object that makes the cross-firm view possible without dissolving the role boundaries that protect everyone in it.

## What an ecosystem is

An ecosystem is one of PAT's core constructs, and it belongs to the consultant role. Its membership has two parts: a set of member firms, and the products in play across those firms. The consultant — the ecosystem owner — manages this set and sees the cross-firm alignment structure it produces: how declared product capability and firm-assessed experience line up, firm by firm and product by product, across the whole portfolio.

The ecosystem sits alongside PAT's other two roles rather than above them. Firms assess their own operations; vendors declare product capabilities and receive alignment evidence; consultants see the alignment picture across a managed set of firms. The ecosystem is the construct through which that third view exists. It does not change what firms and vendors are or do — it assembles their signals into a portfolio-level picture that only the managing consultant's role can see in full.

## Why ecosystems exist

Ecosystems exist because the accounting world PAT serves is not made of isolated firms. Consultants and advisors manage firm ecosystems — portfolios of firms whose tool stacks, operating maturity, and vendor relationships they help shape. A consultant advising such a portfolio needs something no single firm's assessment can provide: the alignment picture across the set. Where does a product's assessed experience diverge from its declaration across several firms at once? Which firms in the portfolio are strong in a domain where others struggle? Those are cross-firm questions, and answering them requires a cross-firm object.

At the same time, the answer cannot be to open every firm's results to everyone. Firms committed honest self-assessment; vendors committed structured declarations. An ecosystem earns its cross-firm view precisely because it is role-bounded: the consultant sees the alignment structure across the managed set, and firms and vendors each see only what their role permits. The construct exists to hold both properties at once — breadth for the ecosystem owner, boundaries for everyone else.

## How an ecosystem works

An ecosystem draws on the same underlying signals as the rest of PAT; what is distinctive is the vantage point. On the firm side, each member firm's five-pillar assessment supplies its operational picture — deterministic 0–100 scores, presented band-first, accompanied by signal-integrity indications. On the product side, vendors' structured declarations state what each product in play claims to do. Between the two runs the alignment delta: the measured gap between a vendor's declared capability and firms' assessed experience of it, flowing both ways, since a product can outperform its declaration as well as underperform it. The consultant's ecosystem view assembles these signals across the member firms, revealing alignment structure that no single participant could see alone.

The consultant works from per-firm surfaces — firm cards and firm briefs — that present each member firm within the ecosystem view. What those surfaces carry follows the same rules as everything else in PAT: role-permitted content, bands leading with numbers supporting, and integrity signals accompanying scores so the reader knows how much weight a result can bear.

Role scoping governs every direction of visibility. Firms and vendors see only what their role permits: membership in an ecosystem does not open one member firm's results to another member firm, and it does not grant a vendor visibility beyond what the vendor role provides — vendors receive alignment evidence about their own products, not a window into the portfolio. The same discipline extends to assistance: Ask Pat is role-scoped, enforced at the data layer, so each user's questions are answered only from content their role can see. An ecosystem widens the consultant's view; it narrows no one's protections.

## Consultant surfaces: cards, briefs, and comparison views

The consultant's work inside an ecosystem runs through three kinds of surface, each defined at concept level and each answering a different question. Per-firm cards summarize a member firm's alignment status — the at-a-glance layer, one card per firm, suited to scanning a portfolio and noticing where attention is needed. Structured firm briefs support deeper review of a single firm: where a card summarizes, a brief lays out the firm's picture in enough structure to prepare an advisory conversation. Cross-ecosystem comparison views set the portfolio side by side, so the consultant can read alignment structure across firms rather than one firm at a time. The three surfaces form a natural working sequence — scan the cards, compare across the set, then open a brief where the comparison points. All three follow PAT's general presentation rules: bands lead, raw numbers support, and integrity signals accompany scores so the consultant knows how much weight each result can bear.

What every surface carries is bounded the same way. Consultants see structure and alignment signal — not a firm's private answer text beyond what the role permits. A firm's open-ended assessment responses, written in its own words, are not what a card or brief exists to expose; the surfaces are built from the structured layer — scores presented band-first, alignment deltas, integrity signals — rather than from the raw material beneath it. The depth of a consultant surface comes from assembling permitted signal well, not from reaching past the role boundary.

## Products in play: the vendor side of an ecosystem

Half of an ecosystem's membership is firms; the other half is the products in play across them, and those products bring their vendors' declarations with them. At concept level, the vendor experience works like this: vendors declare capabilities across defined function areas of practice software; firm product assessments then measure experienced reality against those declarations; and vendors receive structured, evidence-based views of where alignment holds and where it diverges — views usable in honest sales and product conversations.

Inside an ecosystem, this gives the phrase "products in play" its content. Each product a member firm uses arrives with a structured declaration of capability on one side and accumulating assessed experience on the other, and the alignment delta between them — flowing both ways, since a product can outperform its declaration as well as underperform it — is the signal the consultant reads across the portfolio. The vendor's own view, meanwhile, stays scoped to the vendor role: evidence about its own products, not the consultant's portfolio picture. The same product can therefore appear in two honest conversations at once — the vendor's, grounded in evidence about its declarations, and the consultant's, grounded in how that product's alignment runs across the managed set.

## Design rationale — why ecosystem visibility was built this way

One design conviction governs everything about who sees what in an ecosystem: security that depends on an assistant's good behavior fails. A visibility rule that lives in an application's manners — a surface that politely declines to show what it could technically fetch, or an assistant instructed not to reveal what it can technically retrieve — is a rule that holds only until someone finds the right way to ask. PAT's answer is to put the role walls in the data layer itself. Permissions that live in the data query cannot be talked out of, because content a role must not see is never retrieved in the first place; there is nothing behind the refusal to be coaxed loose.

An ecosystem is where this conviction carries the most weight, because an ecosystem is deliberately the widest view PAT offers anyone — a cross-firm picture spanning a whole managed portfolio. The consultant's breadth is exactly what makes hard walls necessary, and every direction of visibility runs through the same data-layer enforcement. A member firm looking at its results cannot reach a fellow member's, not because a screen hides them but because the firm role's queries do not return them. A vendor receives alignment evidence about its own products because that is all the vendor role's data access contains — there is no portfolio view a vendor could be argued into. Ask Pat inherits the same walls rather than adding a new opening: each role's Pat retrieves only that role's permitted content, so a cleverly phrased question to the assistant meets the same boundary as a query to any surface. And the consultant's own view obeys the discipline too — structure and alignment signal, not a firm's private answer text beyond what the role permits. The breadth an ecosystem grants its owner is safe to grant precisely because it is defined by what the consultant role's queries return, not by what a well-behaved interface chooses to show.

## A worked example

Every name in this example is invented for illustration. Northgate Advisory, a consultancy, manages an ecosystem in PAT whose members are three accounting firms — Meridian Ledger Partners, Harbor & Vale Accountants, and Copperfield & Co — and whose products in play include a ledger platform called Cloudform Books.

Each firm has completed its own five-module assessment, and Cloudform Books' vendor has made structured declarations of the product's capabilities. From the ecosystem view, Northgate sees the alignment structure across the set: suppose the assessed experience of Cloudform Books' integration capability runs below its declaration at Meridian Ledger Partners and Copperfield & Co, while at Harbor & Vale the experience actually outruns the declaration. That both-ways pattern is exactly what the alignment delta is built to carry, and seeing it across three firms at once is what the ecosystem exists for.

Northgate's session moves through the consultant surfaces in sequence. The per-firm cards give the scan: three cards, each summarizing a member firm's alignment status, and the cross-ecosystem comparison view sets the three side by side, which is where the split pattern around Cloudform Books becomes visible as structure rather than anecdote. The same view answers a second cross-firm question: suppose Copperfield & Co reads strong in a domain where Meridian Ledger Partners struggles — a pairing no single firm's assessment could reveal, and exactly the kind of structure a portfolio advisor turns into an agenda. The comparison also points at Harbor & Vale as the interesting case, so Northgate opens that firm's card to look closer, reading its Integration result — a 62, presented with its band leading — alongside the integrity signal that accompanies it. Preparing for an advisory meeting, Northgate then opens Harbor & Vale's structured firm brief for the deeper review: the firm's band-first pillar picture and its alignment signal around the products it uses, laid out for a working conversation. What the brief does not contain is telling too — Harbor & Vale's partners wrote candid open-ended answers during assessment, and that private answer text is not what Northgate's role surfaces; the consultant reads structure and signal, not the firm's raw words beyond what the role permits.

Meanwhile, the boundaries hold. Meridian Ledger Partners sees its own results, not Harbor & Vale's. Cloudform Books' vendor receives alignment evidence about its own product — a structured, evidence-based view of where its declarations hold and where they diverge, the kind of material an honest product conversation can be built on — but it does not browse the portfolio. When Northgate asks Ask Pat a question while preparing the brief, the answer draws only on content the consultant role can see, with the enforcement sitting at the data layer. Each participant's view stops where its role stops; only Northgate, as the ecosystem owner, holds the picture across the whole set.

## What an ecosystem is not

An ecosystem is not a benchmark cohort. A benchmark cohort is an anonymous comparison group governed by publication rules — a minimum of five contributors, a cap on any single contributor's share — and contributors remain anonymous within it. An ecosystem, by contrast, is a managed set: the consultant who owns it knows which firms are members, because managing them is the point. The two constructs answer different questions and must not be conflated.

An ecosystem is not a ranking or league table of its member firms, and PAT does not present it as one; comparison context in PAT is never a leaderboard. It is not a data-sharing arrangement among members: joining an ecosystem does not expose a firm's results to other firms, and it does not enlarge any vendor's visibility. Nor are the consultant's surfaces transcripts of member firms' assessments: per-firm cards, firm briefs, and comparison views carry structure and alignment signal, not a firm's private answer text beyond what the role permits — a brief is a structured reading of a firm, not a window into its written words. It is not a vendor-owned or firm-owned construct — the ecosystem belongs to the consultant role. And it is not a scoring object: an ecosystem assembles and reveals alignment structure, but scores themselves come from firm assessments through deterministic arithmetic, exactly as they do everywhere else in PAT.

## Common misconceptions about ecosystems

One misconception is that role walls relax inside an ecosystem — that because the consultant sees across firms, membership must loosen the boundaries for everyone in the set. The opposite is true. Membership widens exactly one view, the owning consultant's, and even that view is bounded to structure and alignment signal. Every other participant's visibility is unchanged by joining: firms still see their own results, vendors still see evidence about their own products, and the walls between them are enforced at the data layer regardless of what construct they belong to.

A second misconception treats Ask Pat as a potential side door around ecosystem boundaries — the idea that the right question, phrased the right way, might draw out content the asker's role cannot see. Pat's role scoping is enforced at the data layer: each role's Pat retrieves only that role's permitted content, so there is nothing outside the wall for an answer to be built from, however the question is put.

A third misconception is that a vendor whose product is in play across many ecosystems accumulates visibility with each one. It does not. The vendor role receives structured, evidence-based views of where its own products' declarations hold and diverge, and that scope does not grow with the number of managed sets the product appears in — a product in ten ecosystems earns its vendor no window into any of them.

A fourth misconception is that joining an ecosystem changes who owns a firm's data. It changes nothing about ownership: tenants' data belongs to them, inside an ecosystem as everywhere else in PAT, and if a member firm ever leaves the platform its data is removed, with the removal receipted.

## Questions this article answers

What is an ecosystem in PAT? A consultant-managed construct consisting of a set of member firms plus the products in play across them, existing so the consultant can see cross-firm alignment structure.

Who owns an ecosystem? The consultant, as ecosystem owner; an ecosystem is never a firm-owned or vendor-owned construct.

Can member firms see each other's results? No. Membership does not open one firm's results to another; each firm sees only what the firm role permits.

What does a vendor see when its product is in play in an ecosystem? Alignment evidence about its own products — where declarations hold and where they diverge — never the consultant's portfolio picture.

Where are the role walls around an ecosystem enforced? At the data layer: permissions live in the data query itself, so content outside a role is never retrieved.

What surfaces does a consultant work from inside an ecosystem? Per-firm cards for scanning, structured firm briefs for deeper single-firm review, and cross-ecosystem comparison views for reading the portfolio side by side.

Does the consultant see a firm's open-ended answer text? Consultants see structure and alignment signal — not a firm's private answer text beyond what the role permits.

Is an ecosystem the same as a benchmark cohort? No. A benchmark cohort is an anonymous comparison group governed by suppression rules; an ecosystem is a managed set whose membership the owning consultant knows by design.

Does an ecosystem compute scores? No. An ecosystem assembles and reveals alignment structure; scores come from firm assessments through deterministic arithmetic, exactly as elsewhere in PAT.

## Related terms

Alignment Delta, the two-way gap between declared capability and assessed experience that the ecosystem view reveals across firms. Benchmark Cohort, the anonymous comparison construct an ecosystem is often mistaken for and is not. Pillar, the five scoring constructs behind each member firm's operational picture. Band, the five-level lexicon in which member-firm results present. Integrity Score, the response-quality signal that accompanies the scores a consultant reads. Evidence Lineage, the rule ensuring every number in an ecosystem view traces to its source.
