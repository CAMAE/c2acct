import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import CreateAccountWizard, {
  type CreateAccountWizardContent,
} from "@/app/components/create-account/CreateAccountWizard";
import { completeSelfSignup } from "@/app/(app)/create-account/actions";
import { getSessionUser } from "@/lib/auth/session";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { resolvePortalExperience } from "@/lib/portalVisibility";
import { CREATE_ACCOUNT_PATH, getSelfSignupPlanCards, isSelfSignupEnabled } from "@/lib/selfSignup";
import {
  RENDERED_SELF_SIGNUP_ROLES,
  getSelfSignupGoalQuestion,
  getSelfSignupOrganizationQuestion,
  getSelfSignupRoleOptions,
} from "@/lib/selfSignupWizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create an account | Patalign",
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
    // No silent bounce: a signed-in user who clicks "Create an account" gets
    // an explicit choice — sign out to start a new organization, or continue
    // to the workspace they're already in.
    const experience = await resolvePortalExperience(sessionUser);
    const workspaceHref =
      experience.audience === "vendor"
        ? "/vendor"
        : experience.audience === "firm"
          ? "/firm"
          : experience.audience === "individual" && isIndividualSurfacesEnabled()
            ? "/user"
            : "/";

    async function signOutToCreateAccount() {
      "use server";
      await signOut({ redirectTo: CREATE_ACCOUNT_PATH });
    }

    return (
      <div className="mx-auto w-full max-w-3xl">
        <section className="pat-card px-7 py-8 sm:px-9 sm:py-9">
          <div className="pat-label">Already signed in</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            You&apos;re already signed in
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--shell-muted)]">
            You&apos;re signed in as <span className="font-semibold text-[var(--shell-ink)]">{sessionUser.email}</span>.
            Creating an account starts a brand-new organization with its own owner — sign out first,
            or continue to the workspace you already have.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={workspaceHref} className="pat-button-primary">
              Continue to your workspace
            </Link>
            <form action={signOutToCreateAccount}>
              <button type="submit" className="pat-button-secondary">
                Sign out and create a new account
              </button>
            </form>
          </div>
        </section>
      </div>
    );
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
