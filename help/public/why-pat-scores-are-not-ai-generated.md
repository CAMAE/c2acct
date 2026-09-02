---
id: P06
title: Why PAT scores are not AI-generated
audience: public
depth: CORE
vertical: global
words: 2899
---

No AI model sits anywhere in PAT's scoring path. Every PAT score is produced by deterministic arithmetic from a firm's answers, which means the same answers always produce the same score — no model interprets, adjusts, estimates, or generates any number you see. PAT does include an assistant, Ask Pat, but it lives entirely outside scoring: it helps people understand PAT's documented content, and it never generates scores.

## The determinism position, stated plainly

When PAT says its scores are deterministic, it means the calculation from answers to score is fixed arithmetic on a 0–100 scale. Feed in the same answers today, next month, or from two different firms, and the arithmetic returns the same result. There is no step in that path where a model — large, small, or otherwise — reads responses and produces a judgment. Nothing in the scoring path learns, drifts, or varies.

This is worth stating as a position rather than a footnote, because "AI-generated" has become a reasonable default assumption about any modern scoring product. It is a fair question to ask of PAT, and the answer is unambiguous: scores are computed, not generated. If your firm's answers do not change, your score cannot change. If your score differs from another firm's, the difference traces entirely to differences in answers — never to a model seeing the two firms differently.

## Why PAT keeps models out of the scoring path

The reason is what the scores are for. PAT exists to measure alignment — between a firm's operations and its own picture of them, and between what vendors declare and what firms experience. Measurement of that kind is only useful if the instrument holds still.

Comparability demands it. PAT's five pillar scores are designed to be compared — across pillars within one firm, across firms, and over time. A model in the scoring path would put that at risk: model behavior can shift, and a score that might read the same inputs differently on different days is not a measurement, it is an opinion with a timestamp. Deterministic arithmetic guarantees that every comparison compares like with like.

Accountability demands it too. PAT's evidence philosophy is that displayed numbers trace to their sources — evidence lineage, with no orphan numbers. A deterministic score honors that fully: you can follow the path from any score back to the answers that produced it, and the path explains the number completely. A model-generated score cannot offer that. "The model weighed your responses" is not a lineage; it is a shrug with confidence.

And trust in the shared picture demands it. Firm scores feed the comparison context PAT provides, and participants — firms, vendors, and the consultants who manage ecosystems of both — rely on that context meaning the same thing for everyone. An instrument with a model inside would ask every participant to trust not just the questions and the math, but an opaque intermediary. PAT chose to have no such intermediary.

## Where assistance does sit: Ask Pat

PAT is not a platform without an assistant — it is a platform with a carefully placed one. Ask Pat answers questions using PAT's own documented content only. It is role-scoped, so each user sees only content for their role, and that scoping is enforced at the data layer rather than left to the assistant's discretion. When Ask Pat lacks documented evidence for a question, it says so rather than guessing.

The boundary is simple to state: Pat assists with understanding; it never generates scores. Ask Pat can help you make sense of what a term means, where to look, or how something in PAT works, as documented. It has no hand in what any score is. Understanding is a good use of an assistant, because a wrong turn there is visible and correctable — you can check what Pat says against the documentation it draws from. Scoring is a bad place for one, because a score is a claim of measurement, and measurement should not depend on anything that might answer differently twice.

## Answers that show their sources

Ask Pat's answers cite the documented content they draw from, so a user can see where an answer came from and check it against the source. This is the assistant-side expression of the same principle that governs scores: nothing presented should be untraceable. A score traces to the answers that produced it; an Ask Pat answer traces to the documentation it drew on. In neither case is anyone asked to take an output on faith.

The role scoping works the same transparent way. Each role's Pat retrieves only that role's permitted content — the restriction lives at the data layer, in what the assistant can reach, not in a promise about what it will choose to say. And when the documentation does not cover a question, Pat says so plainly instead of improvising. Between the citations, the data-layer scoping, and the willingness to say "the documentation doesn't cover that," the assistant is built to be checkable at every point — which is exactly the standard a platform keeps when it has decided that unverifiable output has no place anywhere in it, scoring path first of all.

## Measuring AI readiness without AI-generated measurement

One of PAT's five assessment modules is Automation & AI Readiness, which feeds the Automation pillar. So PAT does take AI seriously — as a subject of measurement. A firm's readiness for automation and AI is one of the five areas the assessment examines.

