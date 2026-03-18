export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getFinalTest } from "@/lib/userLearning/content";
import { getOwnLearningSnapshot, resolveLearningViewer } from "@/lib/userLearning/runtime";
import { LearningAssessmentClient } from "@/lib/userLearning/runtime-client";

export default async function UserFinalTestPage() {
  const resolved = await resolveLearningViewer();
  if (!resolved.ok) {
    if (resolved.status === 401) {
      redirect("/login");
    }
    return <div className="p-10 text-sm text-rose-700">{resolved.error}</div>;
  }

  const { sessionUser, visibilityContext } = resolved;
  const currentCompany = visibilityContext.currentCompany;
  if (!currentCompany) {
    return <div className="p-10 text-sm text-amber-700">No company assigned.</div>;
  }
  const snapshot = await getOwnLearningSnapshot(sessionUser.id, currentCompany.id);
  if (!snapshot.summary.finalUnlocked) {
    return <div className="p-10 text-sm text-amber-700">Pass all five module quizzes before taking the final test.</div>;
  }

  return (
    <LearningAssessmentClient
      assessment={getFinalTest()}
      assessmentKind="FINAL"
      submitKey="final-test"
      summary={snapshot.summary}
      intro="The cumulative final confirms governance, state-configuration, assurance-of-learning, control, and automation understanding across the full package."
    />
  );
}
