# Vendor product follow-up questions as multiple choice: option sets v1

Date: 2026-09-30. Author: Mythos, for Cam's ruling. Status: DRAFT until Cam signs; Leslie's edits welcome (she wrote the firm sets on 9/4; these follow her format exactly: six choices, "Not a significant issue here", "Other, short answer").

Scope: the ten open-ended questions in product_open_ended_v1 (lib/productUtilityRegistry.ts, key list below). These are answered by the vendor about its own product. The stem PAT shows is adaptive today (it names the strongest or weakest section, the pressure point, or the declared target customer from the scored answers and the profile). That stays. Only the answer changes: an option row instead of a text box. Every pick is stored per item, aggregated per product and per ecosystem for the Guide and Enterprise pages, and never touches a score.

Where the options come from: the product utility registry (18 families, four basis patterns: workflow fit, operational dependence, reporting visibility, adoption ease, value clarity, integration readiness, configuration depth, implementation friction, support trust, training and onboarding), the accounting vendor and firm research behind the registry, and the lead engine research base of 9/17 (vendor GTM, firm buying behavior, implementation failure patterns). Option labels use the same vocabulary as the scored questions so a Guide reads picks and scores in one language. No vendor names anywhere.

Rules carried from the firm sets: label first, consequence clause muted; "Not a significant issue here" is exclusive in both modes; "Other" requires a short answer of at most 280 characters and may combine with picks in MULTI; option keys are stable slugs prod.q<n>.<a-f>, prod.q<n>.none, prod.q<n>.other; picks with kind none or other never count in aggregates.

Selection mode: SINGLE for questions 1, 2, 3, 4, 5, 6, 10 (each stem asks for the one most material item). MULTI for 7, 8, 9 (fit and evidence are lists by nature).

## Q1 strongest_workflow (SINGLE)
Stem as built (adaptive): PAT names the strongest section and asks what evidence supports that read.
- a. Daily use by the people who own the work. Consequence: adoption is proven by routine use, not by a rollout date.
- b. Fewer exceptions and reworks in that workflow. Consequence: the process runs without side spreadsheets or manual fixes.
- c. Status and reporting are visible without asking. Consequence: managers and partners see readiness without chasing staff.
- d. Firms renew and expand in that workflow. Consequence: retention and seat growth are the evidence, not claims.
- e. Measured time or cost saved in that workflow. Consequence: a number a firm can check, with a before and after.
- f. Reference firms will speak to it. Consequence: buyers can verify the read with a peer, which shortens decisions.
- g. Not a significant issue here.
- h. Other (short answer).

## Q2 weakest_workflow (SINGLE)
Stem as built (adaptive): PAT names the weakest section and asks what gap or limit drives it.
- a. Edge cases still handled outside the product. Consequence: exceptions leak into email, spreadsheets, or manual entry.
- b. Setup depends on the vendor or a consultant. Consequence: firms cannot configure it themselves, so changes wait.
- c. Reporting does not answer the questions firms ask. Consequence: staff export and rebuild reports elsewhere.
- d. Frontline staff avoid it or work around it. Consequence: usage is thin below the sponsor who bought it.
- e. Slow or inconsistent performance under load. Consequence: peak season exposes the limit when it matters most.
- f. Thin evidence, few firms have used it long enough. Consequence: the read is early, not necessarily wrong.
- g. Not a significant issue here.
- h. Other (short answer).

## Q3 implementation_risk (SINGLE)
Stem as built (adaptive): PAT names the implementation pressure point and asks for the most material rollout risk.
- a. Data migration from the prior system. Consequence: history, mappings, and balances arrive late or wrong.
- b. Configuration takes specialist time. Consequence: go-live slips because setup depends on scarce people.
- c. Integration setup with the firm's core stack. Consequence: the product runs, but the flow around it does not.
- d. Firm-side ownership is unclear. Consequence: nobody at the firm owns decisions, so the rollout stalls.
- e. Timing against busy season. Consequence: a rollout that crosses tax or audit season loses momentum.
- f. Training and onboarding load. Consequence: staff are live before they are ready and revert to old habits.
- g. Not a significant issue here.
- h. Other (short answer).

## Q4 change_management_risk (SINGLE)
Stem as built (adaptive): PAT names the adoption pressure point and the declared buyer, and asks which change-management risk slows adoption most.
- a. Partner or owner buy-in is uneven. Consequence: the product is optional in practice, so use stays partial.
- b. Staff prefer the old workflow. Consequence: two ways of working run side by side and the new one loses.
- c. The buyer and the user are different people. Consequence: what was sold is not what the desk needs, so use fades.
- d. Client-facing change. Consequence: clients must do something new, which the firm hesitates to ask.
- e. No internal champion after go-live. Consequence: questions have nowhere to go and use decays quietly.
- f. Change lands during peak season. Consequence: nobody has time to learn, so adoption waits a year.
- g. Not a significant issue here.
- h. Other (short answer).

