import type { ReactNode } from "react";

/**
 * The shared card chip used across portal summary cards (category, feature scope,
 * status, etc.). One rounded-full pill with tone variants, matching the Elite hub
 * / product-intelligence catalog card language. Use instead of the old
 * `label: value` colon-separated text rows.
 */
export type CardChipTone = "neutral" | "positive" | "amber" | "muted";

const TONE_CLASS: Record<CardChipTone, string> = {
  neutral: "border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] text-[var(--shell-ink)]",
  positive: "border border-transparent bg-[rgba(58,171,102,0.16)] text-[var(--shell-positive)]",
  amber: "border border-transparent bg-[rgba(229,109,4,0.14)] text-[var(--brand-orange)]",
  muted: "border border-dashed border-[var(--shell-border)] text-[var(--shell-muted)]",
};

export default function CardChip({
  tone = "neutral",
  children,
}: {
  tone?: CardChipTone;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

export function CardChipRow({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex flex-wrap gap-2">{children}</div>;
}
