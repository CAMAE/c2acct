import Link from "next/link";
import { redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  isModuleOrderRotationEnabled,
  moduleRotationOffset,
  orderModulesForUser,
} from "@/lib/moduleOrderRotation";
import {
  getFirmAssessmentProgress,
  summarizeFirmAlignmentProgress,
  type FirmModuleProgress,
  type FirmModuleProgressStatus,
} from "@/lib/firmPat";

export const dynamic = "force-dynamic";

const STATUS_SECTIONS: Array<{
  status: FirmModuleProgressStatus;
  title: string;
  empty: string;
}> = [
  {
    status: "in-progress",
    title: "In Progress",
    empty: "No modules have saved draft answers right now.",
  },
  {
    status: "not-started",
    title: "Not Started",
    empty: "All canonical firm modules have been started or completed.",
  },
  {
    status: "completed",
    title: "Completed",
    empty: "No final firm alignment modules have been submitted yet.",
  },
];

function formatDate(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function FirmModuleCard({ module }: { module: FirmModuleProgress }) {
  const latestActivity = formatDate(module.latestSubmittedAt ?? module.draftUpdatedAt);

  return (
    <Link
      href={module.href}
      className="pat-card pat-card-interactive block rounded-[24px] bg-white p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-xl font-semibold text-[var(--shell-ink)]">{module.title}</div>
        <span className="rounded-full border border-[var(--shell-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--shell-muted)]">
          {module.statusLabel}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{module.description}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{module.summary}</p>
      <div className="mt-5 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
        <div>Questions: <span className="font-semibold text-[var(--shell-ink)]">{module.questionCount}</span></div>
        <div>Progress: <span className="font-semibold text-[var(--shell-ink)]">{module.completedCount}/{module.questionCount}</span></div>
        <div>Latest score: <span className="font-semibold text-[var(--shell-ink)]">{module.latestScore ?? "--"}</span></div>
        <div>Latest activity: <span className="font-semibold text-[var(--shell-ink)]">{latestActivity ?? "--"}</span></div>
      </div>
      <p className="mt-5 text-sm leading-6 text-[var(--shell-muted)]">{module.statusDescription}</p>
    </Link>
  );
}

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

  const canonicalModules = await getFirmAssessmentProgress(sessionUser.companyId);
  // Presentation-only per-user rotation (flag off by default). Scoring/benchmarks
  // key modules by id and are unaffected; nextModule follows the visible order.
  const modules = orderModulesForUser(canonicalModules, sessionUser.id);
  const progress = summarizeFirmAlignmentProgress(modules);

  // R10: module-order rotation is invisible by eye. When PAT_DEBUG_MODULE_ROTATION=1
  // (dev only) surface the deterministic offset + the served order so it can be
  // verified in one place instead of comparing two accounts.
  const rotationDebug =
    process.env.PAT_DEBUG_MODULE_ROTATION === "1"
      ? {
          enabled: isModuleOrderRotationEnabled(),
          offset: moduleRotationOffset(sessionUser.id, canonicalModules.length),
          order: modules.map((module) => module.title),
        }
      : null;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <PatAudienceTitle
          as="h1"
          title="Firm alignment assessment across five PAT modules"
          audienceTerms={["Firm"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This is the modular PAT firm alignment assessment. Each module carries 20 scored questions on a 0 to 5 current-state scale plus five open-ended follow-up prompts, progress is tracked independently, and submissions flow directly into the existing results and insight unlock system. Complete the alignment assessment to unlock insights that help improve firm productivity.
        </p>
        {rotationDebug ? (
          <p className="mt-4 rounded-lg border border-dashed border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-3 font-mono text-xs text-[var(--shell-muted)]">
            [debug] module-order rotation {rotationDebug.enabled ? "ON" : "OFF"} · offset{" "}
            {rotationDebug.offset} · order: {rotationDebug.order.join(" → ")}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="pat-soft-panel p-5">
          <div className="pat-label">Overall Progress</div>
          <div className="pat-stat-number mt-3 text-3xl">
            {progress.completionPercent}%
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {progress.answeredQuestions} of {progress.totalQuestions} module questions are completed across the canonical five-module model.
          </p>
        </div>
        <div className="pat-soft-panel p-5">
          <div className="pat-label">Completed</div>
          <div className="pat-stat-number mt-3 text-3xl">
            {progress.completedModules}/{progress.totalModules}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Completed modules contribute to firm insights and unlock checks.
          </p>
        </div>
        <div className="pat-soft-panel p-5">
          <div className="pat-label">In Progress</div>
          <div className="pat-stat-number mt-3 text-3xl">
            {progress.inProgressModules}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Drafted modules can be resumed from the saved page and answers.
          </p>
        </div>
        <div className="pat-soft-panel p-5">
          <div className="pat-label">Next Best Step</div>
          <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">
            {progress.nextModule ? progress.nextModule.title : "Review insights"}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {progress.nextModule
              ? "Resume the in-progress module first, or start this module to keep the five-part assessment moving."
              : "All modules are complete. Open firm insights to review what the evidence unlocks next."}
          </p>
        </div>
      </section>

      {STATUS_SECTIONS.map((section) => {
        const sectionModules = modules.filter((module) => module.status === section.status);

        return (
          <section key={section.status} className="space-y-5">
            <div>
              <div className="pat-label">{section.title}</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
                {section.title} modules
              </h2>
            </div>
            {sectionModules.length === 0 ? (
              <div className="pat-card p-5 text-sm leading-6 text-[var(--shell-muted)]">
                {section.empty}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sectionModules.map((module) => (
                  <FirmModuleCard key={module.key} module={module} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="pat-card p-8">
        <div className="pat-label">Help</div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Why the five modules matter
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
          PAT separates firm alignment into operating model, automation and AI readiness, data flow,
          governance, and strategy so reviewers can see which operating condition is creating the
          strongest support or the most pressure. This overview is not a legacy single survey; each
          module is submitted independently and then contributes to the firm insight unlock chain.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
          Start with an in-progress module when one exists. If nothing is in progress, choose the
          module closest to the firm operating question you need to answer first.
        </p>
      </section>
    </div>
  );
}