There is no tension in that. An instrument does not need to be made of the thing it measures. Asking structured questions about a firm's automation and AI readiness, scoring the answers with fixed arithmetic, and presenting the result in a band is exactly the same honest process PAT applies to operations, integration, governance, and strategy. If anything, the pairing makes the position clearer: PAT is interested in AI where it belongs in the picture, and disciplined about keeping it out of the one place it would undermine the picture — the scoring path.

## Sourced content and named human review

The discipline behind the scores extends to the content around them. Learning and assessment module content must cite authoritative sources to enter the system at all — unsourced content is rejected mechanically at import, not flagged for someone to reconsider later. And content goes live only after named human review sign-off, with the review recorded: who reviewed it, and when.

Notice what fills the role a model might occupy elsewhere. Where content needs judgment — is this material sound, is it properly sourced, should it serve to real users — PAT puts a named human on the record rather than an algorithm behind a curtain. Where the work is mechanical — checking that a source citation exists — the system enforces the rule mechanically, with no discretion involved. Judgment is done by accountable people; enforcement is done by fixed rules; and generation by model appears nowhere in the chain. This is of a piece with where PAT comes from: it was built inside the profession it serves, by people who run and advise practices, and it treats review discipline the way a practice treats it — as something you sign your name to.

## Repeatable math is what makes change measurable

PAT treats a score as a reading at a point in time, not a permanent label. Firms re-assess as their operations change, and movement between readings — whether an area shifted from one quarter to the next — is the long-term reading the platform intends. Determinism is what makes that movement trustworthy.

Because the arithmetic is fixed, a score that changes between two assessments can only have changed for one reason: the answers changed. The comparison between readings is a comparison of the firm at two moments, measured by an instrument that held perfectly still in between. Put a model in the scoring path and that clean inference collapses — a moved score might mean the firm changed, or might mean the model read the same kind of answers differently this time, and no one could say which. A measurement of change requires an instrument that cannot itself be the thing that changed. PAT's scoring path is built to be exactly that instrument, which is why re-assessment in PAT yields trajectory rather than a pair of unrelated opinions.

## What determinism does not claim

Being precise about this position also means being precise about its limits. Deterministic scoring guarantees that the path from answers to score is fixed and repeatable; it does not guarantee that the answers themselves are careful, and PAT does not pretend otherwise. That is why signal integrity exists as a separate, honest layer: response-pattern quality checks — straight-lining detection is one example — accompany scores so readers know how much weight a result can bear. An integrity flag is information, not an accusation; it reports what a response pattern looks like, nothing more.

The two ideas work together rather than overlapping. Determinism answers the question "could this number have come out differently from these answers?" — and the answer is no, ever. Signal integrity answers the question "how firmly should I stand on these answers?" — and the answer varies, honestly, case by case. Neither layer involves a model, and neither pretends to a certainty it does not have. A platform that generated scores with a model would blur these two questions into one opaque output; PAT keeps them separate precisely so each can be answered plainly.

## No model in the presentation, either

Determinism in PAT does not stop where the calculation ends. Results present in five named bands — Early, Developing, Building, Established, Leading — with the band leading and the raw 0–100 number in support, and that presentation step is as mechanical as the arithmetic beneath it. The band a score presents in follows from the score itself. No model reads a firm's situation and decides it "feels like" one band rather than another; no judgment intervenes between the number and the name it presents under.

This is worth spelling out because presentation is where interpretive machinery often slips in quietly. A platform can compute honestly and still editorialize in how it displays — softening one result, sharpening another, summarizing with an opinion. PAT's answer is the same at this layer as in the scoring path: the display is a consequence of the data, all the way through. What a firm sees — scores, bands, and insights — stands in a fixed, followable relationship to what the firm answered. From the moment an answer is given to the moment a banded result appears on screen, every step is either arithmetic or a rule, and a reader can trace the whole chain without meeting a model anywhere along it.

## What this means when you read a PAT score

For a firm, deterministic scoring means your scores are yours in the strictest sense: they are an arithmetic consequence of your answers, and nothing else. There is no model to second-guess, no black box between what you said and what you scored. If you want to understand a score, the answers explain it — fully.

For a vendor, it means the alignment evidence you receive is stable ground. The measured relationship between what you declare and what firms experience rests on scores that cannot drift underneath you.

For a consultant or ecosystem owner, it means comparisons across a portfolio are honest. Two firms' scores differ only because their answers differ, so the structure you see across an ecosystem reflects the firms, not an intermediary's variance.

And for anyone reading any PAT number, it means one clean rule: if a score appears in PAT, arithmetic produced it, answers explain it, and no model touched it. Assistance in PAT talks about the numbers; it never makes them.

