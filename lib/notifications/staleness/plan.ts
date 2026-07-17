import { readFreshness, type FreshnessState } from "@/lib/freshness";
import {
  decideStalenessSend,
  type StalenessLedgerEntry,
} from "@/lib/notifications/staleness/ledger";

/**
 * 16b — the staleness planner. PURE: gathered DB facts in, notification drafts
 * out, no I/O. Generator (1): a firm's own alignment assessment crossing into
 * Aging or Stale. The send-ledger decides idempotency + the nag hard-stop; this
 * module owns the copy.
 *
 * Governance rails: no guilt. Every line states the benchmark CONSEQUENCE of age
 * and leaves the decision to the reader. Pat drafts the copy, so every draft is
 * aiGenerated (the inbox renders the disclosure line — E3 goes active).
 */
export type StalenessAudience = "firm" | "vendor";

/**
 * State-specific notification kind, so an Aging→Stale crossing creates a NEW
 * inbox row (different kind) while a same-state re-run collides on the store's
 * (recipient, source, kind) unique index — a second idempotency guard beneath
 * the send-ledger. The ledger key, by contrast, stays state-independent (it
 * tracks the item's transitions).
 */
export function stalenessKind(audience: StalenessAudience, state: "aging" | "stale"): string {
  return `AUTO_${audience.toUpperCase()}_STALENESS_${state.toUpperCase()}`;
}

/** All staleness kinds (for inbox filtering / contract tests). */
export const STALENESS_KINDS: readonly string[] = [
  stalenessKind("firm", "aging"),
  stalenessKind("firm", "stale"),
  stalenessKind("vendor", "aging"),
  stalenessKind("vendor", "stale"),
];

export type StalenessTarget = {
  recipientUserId: string;
  companyId: string;
  companyName: string;
  audience: StalenessAudience;
  /** Epoch-ms of the newest module submission, or null when never assessed. */
  newestSubmissionMs: number | null;
  /** Did the recipient read the prior staleness nudge for this item? */
  acknowledgedSinceLast: boolean;
  /** The recipient's current ledger entry for this item, or null. */
  ledger: StalenessLedgerEntry | null;
};

export type StalenessDraft = {
  recipientUserId: string;
  audience: StalenessAudience;
  kind: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  sourceType: "Company";
  sourceId: string;
  aiGenerated: true;
  /** The ledger entry to persist iff the notification is created. */
  nextEntry: StalenessLedgerEntry;
};

export type StalenessPlan = {
  evaluated: number;
  fired: number;
  /** decisions that were suppressed by the ledger (unchanged / hard-stop / fresh). */
  suppressed: number;
  drafts: StalenessDraft[];
};

const CTA = {
  firm: { label: "Refresh your assessment", href: "/firm/alignment-assessment" },
  vendor: { label: "Refresh your assessment", href: "/vendor/product-assessment" },
} as const;

function draftCopy(audience: StalenessAudience, state: FreshnessState, ageLabel: string, asOfLabel: string) {
  // No guilt — state the benchmark consequence, let them decide.
  if (state === "stale") {
    return {
      title: "Your assessment is over a year old",
      body:
        audience === "firm"
          ? `Your alignment assessment last updated ${asOfLabel} (${ageLabel}). Peer benchmarks refresh continuously, so an assessment this age no longer reflects where you stand today. A refresh brings your position back to current.`
          : `Your product assessment last updated ${asOfLabel} (${ageLabel}). Firm reviews and category benchmarks move on, so an assessment this age no longer reflects your current standing. A refresh brings it back to current.`,
    };
  }
  // aging
  return {
    title: "Your assessment is starting to age",
    body:
      audience === "firm"
        ? `Your alignment assessment last updated ${asOfLabel} (${ageLabel}). It still counts, but it is now outside the freshest window peers are measured in. Refreshing keeps your benchmark position comparable.`
        : `Your product assessment last updated ${asOfLabel} (${ageLabel}). It still counts, but it is now outside the freshest window. Refreshing keeps your standing comparable as firms review.`,
  };
}

export function planStaleness(targets: StalenessTarget[], nowMs: number): StalenessPlan {
  const now = new Date(nowMs);
  const drafts: StalenessDraft[] = [];
  let evaluated = 0;
  let suppressed = 0;

  for (const target of targets) {
    evaluated += 1;
    // Never assessed → no evidence to age. Absence is not staleness.
    if (target.newestSubmissionMs == null) {
      suppressed += 1;
      continue;
    }
    const reading = readFreshness(new Date(target.newestSubmissionMs), now);
    if (!reading) {
      suppressed += 1;
      continue;
    }
    const decision = decideStalenessSend({
      currentState: reading.state,
      entry: target.ledger,
      acknowledgedSinceLast: target.acknowledgedSinceLast,
      nowIso: now.toISOString(),
    });
    if (!decision.send) {
      suppressed += 1;
      continue;
    }
    const copy = draftCopy(target.audience, decision.state, reading.ageLabel, reading.asOfLabel);
    drafts.push({
      recipientUserId: target.recipientUserId,
      audience: target.audience,
      kind: stalenessKind(target.audience, decision.state),
      title: copy.title,
      body: copy.body,
      ctaLabel: CTA[target.audience].label,
      ctaHref: CTA[target.audience].href,
      sourceType: "Company",
      sourceId: target.companyId,
      aiGenerated: true,
      nextEntry: decision.nextEntry,
    });
  }

  return { evaluated, fired: drafts.length, suppressed, drafts };
}
