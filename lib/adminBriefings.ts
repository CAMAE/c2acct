export function buildOperatorBriefings(input: {
  canonicalModules: Array<{
    key: string;
    title: string;
    active: boolean;
    _count: {
      SurveyQuestion: number;
      SurveySection: number;
      SurveySubmission: number;
    };
  }>;
  recentAuditCount: number;
  latestSubmitStatus: string | null;
}) {
  return [
    {
      key: "canonical-modules",
      title: "Canonical PAT runtime",
      summary: input.canonicalModules.every(
        (module) => module._count.SurveyQuestion > 0 && module._count.SurveySection > 0
      )
        ? "Canonical firm modules are section-backed and ready for operator review."
        : "One or more canonical firm modules are missing section or question coverage.",
    },
    {
      key: "submit-pipeline",
      title: "Submit pipeline",
      summary: input.latestSubmitStatus
        ? `Latest PAT submit diagnostic status: ${input.latestSubmitStatus}.`
        : "No PAT submit diagnostics have been emitted in this process yet.",
    },
    {
      key: "operator-audit",
      title: "Operator audit feed",
      summary:
        input.recentAuditCount > 0
          ? `${input.recentAuditCount} recent operator audit event(s) are available for review.`
          : "No operator audit events have been recorded yet.",
    },
  ];
}
