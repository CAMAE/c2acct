export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getLearningModule } from "@/lib/userLearning/content";
import { getOwnLearningSnapshot, resolveLearningViewer } from "@/lib/userLearning/runtime";
import { ReadingCompletionButton } from "@/lib/userLearning/runtime-client";

export default async function UserLearningModulePage({ params }: { params: Promise<{ moduleKey: string }> }) {
  const resolved = await resolveLearningViewer();
  if (!resolved.ok) {
    if (resolved.status === 401) {
      redirect("/login");
    }
    return <div className="p-10 text-sm text-rose-700">{resolved.error}</div>;
  }

  const { moduleKey } = await params;
  const learningModule = getLearningModule(moduleKey);
  if (!learningModule) {
    notFound();
  }

  const { sessionUser, visibilityContext } = resolved;
  const currentCompany = visibilityContext.currentCompany;
  if (!currentCompany) {
    return <div className="p-10 text-sm text-amber-700">No company assigned.</div>;
  }
  const snapshot = await getOwnLearningSnapshot(sessionUser.id, currentCompany.id);
  const progress = snapshot.summary.modules.find((entry) => entry.moduleKey === moduleKey);
  if (!progress?.unlocked) {
    return <div className="p-10 text-sm text-amber-700">This module is locked until the prior quiz is passed.</div>;
  }

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs uppercase tracking-[0.18em] text-white/45">{learningModule.fieldOfStudy}</div>
        <h1 className="mt-3 text-4xl font-semibold">{learningModule.title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">{learningModule.position}</p>
        <p className="mt-3 max-w-3xl text-sm text-white/70">{learningModule.purpose}</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold">Learning objectives</h2>
        <div className="mt-4 grid gap-2 text-sm text-white/75">
          {learningModule.objectives.map((objective) => (
            <div key={objective}>- {objective}</div>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {learningModule.topics.map((topic) => (
          <div key={topic.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">{topic.sourceCode}</div>
            <h2 className="mt-2 text-2xl font-semibold">{topic.title}</h2>
            <div className="mt-4 grid gap-2 text-sm text-white/75">
              <div><strong className="text-white">Principle:</strong> {topic.principle}</div>
              <div><strong className="text-white">Operational implication:</strong> {topic.operationalImplication}</div>
              <div><strong className="text-white">Required evidence artifact:</strong> {topic.evidenceArtifact}</div>
              <div><strong className="text-white">Primary failure risk:</strong> {topic.failureRisk}</div>
              <div><strong className="text-white">Why it matters:</strong> {topic.whyItMatters}</div>
              <div><strong className="text-white">Source:</strong> {topic.sourceTitle}</div>
              <a href={topic.sourceUrl} className="underline underline-offset-4">
                {topic.sourceUrl}
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/70">
          {progress.readingCompleted ? "Reading already completed. You can retake the quiz if needed." : "When you finish the reading, record completion to unlock the quiz formally."}
        </div>
        <div className="mt-4">
          <ReadingCompletionButton moduleKey={learningModule.moduleKey} quizKey={learningModule.quizKey} disabled={progress.readingCompleted} />
        </div>
      </div>
    </section>
  );
}
