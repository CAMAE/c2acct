---
id: G02
title: Capability
audience: all-signed-in
depth: CORE
vertical: global
words: 2922
---

A capability in PAT is a discrete, declarable unit of product function: one specific thing a vendor states its product can do, expressed inside a structured declaration rather than as free-form marketing copy. Capabilities are the nodes where the two sides of PAT meet — a vendor declares them, and firms' assessed experience verifies them — which is what makes a measured alignment picture possible at all. Every capability-related number you see traces back through evidence lineage to the declaration and the assessment responses that produced it.

## What a capability is

A capability is the smallest unit of declared product function that PAT treats as a distinct object. When a vendor participates in PAT, it does not submit a brochure or a narrative pitch; it makes structured declarations, and each declared capability is one node in that structure. A capability names something specific the product is claimed to do, in a form precise enough that firms' assessed experience can be set against it.

This node-level design matters because PAT's core measurement — the alignment delta — is a comparison between what was declared and what firms actually experience. A comparison needs two sides shaped the same way. By expressing product function as discrete capabilities rather than as prose, PAT gives the vendor's side of the comparison a stable, addressable shape. The firm's side comes from assessment: firms answer a consistent set of questions on a consistent numeric scale, and that assessed experience is what a declared capability is verified against.

A capability is therefore best understood as a claim held to a standard. It is visible to the roles that are permitted to see it, it is verifiable through firm assessment, and it carries evidence: no capability-related figure appears anywhere in PAT without a lineage back to its sources.

## Why the capability construct exists

The capability construct exists because PAT's evidence philosophy — evidence, not advertising — needs a unit of account. In the accounting ecosystem PAT serves, firms choose and depend on software, vendors describe what their software does, and consultants manage the picture across many firms at once. Descriptions of product function are traditionally written to persuade. PAT's position is that they should instead be written to be verified.

That position only works if declarations are structured. A paragraph of marketing language cannot be verified, because it does not commit to anything specific enough to check. A declared capability can be, because it isolates one unit of claimed function and holds it still long enough for firm experience to be measured against it. The capability is the mechanism that converts "what the vendor says" from advertising into evidence.

The construct also serves both sides fairly. The alignment delta flows both ways: a product can underperform its declaration, and it can also outperform it. A vendor whose product delivers more than it claims sees that in the evidence just as clearly as one whose product delivers less. Without capability-level structure, neither direction could be shown with any traceability — there would be nothing precise to be above or below.

## How capabilities are declared, verified, and scored

The vendor side comes first. A vendor makes structured declarations of its product's capabilities. These declarations are commitments of description, not aspirations: what the product is claimed to do, stated as discrete nodes.

The firm side supplies the verification. Firms assess their own operations through PAT's assessment — five modules, one hundred questions in total, answered on a consistent numeric scale. Assessed firm experience is the evidence that declared capabilities are set against. Open-ended questions in the assessment carry zero score weight; they add qualitative texture but never move a number, so the quantitative side of verification rests entirely on the consistently scaled responses.

The arithmetic that connects the two sides is deterministic. Scores in PAT are computed on a 0–100 scale by arithmetic alone; no AI model sits anywhere in the scoring path, and the same answers always produce the same result. What holds for scores in general holds for capability evidence in particular: the numbers that show how firm experience relates to a declared capability are produced by the same deterministic machinery, not by a model's judgment.

Rolled up, capability-level evidence becomes the alignment picture each role sees at its own scope. Vendors receive alignment evidence for their declared capabilities. Consultants see alignment structure across the set of firms and products in an ecosystem they manage. Firms see their own assessed position. In every case, evidence lineage applies: any displayed number traces to the declaration and assessment data behind it. PAT does not surface orphan numbers, at the capability level or anywhere else.

Signal quality travels with the evidence. Response-pattern integrity checks accompany scores so a reader knows how much weight a result can bear — an integrity flag is information about the data, not an accusation against anyone who supplied it.

## Function areas: where capabilities sit in a declaration

Vendors do not declare capabilities into a void. Declarations are made across defined function areas of practice software, so every declared capability sits inside a named area of product function. The function area gives a declaration its map: instead of one undifferentiated list of claims, a vendor's declaration is organized by the areas of practice software its product operates in, with each capability a discrete node inside its area.

That structure carries through to the evidence. Because capabilities are declared area by area, the alignment evidence a vendor receives comes back in the same shape: structured, evidence-based views of where alignment holds and where it diverges. A vendor can see not merely that a gap exists somewhere in its product, but which defined area of function the gap sits in — and, because the alignment delta flows both ways, whether the product in that area is running ahead of its declaration or behind it.

