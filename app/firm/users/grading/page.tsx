export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isTenantAdmin } from "@/lib/authz";
import { getCompanyLearningRoster, resolveLearningViewer } from "@/lib/userLearning/runtime";

export default async function FirmUsersGradingPage() {
  const resolved = await resolveLearningViewer();
  if (!resolved.ok) {
    if (resolved.status === 401) {
      redirect("/login?callbackUrl=%2Ffirm%2Fusers%2Fgrading");
    }
    return <div className="p-10 text-sm text-rose-700">{resolved.error}</div>;
  }

  const { sessionUser, visibilityContext } = resolved;
  const currentCompany = visibilityContext.currentCompany;
  if (!currentCompany) {
    return <div className="p-10 text-sm text-amber-700">No company assigned.</div>;
  }
  if (currentCompany.type !== "FIRM" || !isTenantAdmin(sessionUser)) {
    return <div className="p-10 text-sm text-amber-700">Firm grading oversight is available only to firm admins and owners.</div>;
  }

  const roster = await getCompanyLearningRoster(currentCompany.id);

  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-white/45">Firm grading</div>
        <h1 className="mt-3 text-4xl font-semibold">Learning grading summary</h1>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
        <table className="min-w-full text-left text-sm text-white/75">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-white/45">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Modules passed</th>
              <th className="px-4 py-3">Quiz detail</th>
              <th className="px-4 py-3">Final</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((entry) => (
              <tr key={entry.user.id} className="border-b border-white/5 align-top">
                <td className="px-4 py-4">
                  <div className="font-semibold">{entry.user.name ?? entry.user.email}</div>
                  <div className="mt-1 text-xs text-white/45">{entry.user.email}</div>
                </td>
                <td className="px-4 py-4">{entry.summary.completedModuleCount}/5</td>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    {entry.summary.modules.map((module) => (
                      <div key={module.moduleKey}>
                        {module.title}: {module.quizPassed ? `${module.bestQuizScore}%` : module.readingCompleted ? "Reading complete / quiz pending" : module.unlocked ? "Open" : "Locked"}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {entry.summary.finalPassed ? `Passed at ${entry.summary.finalBestScore}%` : entry.summary.finalUnlocked ? "Unlocked / pending" : "Locked"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
