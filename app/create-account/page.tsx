import { redirect } from "next/navigation";
import CreateAccountWizard, {
  type CreateAccountWizardContent,
} from "@/app/components/create-account/CreateAccountWizard";
import { completeSelfSignup } from "@/app/create-account/actions";
import { getSessionUser } from "@/lib/auth/session";
import { getSelfSignupPlanCards, isSelfSignupEnabled } from "@/lib/selfSignup";
import {
  RENDERED_SELF_SIGNUP_ROLES,
  getSelfSignupGoalQuestion,
  getSelfSignupOrganizationQuestion,
  getSelfSignupRoleOptions,
} from "@/lib/selfSignupWizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create an account | C2Acct",
  description: "Create a PAT vendor or firm account and choose your plan.",
};

export default async function CreateAccountPage() {
  // Pilot gate: self-signup ships dark. With the flag off the wizard route
  // falls back to the canonical sign-in hub instead of rendering.
  if (!isSelfSignupEnabled()) {
    redirect("/sign-in");
  }

  const sessionUser = await getSessionUser();
  if (sessionUser) {
    redirect("/");
  }

  const content: CreateAccountWizardContent = {
    roles: getSelfSignupRoleOptions(),
    byRole: Object.fromEntries(
      RENDERED_SELF_SIGNUP_ROLES.map((role) => [
        role,
        {
          organization: getSelfSignupOrganizationQuestion(role),
          goal: getSelfSignupGoalQuestion(role),
          planCards: getSelfSignupPlanCards(role),
        },
      ])
    ) as CreateAccountWizardContent["byRole"],
  };

  return <CreateAccountWizard content={content} action={completeSelfSignup} />;
}