This shape is what makes capability evidence usable in honest sales and product conversations. A vendor pointing to alignment evidence in a defined function area is doing something different from quoting its own marketing: it is showing measured firm experience set against its own committed claims, with lineage back to the sources. That is the evidence-not-advertising philosophy operating at the level where product conversations actually happen.

## Capability evidence over time

A capability's alignment picture is a reading at a point in time, not a permanent label. PAT treats every score this way: firms can re-take their assessments as their operations change, and when they do, the firm side of the capability comparison updates with them. The declared capability holds still by design; the assessed experience set against it does not have to.

This matters in both directions. A capability whose evidence once showed firm experience running below the declaration can show that gap narrowing on later assessments — because the product changed, because the firms using it changed how they work, or both. PAT does not adjudicate the cause; it measures the current state of the comparison, deterministically, from the current answers. Equally, evidence of strong alignment is not a permanent credential: it describes the comparison as of the assessments that produced it, and a vendor reading capability evidence should read it as the present state of a relationship between declaration and experience, not as a settled verdict.

Read over a longer horizon, this is what gives the capability construct its working value. A declaration that stays fixed while assessed experience moves around it turns re-assessment into a record: each new reading shows where the comparison stands now, and the sequence of readings shows which way it has been moving.

## Who sees capability evidence, and where Ask Pat fits

Capability evidence is role-scoped, like everything else in PAT. A vendor receives alignment evidence for its own declared capabilities. A consultant managing an ecosystem sees alignment structure across the member firms and the products in play — structure and alignment signal, not a firm's private answer text beyond what the role permits. A firm sees its own assessed position. Each role reads the capability layer at its own scope, and no role reads past it.

Ask Pat operates inside those same walls. A signed-in user can ask Pat about capability-related content, and Pat answers from PAT's own documented content only, retrieving just what that user's role permits — the scoping is enforced at the data layer, not by convention. Pat's answers cite the documented content they draw from, so a user can see where an answer came from; when the documentation does not cover a question, Pat says so plainly rather than guessing. And Pat assists with understanding only: it never generates scores, and it plays no part in producing capability evidence.

## Design rationale — why the capability construct was built this way

Three of PAT's design commitments meet in the capability construct, and each explains part of its shape.

The first is evidence lineage. PAT's rule is that a number whose origin cannot be traced is marketing: every displayed figure must be able to answer the question "where did you come from." The capability is what makes that answer possible on the vendor side of the platform. A lineage trail that ends in a paragraph of product prose has not really ended anywhere, because prose does not commit to anything specific enough to serve as a source. A trail that ends at a declared capability ends at a discrete, addressable object: this claim, in this function area, declared by this vendor. Capabilities exist, in part, so that lineage has somewhere solid to terminate.

The second is deterministic scoring. PAT holds that measurements must be repeatable and auditable, and that model behavior can shift over time — a score that could read the same answers differently on different days is an opinion with a timestamp, not a measurement. Capability evidence inherits this discipline from both of its sides: the declaration holds still by construction, and the firm-side answers pass through arithmetic that returns the same result every time it runs. That is what lets a vendor bring capability evidence into a product or sales conversation with confidence — the figure under discussion could be re-derived from its sources and come out identical.

The third is role walls enforced in the data layer. PAT's position is that security which depends on an assistant's good behavior fails, while permissions that live in the data query itself cannot be talked out of. Capability evidence is exactly the kind of material this discipline protects: it is commercially meaningful to vendors, operationally revealing about firms, and structurally interesting to consultants — three audiences with three different entitlements. Scoping each role's view at the data layer means the boundary holds whether a user is browsing surfaces directly or asking Pat questions, because Pat's retrieval simply cannot reach past the asker's role.

## A worked example

The names here are invented and purely illustrative. Suppose Meridian Ledger Co., a software vendor, declares a capability describing automated bank-feed reconciliation in its product. That declaration is now one node in Meridian's structured declaration: a specific, addressable claim.

Now suppose Harbor & Finch LLP, an accounting firm using the product, completes its PAT assessment. Its answers — given on the same consistent numeric scale as every other firm's — describe its actual operational experience, including in the areas where Meridian's declared capability should show up in practice. The deterministic arithmetic turns those answers into scores, and the assessed experience becomes evidence against the declaration.

If Harbor & Finch's experience sits below what Meridian declared, the alignment delta for that capability shows a gap in one direction. If the firm's experience exceeds the declaration — the product quietly does better than Meridian claimed — the delta shows a gap in the other. Either way, the number Meridian sees is not an opinion. It traces to a specific declaration and to assessed responses, and if the underlying response patterns raised an integrity flag, that flag travels alongside so Meridian knows how much weight the evidence can bear.

