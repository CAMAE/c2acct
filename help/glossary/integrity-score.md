---
id: G05
title: Integrity Score
audience: all-signed-in
depth: CORE
vertical: global
words: 2992
---

An integrity score is PAT's signal-integrity reading: the result of response-pattern quality checks that accompany an assessment score so a reader knows how much weight that result can bear. It does not change the score itself — scoring in PAT is deterministic arithmetic on the answers given — and it is not an accusation. It is information about the response pattern behind a number, presented alongside the number.

## Definition of the integrity score in PAT

The integrity score is the output of PAT's response-pattern quality checks. When a firm completes an assessment, the answers produce scores through deterministic arithmetic on a 0–100 scale. Alongside those scores, PAT examines the pattern of the responses themselves — how they were given, not just what they add up to — and attaches the resulting signal-integrity reading to the presented result. Straight-lining detection is an example of such a check: a response pattern in which the same answer is selected again and again is a pattern worth surfacing to anyone who will rely on the score.

The purpose of the reading is stated in one sentence in PAT's design: integrity information accompanies scores so readers know how much weight a result can bear. A score with a clean signal behind it can carry interpretive weight. A score whose response pattern raises questions still exists, still computed the same way, but a reader deserves to see the pattern before leaning on the number.

## Why signal integrity exists

PAT's scoring model is deliberately simple to trust: the same answers always produce the same score, no model sits anywhere in the scoring path, and results present in five bands from Early to Leading. That determinism is a strength, but it has a corollary. Arithmetic is faithful to whatever it is given. If the responses feeding it are hurried, inattentive, or mechanically uniform, the arithmetic will still produce a tidy number — and a tidy number can look more certain than it is.

Signal integrity exists to close that gap. Because the scoring path is deterministic and transparent, the honest place to talk about confidence is beside the score, not inside it. Rather than quietly adjusting results or discarding responses, PAT keeps the computation untouched and adds a second channel of information: the quality of the signal that produced the result. This fits PAT's broader evidence philosophy — evidence, not advertising — in which displayed numbers trace to their sources and nothing asks to be taken on faith. A score's source is a set of responses; the integrity reading tells you something about that source.

There is also a benchmarking reason. PAT benchmarks are comparison context, never rankings, and their value depends on the quality of contributed data. Knowing how much weight an individual result can bear matters to everyone who reads results in context.

## How integrity checks work

Integrity checks in PAT are response-pattern quality checks. They examine the pattern of answers a respondent gives across an assessment, looking for signatures that suggest the responses may not reflect considered judgment. Straight-lining — selecting the same point on the scale over and over — is the named example: PAT's assessments ask 100 questions across five modules, 20 per module, answered on a consistent numeric scale, and identical wording repeats across modules on purpose so the five pillar scores are comparable. That structure gives response patterns room to be meaningful; it also makes mechanical answering visible when it happens.

Three properties of the checks matter for interpretation. First, they run alongside scoring, not inside it. The score a firm sees is produced by deterministic arithmetic on its answers; the integrity reading accompanies that score rather than altering it. Second, the output is informational. An integrity flag tells a reader that a pattern was detected; it does not assert a motive, and PAT is explicit that a flag is information, not an accusation. Third, the checks serve readers of results. Their function is to calibrate how much weight a result can bear — for the firm reading its own scores and for anyone reading results in a permitted context.

Open-ended questions sit outside this arithmetic entirely: they carry zero score weight and are qualitative only, so the numeric response pattern is what the integrity checks concern themselves with.

## Integrity readings and scores as point-in-time readings

PAT treats an assessment score as a reading at a point in time, not a permanent label, and the same is true of the integrity information that accompanies it. An integrity flag describes the response pattern behind one particular set of answers — the assessment as it was completed then. Because assessments can be re-taken as operations change, a flagged result is never a firm's final word on an area: the firm can return to that module, answer it under better conditions, and the new result carries whatever integrity reading its own response pattern earns.

The assessment experience is built to make that practical. The flow is paged with autosave, so a firm can stop and resume rather than pushing through in one fatigued sitting; progress is tracked per module; modules can be completed in any order over time; and results update as modules complete. Each of those facts bears on signal quality. A respondent who feels compelled to finish a 100-question assessment in a single stretch is more likely to produce the hurried or mechanically uniform patterns the integrity checks exist to surface. A respondent who can pause mid-module and come back has no structural reason to rush. The assessment design and the integrity checks work from opposite ends of the same problem: the design removes the pressure that produces weak signal, and the checks make weak signal visible when it appears anyway.

