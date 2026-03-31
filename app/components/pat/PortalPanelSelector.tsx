import Link from "next/link";

export type PortalPanelOption = {
  key: string;
  label: string;
  href: string;
};

type PortalPanelSelectorProps = {
  activeKey: string;
  options: readonly PortalPanelOption[];
};

export default function PortalPanelSelector({
  activeKey,
  options,
}: PortalPanelSelectorProps) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-1.5">
      {options.map((option) => {
        const active = option.key === activeKey;

        return (
          <Link
            key={option.key}
            href={option.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
              active
                ? "bg-white text-[var(--shell-ink)] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                : "text-[var(--shell-muted)] hover:bg-white/70 hover:text-[var(--shell-ink)]"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
