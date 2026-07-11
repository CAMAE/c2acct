import Link from "next/link";
import type { MembershipStatus } from "@prisma/client";
import type { ResolvedMembershipPlan } from "@/lib/membership";

type MembershipCardProps = {
  href: string;
  plan: ResolvedMembershipPlan;
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
      className="pat-soft-panel pat-soft-panel-interactive block p-4 text-sm leading-6 text-[var(--shell-muted)]"
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
