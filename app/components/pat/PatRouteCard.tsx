import Link from "next/link";

type PatRouteCardProps = {
  href: string;
  label: string;
  description: string;
};

export default function PatRouteCard({
  href,
  label,
  description,
}: PatRouteCardProps) {
  return (
    <Link
      href={href}
      className="pat-card pat-card-interactive block rounded-[24px] bg-white p-6"
    >
      <div className="text-xl font-semibold text-[var(--shell-ink)]">{label}</div>
      <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{description}</p>
    </Link>
  );
}
