import Link from "next/link";
import type { MembershipPlan, MembershipStatus } from "@prisma/client";

type MembershipCardProps = {
  href: string;
  plan: MembershipPlan;
  status: MembershipStatus;
  audienceLabel: string;
};

function formatMembershipValue(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default function MembershipCard({
  href,
  plan,
  status,
  audienceLabel,
}: MembershipCardProps) {
  return (
    <Link
      className="pat-soft-panel block p-4 text-sm leading-6 text-[var(--shell-muted)] transition hover:-translate-y-0.5 hover:border-[var(--shell-accent)] hover:text-[var(--shell-ink)]"
      href={href}
    >
      <div className="pat-label">Membership</div>
      <div className="mt-2 text-lg font-semibold text-[var(--shell-ink)]">{formatMembershipValue(plan)}</div>
      <div className="mt-1">
        {formatMembershipValue(status)} for {audienceLabel}
      </div>
    </Link>
  );
}
