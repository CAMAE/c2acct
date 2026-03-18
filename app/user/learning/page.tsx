export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnLearningSnapshot, resolveLearningViewer } from "@/lib/userLearning/runtime";

export default async function UserLearningPage() {
  const resolved = await resolveLearningViewer();
  if (!resolved.ok) {
    if (resolved.status === 401) {
      redirect("/login?callbackUrl=%2Fuser%2Flearning");
    }
    return <div className="p-10 text-sm text-rose-700">{resolved.error}</div>;
  }

  const { sessionUser, visibilityContext } = resolved;
  const currentCompany = visibilityContext.currentCompany;
  if (!currentCompany) {
    return <div className="p-10 text-sm text-amber-700">No company assigned.</div>;
  }
  if (currentCompany.type !== "FIRM") {
    return <div className="p-10 text-sm text-amber-700">Learning runtime is currently available only in firm-scoped invited-user context.</div>;
  }

  const snapshot = await getOwnLearningSnapshot(sessionUser.id, currentCompany.id);

  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">Internal professional learning</div>
        <h1 className="mt-3 text-4xl font-semibold">Learning progression</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          This runtime is structured as internal professional learning with CPE-ready architecture. It does not claim approved CPE credit.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Completed modules</div>
          <div className="mt-3 text-4xl font-semibold">{snapshot.summary.completedModuleCount}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Final test</div>
          <div className="mt-3 text-xl font-semibold">
            {snapshot.summary.finalPassed ? `Passed at ${snapshot.summary.finalBestScore}%` : snapshot.summary.finalUnlocked ? "Unlocked" : "Locked"}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Firm context</div>
          <div className="mt-3 text-xl font-semibold">{currentCompany.name}</div>
        </div>
      </div>

      <div className="grid gap-4">
        {snapshot.summary.modules.map((module) => (
          <div key={module.moduleKey} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">{module.fieldOfStudy}</div>
                <div className="mt-2 text-2xl font-semibold">{module.title}</div>
                <div className="mt-3 text-sm text-white/65">
                  {module.quizPassed
                    ? `Quiz passed at ${module.bestQuizScore}%`
                    : module.readingCompleted
                      ? "Reading complete. Quiz available."
                      : module.unlocked
                        ? "Reading available."
                        : "Locked until the prior module quiz is passed."}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/user/learning/${module.moduleKey}`} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm">
                  Open reading
                </Link>
                <Link
                  href={`/user/quizzes/${module.quizKey}`}
                  className={`rounded-xl px-4 py-2 text-sm ${module.unlocked ? "bg-white text-slate-950" : "border border-white/15 bg-white/5 text-white/40"}`}
                >
                  Open quiz
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs uppercase tracking-[0.18em] text-white/45">Final assessment</div>
        <div className="mt-2 text-2xl font-semibold">Cumulative final test</div>
        <div className="mt-3 text-sm text-white/70">
          {snapshot.summary.finalUnlocked
            ? "All five quizzes are passed. The final test is now available."
            : "Pass all five module quizzes to unlock the final test."}
        </div>
        <div className="mt-4">
          <Link href="/user/final-test" className="rounded-xl bg-white px-4 py-2 text-sm text-slate-950">
            Open final test
          </Link>
        </div>
      </div>
    </section>
  );
}
