import Link from "next/link";

/**
 * Shared in-product disclaimer (Governance Phase 3, A7/B8). Mounted near every
 * score, benchmark, recommendation, and projection render across all portals:
 * "Informational, not professional advice · methodology" (V3 box 4.2: the word
 * "directional" left every customer surface on 2026-09-09).
 *
 * The audit rule: the "informational purposes, not professional advice" line
 * must appear IN-PRODUCT near outputs, not only in the ToS. Keep the copy stable
 * — tests/output-disclaimer.contract.test.ts locks the phrasing and the link.
 */

export const OUTPUT_DISCLAIMER_TEXT =
  "Informational, not professional advice.";

type OutputDisclaimerProps = {
  /** Compact inline caption (default) or a bordered note block. */
  variant?: "inline" | "note";
  /** Optional extra classes for placement. */
  className?: string;
};

export default function OutputDisclaimer({ variant = "inline", className = "" }: OutputDisclaimerProps) {
  const base =
    variant === "note"
      ? "rounded-[14px] border border-[var(--shell-border)] bg-white/60 px-4 py-2.5 text-xs leading-5 text-[var(--shell-muted)]"
      : "text-xs leading-5 text-[var(--shell-muted)]";

  return (
    <p
      className={`${base} ${className}`.trim()}
      data-testid="output-disclaimer"
      role="note"
    >
      {OUTPUT_DISCLAIMER_TEXT}{" "}
      <Link
        href="/methodology"
        className="font-medium text-[var(--shell-ink)] underline decoration-dotted underline-offset-2 hover:text-[var(--shell-accent)]"
      >
        methodology
      </Link>
    </p>
  );
}
