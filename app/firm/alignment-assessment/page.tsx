import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getFirmAssessmentProgress } from "@/lib/firmPat";

export const dynamic = "force-dynamic";

export default async function FirmAlignmentAssessmentPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }

  const modules = await getFirmAssessmentProgress(sessionUser.companyId);

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Firm alignment assessment</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Five modules, one live firm alignment system
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This is the modular PAT firm alignment assessment. Each module carries 20 questions on a 0 to 5 current-state scale, progress is tracked independently, and submissions flow directly into the existing results and insight unlock system.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <Link
            key={module.key}
            href={module.href}
            className="pat-card pat-card-interactive block rounded-[24px] bg-white p-6"
          >
            <div className="text-xl font-semibold text-[var(--shell-ink)]">{module.title}</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{module.description}</p>
            <div className="mt-5 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
              <div>Questions: <span className="font-semibold text-[var(--shell-ink)]">{module.questionCount}</span></div>
              <div>Progress: <span className="font-semibold text-[var(--shell-ink)]">{module.completedCount}/{module.questionCount}</span></div>
              <div>Latest score: <span className="font-semibold text-[var(--shell-ink)]">{module.latestScore ?? "--"}</span></div>
            </div>
          </Link>
        ))}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Unlock path</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          Pro membership firm insights unlock through the live badge and capability-rule system. Completing all five modules proves assessment coverage; the related capability thresholds determine whether each Pro insight is ready to surface.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/firm/insights">
            Open firm insights
          </Link>
          <Link className="pat-button-secondary" href="/firm">
            Return to firm workspace
          </Link>
        </div>
      </section>
    </div>
  );
}
