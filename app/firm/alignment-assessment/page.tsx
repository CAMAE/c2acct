import Link from "next/link";
import { redirect } from "next/navigation";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import { getSessionUser } from "@/lib/auth/session";
import { PAT_PRODUCT_NAME } from "@/lib/displayCopy";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getFirmAssessmentProgress } from "@/lib/firmPat";

export const dynamic = "force-dynamic";

export default async function FirmAlignmentAssessmentPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="firm"
        surfaceLabel="Firm alignment assessment"
        title="Firm alignment assessment requires Pro membership"
        body="The modular firm alignment assessment is part of the current Pro firm tier. PAT keeps the route visible so the upgrade path is explicit, but the assessment modules open only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/firm"
        workspaceLabel="Open firm workspace"
        availableNow="The baseline firm state still keeps workspace entry, help, and membership routing available."
        stagedNote="This assessment surface feeds the current firm insight layer, so PAT treats it as part of the current Pro operating tier rather than the baseline state."
      />
    );
  }

  const modules = await getFirmAssessmentProgress(sessionUser.companyId);

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{PAT_PRODUCT_NAME}</div>
        <PatAudienceTitle
          as="h1"
          title="Firm alignment assessment across five PAT modules"
          audienceTerms={["Firm"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This is the modular PAT firm alignment assessment. Each module carries 20 scored questions on a 0 to 5 current-state scale plus five open-ended follow-up prompts, progress is tracked independently, and submissions flow directly into the existing results and insight unlock system. Complete the alignment assessment to unlock insights that help improve firm productivity.
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
    </div>
  );
}