This also matches PAT's cadence philosophy. Engagement is paced — quarterly rhythms are the register PAT works in — and its reminders are deliberately no-guilt: informative nudges, never shame mechanics. An integrity flag belongs to the same temperament. It informs without accusing, and the response it naturally invites — take a more careful pass at that module when you are ready — is exactly the action the assessment's resumable, any-order structure makes easy.

## Numeric patterns and open-ended context

Each of the five modules covers its pillar through the same 20 scored questions plus a small set of open-ended questions. The open-ended questions are qualitative and carry zero score weight; their role is to give context in the firm's own words. Integrity checks concern the numeric response pattern only, because that is where the arithmetic lives — a mechanical pattern in the scored answers is what could make a number look more certain than it is.

The two channels are still read side by side. A reader weighing a module's score has more than the number and its integrity reading available: the module's open-ended answers put the firm's own description of that area next to the arithmetic. Where a numeric pattern has drawn a flag, that qualitative context does not repair or replace the score — nothing adjusts a deterministic result — but it gives the reader more of the source to look at before deciding how much weight the result should bear. That is the same evidence discipline PAT applies everywhere: numbers trace to their sources, and here the source includes both what was answered on the scale and what was said in the firm's own words.

## Design rationale — why it was built this way

Three design decisions explain why integrity information takes the form it does in PAT.

The first is deterministic scoring. PAT holds that a measurement must be repeatable and auditable; model behavior can shift over time, and a score that could read the same answers differently on different days would be an opinion with a timestamp, not a measurement. Determinism, though, is deliberately blind: arithmetic cannot tell a considered answer from a mechanical one. Once the computation is fixed by design, the only honest place left for confidence information is beside the result. The integrity reading is that place: it lets the score remain a pure measurement while the reader still learns something about what the measurement was made from.

The second is the zero weight given to open-ended questions. The rationale is that qualitative context should inform human judgment, not sway arithmetic — keeping scores comparable across firms while preserving each firm's own words. That decision draws the exact boundary the integrity checks patrol. Because only the scored numeric answers carry weight, only they can make a number look more certain than it is; so the pattern checks concern themselves with the numeric channel alone. And because the open-ended answers were never inside the arithmetic, they remain independent context a reader can consult when weighing a flagged result — words that stand beside the number precisely because they never fed it.

The third is the point-in-time principle. Operations change, so a permanent label would be false; re-assessment on a working rhythm is the honest design. Applied to integrity, the same principle means a flag describes one response pattern on one occasion, never a standing property of the firm. A design that treats every score as a current reading makes the flag exactly what PAT says it is — information about this reading, superseded whenever a newer reading exists.

## A worked example

The names here are invented for illustration. Suppose Harbor & Slate, a firm working through its assessment, completes all five modules in one sitting. Its Integration & Data Flow Maturity module comes back at 62 — the Building band — and the response pattern behind it is varied and considered. The score presents normally, and readers can lean on it.

Now suppose the same firm's Governance, Controls & Vendor Risk module shows a different pattern: the same scale point selected for question after question. Straight-lining detection surfaces this. The Governance score still computes exactly as the arithmetic dictates — determinism is not suspended — but the result now carries an integrity flag. A partner at Harbor & Slate reading the report sees both the number and the signal behind it, and understands that this particular module's result can bear less interpretive weight than the Integration result. Perhaps the respondent was rushed; perhaps the answers genuinely were uniform. The flag does not decide which. It tells the reader that the pattern exists, so the firm can consider whether that module deserves a more careful pass.

Nothing punitive follows from the flag in this example, because nothing punitive is what a flag is. It is a note on signal quality, attached where the signal was produced.

Suppose Harbor & Slate takes the flag as the informational note it is. The following quarter, the firm returns to the Governance, Controls & Vendor Risk module alone — modules can be completed in any order over time, and the paged flow with autosave means the responsible partner can work through it across two or three sittings instead of one crowded afternoon. The answers this time are varied and considered; the module's result updates when it completes, and the new Governance score presents without a flag. Because PAT treats a score as a reading at a point in time rather than a permanent label, the newer reading is simply the current one — the earlier flagged result was a reading of that moment, and this is a reading of this one.

There is a longer arc here too. If Harbor & Slate keeps re-assessing on a quarterly rhythm and its Governance work genuinely matures, the intended long-term reading is band movement — say, Developing to Building across assessments. A clean signal behind each reading is what lets that movement mean something: the firm, and anyone reading its results in a permitted context, can trust that the trend reflects considered answers rather than pattern noise.

## How Ask Pat relates to integrity readings

A firm that encounters an integrity flag and wants to understand it can ask Pat. Ask Pat is PAT's assistant, and it answers questions using PAT's own documented content only — so a question like "what does an integrity flag mean?" gets an answer drawn from the documentation that defines the flag, with the answer citing the documented content it draws from so the user can see where it came from. Each role's Pat retrieves only that role's permitted content, enforced at the data layer, and when the documentation does not cover a question, Pat says so plainly rather than guessing.

