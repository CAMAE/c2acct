import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePortalExperience } from "@/lib/portalVisibility";
import { getCanonicalPatHref, type PatNavigationAudience } from "@/lib/patNavigation";

export const metadata = {
  title: "Assessment Help | C2Acct",
  description: "How to take PAT assessments cleanly and confidently.",
};

const assessmentGuidance = [
  {
    title: "Move one section at a time",
    body: "PAT breaks modules into section-aware chapters. Where section metadata is available, PAT paces the flow in focused 5-question sections so each chapter is easier to review carefully before moving on.",
  },
  {
    title: "Answer in context",
    body: "Use the current company, product, or user context shown on the surrounding PAT surface. The quality of the insight depends on the quality of the signal you enter.",
  },
  {
    title: "Submit once at the end",
    body: "PAT keeps your in-progress answers across the section flow, then submits through the existing protected results and insight pipeline at the final section.",
  },
] as const;

export const dynamic = "force-dynamic";

export default async function SurveyHelpPage() {
  const sessionUser = await getSessionUser();
  const experience = await resolvePortalExperience(sessionUser);
  const audience: PatNavigationAudience =
    experience.audience === "firm" || experience.audience === "vendor"
      ? experience.audience
      : "individual";
  const assessmentHref = getCanonicalPatHref(audience, "assessment");
  const resultsHref = getCanonicalPatHref(audience, "results");

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Assessment help</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          How to take PAT assessments
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          PAT assessments are designed to stay calm, structured, and decision-useful. Use this guide when you need a quick explanation of the section flow and what happens after submission.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {assessmentGuidance.map((item) => (
          <article key={item.title} className="pat-card p-6">
            <h2 className="text-xl font-semibold text-[var(--shell-ink)]">{item.title}</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Next step</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          Return to assessment readiness to continue into the current module, or move back into PAT results and insights after submission.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-primary" href={assessmentHref}>
            Back to assessment readiness
          </Link>
          <Link className="pat-button-secondary" href={resultsHref}>
            Review results
          </Link>
        </div>
      </section>
    </div>
  );
}
