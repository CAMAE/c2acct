import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const total = await prisma.surveySubmission.count();

  const latest = await prisma.surveySubmission.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      Company: { select: { name: true } },
      module: { select: { key: true, version: true } },
    },
  });

  let questionCount: number | null = null;
  if (latest?.moduleId) {
    questionCount = await prisma.surveyQuestion.count({
      where: { moduleId: latest.moduleId },
    });
  }

  const score =
    typeof latest?.score === "number" && Number.isFinite(latest.score)
      ? Math.round(latest.score)
      : null;

  const weightedAvg =
    typeof latest?.weightedAvg === "number" && Number.isFinite(latest.weightedAvg)
      ? latest.weightedAvg
      : null;

  const answeredCount =
    typeof latest?.answeredCount === "number" && Number.isFinite(latest.answeredCount)
      ? latest.answeredCount
      : 0;

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-5xl font-bold text-center">Results</h1>
        <p className="text-center mt-4 opacity-70">Total submissions: {total}</p>

        <div className="mt-10">
          <h2 className="font-semibold mb-3">Latest submission</h2>

          {!latest ? (
            <div className="rounded-xl border border-black/10 bg-white p-6">
              <div className="opacity-70">No submissions yet.</div>
            </div>
          ) : (
            <div className="rounded-xl border border-black/10 bg-white p-6">
              <div className="opacity-60 text-sm">Alignment Score</div>
              <div className="text-5xl font-bold mt-1">
                {score === null ? "--" : `${score}%`}
              </div>

              <div className="opacity-60 text-sm mt-2">
                Weighted average: {weightedAvg === null ? "--" : weightedAvg.toFixed(2)}
              </div>

              <div className="opacity-60 text-sm mt-2">
                Company: {latest.company?.name ?? "--"} - Module: {latest.module?.key ?? "--"} v{latest.module?.version ?? "--"} - Answered: {answeredCount}/{questionCount ?? "--"}
              </div>
            </div>
          )}

          <div className="mt-8">
            <a className="underline" href="/survey">
              Back to Survey
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
