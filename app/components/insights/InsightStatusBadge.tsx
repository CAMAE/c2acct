type InsightStatusBadgeProps = {
  label: string;
  tone?: "active" | "muted" | "locked";
};

export default function InsightStatusBadge({
  label,
  tone = "active",
}: InsightStatusBadgeProps) {
  const className =
    tone === "active"
      ? "bg-[var(--shell-accent)]/10 text-[var(--shell-accent)]"
      : tone === "locked"
        ? "bg-[rgba(6,54,116,0.08)] text-[var(--shell-accent)]"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${className}`}
    >
      {label}
    </span>
  );
}
