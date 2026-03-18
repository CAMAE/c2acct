export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getQuizByKey } from "@/lib/userLearning/content";
import { getOwnLearningSnapshot, resolveLearningViewer } from "@/lib/userLearning/runtime";
import { LearningAssessmentClient } from "@/lib/userLearning/runtime-client";

export default async function UserQuizPage({ params }: { params: Promise<{ quizKey: string }> }) {
  const resolved = await resolveLearningViewer();
  if (!resolved.ok) {
    if (resolved.status === 401) {
      redirect("/login");
    }
    return <div className="p-10 text-sm text-rose-700">{resolved.error}</div>;
  }

  const { quizKey } = await params;
  const quiz = getQuizByKey(quizKey);
  if (!quiz) {
    notFound();
  }

  const { sessionUser, visibilityContext } = resolved;
  const currentCompany = visibilityContext.currentCompany;
  if (!currentCompany) {
    return <div className="p-10 text-sm text-amber-700">No company assigned.</div>;
  }
  const snapshot = await getOwnLearningSnapshot(sessionUser.id, currentCompany.id);
  const progress = snapshot.summary.modules.find((entry) => entry.quizKey === quizKey);

  if (!progress?.unlocked) {
    return <div className="p-10 text-sm text-amber-700">This quiz is locked until the prior module quiz is passed.</div>;
  }

  if (!progress.readingCompleted) {
    return <div className="p-10 text-sm text-amber-700">Complete the reading module before taking this quiz.</div>;
  }

  return (
    <LearningAssessmentClient
      assessment={quiz}
      assessmentKind="QUIZ"
      submitKey={quizKey}
      summary={snapshot.summary}
      intro="This module quiz is source-backed and graded against the repo’s current internal professional-learning corpus."
    />
  );
}