What Pat will not do is as important as what it will. Pat assists with understanding; it never generates scores. It cannot re-score a flagged module, cannot judge the intent behind a response pattern, and cannot offer a speculative reading the documentation does not support. The explanation of an integrity flag therefore lives inside the same discipline as the flag itself: documented, sourced, and informational.

## What an integrity score is NOT

An integrity flag is not an accusation. PAT states this directly: a flag is information. It records that a response pattern matched a quality check, and nothing more.

An integrity score is not a performance score. It says nothing about how mature a firm's operations are; that is what the five pillar scores and their bands express. A firm can score in the Leading band with a clean signal or with a flagged one — the two readings are separate channels.

An integrity reading is not an adjustment. It does not raise, lower, or reweight the deterministic score it accompanies. PAT's position is that the same answers always produce the same score; integrity information is presented beside the result, not folded into it.

Finally, an integrity check is not an AI judgment of a firm. No AI model sits anywhere in PAT's scoring path, and the integrity reading is part of how scored results are presented, not a generative assessment of intent.

## Common misconceptions

"A strong open-ended answer can offset a flagged numeric pattern." It cannot. Open-ended questions carry zero score weight, and nothing adjusts a deterministic result. Qualitative answers give a reader more of the source to look at when deciding how much weight a result can bear, but the flag describes the numeric response pattern and stays with it.

"Giving similar answers across modules counts against a firm." The same 20 questions repeat in every module on purpose — identical wording is what makes the five pillar scores comparable, with the module supplying the context. Answering the same stems thoughtfully in five different domains is the instrument working as designed, not a suspicious pattern. Straight-lining concerns mechanical uniformity in a response pattern, and even there the flag records the pattern without asserting anything about why it occurred.

"A flag means someone concluded the answers were dishonest." No such conclusion exists anywhere in the system. A flag records that a response pattern matched a quality check — information, not an accusation, in PAT's own words — and it leaves every explanation open, including that the uniform answers were genuine.

"A flag follows the firm permanently." It belongs to one assessment as completed at one moment. Because PAT treats a score as a reading at a point in time and modules can be re-taken in any order as operations change, the next completion of that module carries whatever integrity reading its own response pattern earns — and the newer reading is simply the current one.

"Ask Pat can review a flag and clear it." Pat assists with understanding only. It can explain what an integrity flag means from PAT's documented content, citing the documentation it draws from, but it never generates scores and holds no authority over integrity readings.

## Questions this article answers

**What is an integrity score in PAT?** It is the signal-integrity reading produced by response-pattern quality checks — information about the pattern of responses behind an assessment score, presented alongside that score so readers know how much weight the result can bear.

**Does an integrity flag change the score it accompanies?** No. Scoring is deterministic arithmetic on the answers given, and the same answers always produce the same score. The integrity reading sits beside the result; it never raises, lowers, or reweights it.

**What is straight-lining?** Straight-lining is the named example of a pattern the checks surface: selecting the same point on the numeric scale question after question. Surfacing it tells a reader the pattern exists; it does not assert a motive.

**Are open-ended answers part of the integrity checks?** No. Open-ended questions are qualitative and carry zero score weight, so they sit outside the arithmetic the checks protect. The checks concern the numeric response pattern only.

**Is an integrity flag an accusation?** No. PAT states this directly: an integrity flag is information, not an accusation. It records that a response pattern matched a quality check, and nothing more.

**What can a firm do about a flagged module?** Return to that module and complete it again under better conditions. Modules can be re-taken in any order over time, the paged flow with autosave removes any need to rush, and the new result carries the integrity reading its own responses earn.

**Does an AI model decide whether a firm's answers look suspicious?** No AI model sits anywhere in PAT's scoring path. The integrity reading is part of how deterministic results are presented — a response-pattern quality check, not a generative judgment of the firm or its intent.

**Can Ask Pat explain an integrity flag?** Yes — from PAT's documented content only, citing the documentation the answer draws from, and scoped to the asker's role. If documentation does not cover a question, Pat says so plainly; it never re-scores a module or speculates about intent.

## Related terms

Pillar — the five scoring constructs (Operations, Automation, Integration, Governance, Strategy) whose scores integrity readings accompany. Module — the assessment unit whose 20 questions produce the response patterns the checks examine. Band — the five-level lexicon (Early through Leading) in which scores present. Benchmark Suppression — the separate protection that governs when aggregate cuts may publish. Evidence Lineage — the broader rule that every displayed number traces to its sources; the integrity score is part of knowing what a source can bear.