Take the example one step further in time. Suppose the first reading showed Harbor & Finch's experience sitting below Meridian's declaration, and suppose that over the following quarters the firm reworks how its reconciliation actually runs and re-takes its assessment as its operations change. Its new answers, on the same consistent scale, pass through the same deterministic arithmetic, and the delta on Meridian's declared capability narrows. Nothing about the declaration moved; the firm side of the comparison did. The evidence Meridian now sees is a reading of the comparison as it stands today — which is exactly what PAT intends a score to be: a reading at a point in time, not a permanent label on either party.

Notice, finally, what the structure lets Meridian do with the evidence. Because the capability was declared within a defined function area of practice software, Meridian can bring the reading into an honest sales or product conversation at that same level: here is what we declared in this area, here is what assessed firm experience shows, here is where alignment holds and where it diverges. Every figure in that conversation traces to its sources. None of it is advertising.

## What a capability is not

A capability is not a marketing claim. Marketing describes; a capability commits. The moment a vendor declares a capability, it has created something firm experience will be measured against, in both directions.

A capability is not a score, and it is not a guarantee. Declaring a capability does not award a number, and a strong declaration promises nothing about outcomes. The numbers come later, from assessed firm experience processed through deterministic arithmetic.

A capability is not verified by the vendor. Verification comes from firms' assessed experience, not from the party that made the declaration. That separation is the whole point of the construct.

A capability is not a ranking device. Capability evidence exists to show alignment between declaration and experience — it is never used to publish league tables of vendors, and benchmark context in PAT is comparison, not ranking.

Finally, capability evidence is not AI-generated. Ask Pat can help a signed-in user understand capability-related content within their role's scope, but it never generates scores, and no model participates in producing capability evidence.

## Common misconceptions

**"Declaring more capabilities improves a vendor's standing."** It does not. A declaration awards nothing; it creates comparison surface. Each declared capability is one more claim that firms' assessed experience will be measured against, in both directions, so a longer declaration is a larger commitment to be verified — not a larger score.

**"A gap on a capability means the vendor was dishonest."** A delta showing firm experience running below a declaration is a measurement of the current state of a comparison, not a verdict on anyone's intent. Products change, firms' operations change, and every reading is a point in time. The productive response to a gap is to understand it — and, on later assessments, to watch whether it moves.

**"Firms fill out a checklist about each declared capability."** They do not. The firm side of capability verification comes from the standard assessment — five modules, one hundred questions about the firm's own operations, answered on a consistent numeric scale. Assessed experience is then set against declarations; there is no per-capability questionnaire for firms to complete.

**"A product outperforming its declaration is a reporting anomaly."** It is an expected outcome the construct is built to show. The alignment delta flows both ways by design, and evidence that experienced reality exceeds a declaration presents with the same traceability as evidence of a shortfall.

## Questions this article answers

**What is a capability in PAT?** The smallest unit of declared product function PAT treats as a distinct object: one specific claim, made inside a vendor's structured declaration, that firms' assessed experience can be verified against.

**Who declares capabilities?** Vendors, across defined function areas of practice software; each capability is a discrete node inside its area.

**How is a capability verified?** By firms' assessed experience: answers to the five-module, one-hundred-question assessment, given on a consistent numeric scale, are set against the declaration through deterministic arithmetic.

**Does declaring a capability produce a score?** No. Declaration is description, not scoring; numbers arrive only when assessed firm experience is measured against the claim.

**Can a product exceed its own declaration?** Yes. The alignment delta flows both ways, and evidence of over-delivery is shown with the same lineage as evidence of a gap.

**Is capability evidence permanent?** No. It is a reading at a point in time: as firms re-assess, the firm side of the comparison updates while the declaration holds still.

**Who sees capability evidence?** Each role at its own scope — vendors for their own declarations, consultants as alignment structure across a managed ecosystem, firms for their own assessed position — with the scoping enforced at the data layer.

**Does any AI produce capability evidence?** No. The evidence comes from deterministic arithmetic. Ask Pat can explain documented capability content within a role's scope, but it never generates scores.

## Related terms

Alignment Delta — the measured gap between a declared capability and firms' assessed experience of it. Pillar — the five scoring constructs into which firm assessment is organized. Module — the assessment unit whose questions supply the firm-side evidence. Evidence Lineage — the rule that every displayed number traces to its sources. Integrity Score — the response-pattern quality signal that accompanies scores. Ecosystem — the consultant-managed construct in which cross-firm capability alignment becomes visible.
