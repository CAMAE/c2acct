import type { StalenessLedgerEntry } from "@/lib/notifications/staleness/ledger";
import type { StalenessAudience, StalenessDraft } from "@/lib/notifications/staleness/plan";

/**
 * 16b — the weekly-digest collapser (batching law: at most one digest per user
 * per week + change-triggered singles). Because the sweep runs weekly, a user's
 * fired drafts within a run ARE their week: one draft dispatches as a single,
 * two or more collapse into ONE week-stamped digest. Pure — the orchestrator
 * turns each DispatchItem into a createNotification call and advances every
 * collapsed item's ledger only after the row is written.
 */
export type DispatchItem = {
  recipientUserId: string;
  audience: StalenessAudience;
  kind: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  sourceType: string;
  sourceId: string;
  aiGenerated: true;
  /** Every ledger entry to persist once this item is created. */
  ledgerWrites: Array<{ key: string; entry: StalenessLedgerEntry }>;
};

/** ISO week key, e.g. "2026-W29" — makes each week's digest a distinct inbox row. */
export function isoWeekKey(nowMs: number): string {
  const d = new Date(nowMs);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function collapseToDigest(drafts: StalenessDraft[], nowMs: number): DispatchItem[] {
  const weekKey = isoWeekKey(nowMs);
  const byRecipient = new Map<string, StalenessDraft[]>();
  for (const draft of drafts) {
    const group = byRecipient.get(draft.recipientUserId);
    if (group) group.push(draft);
    else byRecipient.set(draft.recipientUserId, [draft]);
  }

  const items: DispatchItem[] = [];
  for (const group of byRecipient.values()) {
    if (group.length === 1) {
      const d = group[0];
      items.push({
        recipientUserId: d.recipientUserId,
        audience: d.audience,
        kind: d.kind,
        title: d.title,
        body: d.body,
        ctaLabel: d.ctaLabel,
        ctaHref: d.ctaHref,
        sourceType: d.sourceType,
        sourceId: d.sourceId,
        aiGenerated: true,
        ledgerWrites: [{ key: d.ledgerItemKey, entry: d.nextEntry }],
      });
      continue;
    }
    // Two or more → one week digest. Lead line per item, no guilt.
    const lead = group.map((d) => `• ${d.title}`).join("\n");
    items.push({
      recipientUserId: group[0].recipientUserId,
      audience: group[0].audience,
      kind: `AUTO_${group[0].audience.toUpperCase()}_DIGEST_${weekKey}`,
      title: `${group.length} updates on your PAT standing`,
      body: `A few things moved this week:\n${lead}\n\nOpen your workspace when it suits you — nothing here is urgent.`,
      ctaLabel: "Open your workspace",
      ctaHref: group[0].audience === "firm" ? "/firm" : "/vendor",
      sourceType: "Digest",
      sourceId: weekKey,
      aiGenerated: true,
      ledgerWrites: group.map((d) => ({ key: d.ledgerItemKey, entry: d.nextEntry })),
    });
  }
  return items;
}
