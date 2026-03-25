type OutputItem = {
  title: string;
  desc: string;
  unlocked: boolean;
  unlockRequirement: string;
  content?: string | null;
};

type Props = {
  items: OutputItem[];
};

export default function OutputCatalog({ items }: Props) {
  const available = items.filter((item) => item.unlocked);
  const pending = items.filter((item) => !item.unlocked);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
      <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/70 p-5">
        <div className="text-sm font-semibold text-[var(--shell-ink)]">Available now</div>
        <div className="mt-4 grid gap-4">
          {available.length === 0 ? (
            <div className="text-sm text-[var(--shell-muted)]">No outputs are unlocked yet for this subject.</div>
          ) : (
            available.map((item) => (
              <article key={item.title} className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                      {item.content ?? item.desc}
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Unlocked
                  </div>
                </div>
                <div className="mt-3 text-xs text-[var(--shell-muted)]">{item.unlockRequirement}</div>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/70 p-5">
        <div className="text-sm font-semibold text-[var(--shell-ink)]">Queued behind current unlock state</div>
        <div className="mt-4 grid gap-4">
          {pending.length === 0 ? (
            <div className="text-sm text-[var(--shell-muted)]">All current Tier 1 outputs are available.</div>
          ) : (
            pending.map((item) => (
              <article key={item.title} className="rounded-[18px] border border-[var(--shell-border)] bg-white/55 p-4 opacity-85">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-[var(--shell-ink)]">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{item.desc}</div>
                  </div>
                  <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                    Pending
                  </div>
                </div>
                <div className="mt-3 text-xs text-[var(--shell-muted)]">{item.unlockRequirement}</div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
