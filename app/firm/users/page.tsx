export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { isTenantAdmin } from "@/lib/authz";
import { getCompanyLearningRoster, resolveLearningViewer } from "@/lib/userLearning/runtime";

export default async function FirmUsersPage() {
  const resolved = await resolveLearningViewer();
  if (!resolved.ok) {
    if (resolved.status === 401) {
      redirect("/login?callbackUrl=%2Ffirm%2Fusers");
    }
    return <div className="p-10 text-sm text-rose-700">{resolved.error}</div>;
  }

  const { sessionUser, visibilityContext } = resolved;
  const currentCompany = visibilityContext.currentCompany;
  if (!currentCompany) {
    return <div className="p-10 text-sm text-amber-700">No company assigned.</div>;
  }
  if (currentCompany.type !== "FIRM" || !isTenantAdmin(sessionUser)) {
    return <div className="p-10 text-sm text-amber-700">Firm user oversight is available only to firm admins and owners.</div>;
  }

  const roster = await getCompanyLearningRoster(currentCompany.id);

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Firm user oversight</div>
          <h1 className="mt-3 text-4xl font-semibold">Invited-user learning roster</h1>
        </div>
        <Link href="/firm/users/grading" className="rounded-xl bg-white px-4 py-2 text-sm text-slate-950">
          Open grading view
        </Link>
      </div>

      <div className="grid gap-4">
        {roster.map((entry) => (
          <div key={entry.user.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold">{entry.user.name ?? entry.user.email}</div>
                <div className="mt-2 text-sm text-white/60">{entry.user.email}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
                  Membership {entry.membershipRole} | Updated {entry.updatedAt}
                </div>
              </div>
              <div className="grid gap-1 text-sm text-white/70">
                <div>Completed modules: {entry.summary.completedModuleCount}/5</div>
                <div>Final: {entry.summary.finalPassed ? `Passed at ${entry.summary.finalBestScore}%` : entry.summary.finalUnlocked ? "Unlocked" : "Locked"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
