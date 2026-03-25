type Props = {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "slate" | "amber" | "emerald";
};

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  default: "border-[var(--shell-border)] bg-white/70",
  slate: "border-slate-200 bg-slate-50/80",
  amber: "border-amber-200 bg-amber-50/80",
  emerald: "border-emerald-200 bg-emerald-50/80",
};

export default function MetricCard({ label, value, detail, tone = "default" }: Props) {
  return (
    <div className={`rounded-[22px] border p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] ${toneClasses[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">{label}</div>
      <div className="mt-3 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{value}</div>
      <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{detail}</div>
    </div>
  );
}