## Q5 integration_gap (SINGLE)
Stem as built (adaptive): PAT names the integration pressure point and the declared integration posture, and asks which gap matters most.
- a. No integration with the firm's general ledger or practice system. Consequence: double entry and reconciliation stay manual.
- b. One-way sync only. Consequence: changes made downstream never come back, so records drift.
- c. No open API or export path. Consequence: the firm cannot get its own data out or connect anything new.
- d. Document and e-signature flow is separate. Consequence: files live in two places and staff re-attach.
- e. Identity and access are not integrated. Consequence: separate logins and permissions, which admins avoid managing.
- f. Integration exists but breaks or lags. Consequence: staff stop trusting the sync and re-key to be safe.
- g. Not a significant issue here.
- h. Other (short answer).

## Q6 control_concern (SINGLE)
Stem as built (adaptive): PAT names the control pressure point and asks which control, approval, auditability, or governance concern needs follow-up.
- a. Approval steps can be skipped or overridden. Consequence: sign-off is a suggestion, not a control.
- b. Audit trail is incomplete or hard to read. Consequence: who changed what, and when, is not answerable.
- c. Role and permission model is too coarse. Consequence: staff see or edit more than their role should.
- d. Client data handling is not documented. Consequence: firms cannot answer their own security questionnaire about it.
- e. No independent security attestation. Consequence: the firm's governance review has nothing to rely on.
- f. Retention and deletion are not controllable. Consequence: records outlive policy or vanish before it.
- g. Not a significant issue here.
- h. Other (short answer).

## Q7 best_fit_customer (MULTI)
Stem as built (adaptive): PAT names the strongest feature read and the declared target customer, and asks which firm size and type fit best today.
- a. Solo and small firms, 1 to 5 people. Consequence: simple setup and low admin matter more than depth.
- b. Small firms, 6 to 20 people. Consequence: one owner decides and staff adopt quickly if it saves time.
- c. Mid-size firms, 21 to 100 people. Consequence: multiple partners, defined roles, and an admin who configures.
- d. Large regional firms, 101 to 500 people. Consequence: integration and permissions decide fit, not features.
- e. National and Top 100 firms, over 500 people. Consequence: procurement, security review, and rollout at scale.
- f. Client accounting and advisory practices of any size. Consequence: recurring monthly work, high transaction volume.
- g. Not a significant issue here.
- h. Other (short answer).

## Q8 poor_fit_customer (MULTI)
Stem as built (adaptive): PAT names the weakest feature read and the declared operating-model fit, and asks who is the poorest fit today and why.
- a. Solo and small firms, 1 to 5 people. Consequence: setup and cost outweigh the benefit at that size.
- b. Small firms, 6 to 20 people. Consequence: needs an admin the firm does not have.
- c. Mid-size firms, 21 to 100 people. Consequence: multi-partner workflow and role needs exceed the product.
- d. Large regional firms, 101 to 500 people. Consequence: integration and permission gaps block rollout.
- e. National and Top 100 firms, over 500 people. Consequence: security, procurement, and scale requirements not met.
- f. Firms outside the declared service mix (for example audit-led when built for tax). Consequence: the workflow does not match.
- g. Not a significant issue here.
- h. Other (short answer).

## Q9 evidence_needed_next (MULTI)
Stem as built (adaptive): PAT names partial coverage or the weakest section and asks what evidence would most improve confidence.
- a. Firm reviews from the target segment. Consequence: the firm-reviewed column next to the self-report.
- b. Implementation outcomes with dates. Consequence: planned versus actual go-live, and what slipped.
- c. Integration proof with the common stacks. Consequence: named systems, direction of sync, and failure handling.
- d. Independent security or control attestation. Consequence: something a firm's governance review can rely on.
- e. Usage and adoption data below the sponsor. Consequence: who actually uses it, how often, and where use stops.
- f. Measured time or cost outcomes. Consequence: a before and after a firm can check.
- g. Not a significant issue here.
- h. Other (short answer).

## Q10 recommended_next_action (SINGLE)
Stem as built (adaptive): PAT states its suggested next action from the strongest and weakest sections and asks for the single most sensible next step.
- a. Gather evidence. Consequence: invite firms to review before changing anything.
- b. Narrow scope. Consequence: lead with the strongest workflow and stop claiming the rest for now.
- c. Reposition. Consequence: change the declared target customer or operating-model fit to match the evidence.
- d. Fix implementation. Consequence: shorten setup and migration before the next cohort.
- e. Close the integration gap. Consequence: build or repair the sync that firms name first.
- f. Continue. Consequence: the evidence supports the current position; keep collecting reviews.
- g. Not a significant issue here.
- h. Other (short answer).

## What Cam decides
1. Sign or edit the ten sets. Leslie may edit any label.
2. Mode rulings above (SINGLE for 1 to 6 and 10; MULTI for 7 to 9). Change any.
3. Q7 and Q8 use the same size bands on purpose so fit and poor fit aggregate on one axis; the "Other" rate on those two tells us if the bands are wrong.

NOT-CLOSED.
