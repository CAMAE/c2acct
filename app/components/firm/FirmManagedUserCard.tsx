import type { FirmAdminManagedUser } from "@/lib/firmAdminAccess";

type Props = {
  user: FirmAdminManagedUser;
};

export default function FirmManagedUserCard({ user }: Props) {
  return (
    <article className="pat-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[var(--shell-ink)]">{user.name ?? "Profile name missing"}</div>
          <div className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">{user.email}</div>
        </div>
        <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--shell-accent)]">
          {user.status}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
        <div>Role: <span className="font-semibold text-[var(--shell-ink)]">{user.role}</span></div>
        <div>Title: <span className="font-semibold text-[var(--shell-ink)]">{user.title ?? "Missing"}</span></div>
        <div>Phone: <span className="font-semibold text-[var(--shell-ink)]">{user.phone ?? "Missing"}</span></div>
        <div>Department: <span className="font-semibold text-[var(--shell-ink)]">{user.department ?? "Not set"}</span></div>
        <div>Assessment progress: <span className="font-semibold text-[var(--shell-ink)]">{user.assessmentProgress}</span></div>
      </div>
    </article>
  );
}
