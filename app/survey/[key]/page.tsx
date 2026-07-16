import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import AssessmentModuleClient from "@/app/components/assessment/AssessmentModuleClient";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { getSessionUser } from "@/lib/auth/session";
import { ensureFirmAlignmentSystem } from "@/lib/firmPat";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { USER_ALIGNMENT_MODULE_KEY, ensureUserAlignmentSystem } from "@/lib/userPat";

export default async function SurveyModulePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (key === USER_ALIGNMENT_MODULE_KEY) {
    await ensureUserAlignmentSystem();
  }
  if (key.startsWith("firm_alignment_")) {
    await ensureFirmAlignmentSystem();
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(buildCanonicalSignInPath({ callbackUrl: `/survey/${key}` }));
  }

  if (key.startsWith("firm_alignment_")) {
    const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.PRO);
    if (!entitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="firm"
          surfaceLabel="Firm alignment module"
          title="Firm alignment modules require Pro membership"
          body="This firm assessment runtime is part of the live Pro firm tier. PAT keeps the route visible so the upgrade path stays explicit, but it does not open the module body until Pro is active."
          displayName={entitlement.membership.displayName}
          currentPlan={entitlement.membership.plan}
          currentStatus={entitlement.membership.status}
          requiredPlan={entitlement.requiredPlan}
          membershipHref={entitlement.membershipHref}
          upgradeHref={entitlement.upgradeHref}
          workspaceHref="/firm/alignment-assessment"
          workspaceLabel="Back to firm alignment assessment"
          availableNow="The baseline firm state still keeps workspace entry and membership routing available."
          upgradeNote="The firm alignment module runtime feeds the live firm insight layer, so PAT treats it as a Pro surface rather than a baseline workspace page."
        />
      );
    }
  }

  if (key === USER_ALIGNMENT_MODULE_KEY) {
    const entitlement = await resolveMembershipEntitlement(sessionUser, "individual", MEMBERSHIP_PLAN.PRO);
    if (!entitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="individual"
          surfaceLabel="Individual alignment module"
          title="Individual alignment assessment requires Pro membership"
          body="This person-level assessment runtime is part of the live Pro individual tier. PAT keeps the route visible so the upgrade path stays explicit, but it does not open the module body until Pro is active."
          displayName={entitlement.membership.displayName}
          currentPlan={entitlement.membership.plan}
          currentStatus={entitlement.membership.status}
          requiredPlan={entitlement.requiredPlan}
          membershipHref={entitlement.membershipHref}
          upgradeHref={entitlement.upgradeHref}
          workspaceHref="/user/alignment-assessment"
          workspaceLabel="Back to individual alignment assessment"
          availableNow="The baseline individual state still keeps workspace entry and membership routing available."
          upgradeNote="The current user assessment runtime is the live Pro intake path for person-level PAT state, so it does not open from the baseline state."
        />
      );
    }
  }

  return (
    <>
      <EnsureCompanySelected />
      <AssessmentModuleClient moduleKey={key} />
    </>
  );
}