## Why PAT works this way

Two design commitments outside the scoring path come from the same instinct that keeps models out of it. The first is evidence lineage: a number whose origin cannot be traced is marketing, and every figure PAT displays must be able to answer the question "where did you come from." That rule is why a model-generated score could never fit the platform — not because models are unwelcome as a category, but because a generated number has no lineage to give. Deterministic scoring is what a scoring path looks like when the lineage rule is applied without exception.

The second is the sourced-content gate. In a profession built on standards, content is only as trustworthy as its sources, so learning and assessment material that lacks authoritative sourcing is rejected mechanically at import, and material serves only after human review signed by name and recorded. The pattern is the same as in scoring: fixed rules do the enforcement, accountable people do the judgment, and nothing enters the system on the strength of unverifiable output. A platform assembled this way does not need to make a special case of its scoring path — an exception there would be the anomaly.

## A closer look: one scenario, start to finish

Consider an invented firm working through its first PAT assessment. It completes the Governance, Controls & Vendor Risk module, and its Governance pillar score appears — say 58, presented band-first, the numbers purely illustrative. A skeptical partner asks the natural modern question: did an AI look at our answers and decide we are a 58? The answer the platform can give is complete. The twenty scaled Governance answers, combined by fixed arithmetic, produced 58; the band followed from the score by rule; no model participated at any point; and running the same answers through the calculation tomorrow would produce 58 again.

The partner then turns to Ask Pat to understand what the band means. Pat answers from PAT's documented content, citing the material it drew from — and when the partner pushes into a question the documentation does not cover, Pat says so plainly instead of improvising. Notice what did and did not happen: an assistant helped a person understand a score; it had no hand in making one.

Two quarters later, after tightening its vendor-risk controls, the firm re-assesses the module and the score lands higher. Because the arithmetic could not have drifted, the movement has exactly one explanation — the answers changed — and the partner who asked the skeptical question now holds the cleanest possible evidence that the instrument measured the firm both times, not itself. That is the determinism position, experienced rather than argued.

## Common misconceptions

*PAT is against AI.* No — one of the five assessment modules is Automation & AI Readiness, and a firm's readiness for automation and AI is a core subject of measurement. PAT's position is about placement: AI is measured by the platform, not used to generate the platform's measurements.

*Ask Pat has some influence on scores.* None. Pat assists with understanding — answering questions from PAT's documented content, within each role's permitted scope — and never generates scores. The assistant and the scoring path do not touch.

*"Deterministic" means the score is guaranteed to be right.* Determinism guarantees that the path from answers to score is fixed; it says nothing about whether the answers were careful. That is why signal-integrity checks accompany scores as a separate layer — "could this number differ from these answers?" and "how firmly do these answers stand?" are different questions, and each gets an honest answer.

*Even if the math is fixed, a model probably shapes how results are presented.* The presentation is as mechanical as the calculation: the band follows from the score by rule, and no judgment intervenes between the number and the name it presents under.

*Keeping models out of scoring is a technical limitation.* It is a measurement position. A score must mean the same thing every time it is computed, so PAT pairs a fixed scoring path with an assistant placed deliberately outside it — each doing the work only it should do.

## Questions this article answers

**Are PAT scores generated by AI?** No. Every score is produced by deterministic arithmetic on a firm's scaled answers; no model sits anywhere in the scoring path.

**Can the same answers ever produce a different PAT score?** No — deterministic means the same answers always produce the same score, on any day, for any firm.

**What is Ask Pat, and what can it do?** An assistant that answers questions from PAT's own documented content, scoped to each user's role at the data layer. It helps with understanding and never generates scores.

**What does Ask Pat do when the documentation doesn't cover a question?** It says so plainly rather than guessing, and the answers it does give cite the documented content they draw from.

**How can PAT assess AI readiness without using AI to score?** An instrument does not need to be made of what it measures: the Automation & AI Readiness module uses the same structured questions and fixed arithmetic as every other module.

**Who decides what content enters PAT?** Fixed rules and named people: unsourced material is rejected mechanically at import, and content serves only after recorded human review sign-off.

**Does anything interpretive sit between a score and the band it displays in?** No — the band follows from the score by rule, so the presentation is mechanical end to end.

**If a firm's score moves between two assessments, could the platform have caused the movement?** No. The arithmetic cannot drift, so a changed score can only reflect changed answers.

If you want the fuller picture of the arithmetic itself — the modules, the question design, and the banded results — the article on how PAT scoring works walks through it step by step.
