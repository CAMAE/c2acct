"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { provisionOrganizationAccount } from "@/lib/provisioning/account";
import {
  buildSelfSignupCheckoutHref,
  isSelfSignupEnabled,
  validateSelfSignupSubmission,
} from "@/lib/selfSignup";

export type CreateAccountActionState = {
  error: string | null;
};

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Final wizard step: create the org + owner through the shared provisioning
 * seam (one seam, two entrances — same function the /admin form calls), sign
 * the new owner in with their chosen credential, and hand off to the existing
 * membership checkout.
 */
export async function completeSelfSignup(
  _previous: CreateAccountActionState,
  formData: FormData
): Promise<CreateAccountActionState> {
  // Defense in depth: the page gate already redirects, but the action must
  // hold on its own — a dark feature stays dark even for direct POSTs.
  if (!isSelfSignupEnabled()) {
    redirect("/sign-in");
  }

  const validation = validateSelfSignupSubmission({
    role: formValue(formData, "role"),
    orgName: formValue(formData, "orgName"),
    orgSize: formValue(formData, "orgSize"),
    primaryGoal: formValue(formData, "primaryGoal"),
    plan: formValue(formData, "plan"),
    ownerName: formValue(formData, "ownerName"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });
  if (!validation.ok) {
    return { error: validation.message };
  }

  const { submission } = validation;
  const result = await provisionOrganizationAccount({
    orgName: submission.orgName,
    orgKind: submission.role,
    ownerEmail: submission.email,
    ownerName: submission.ownerName,
    password: submission.password,
    credentialMode: "user-chosen",
    actorUserId: null,
    requestedVia: "self-signup",
    profile: { orgSize: submission.orgSize, primaryGoal: submission.primaryGoal },
  });
  if (!result.ok) {
    return { error: result.message };
  }

  const checkoutHref = buildSelfSignupCheckoutHref(submission.role, submission.plan);

  try {
    await signIn("credentials", {
      email: submission.email,
      password: submission.password,
      redirectTo: checkoutHref,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // The account exists (provisioning succeeded) but the auto sign-in
      // failed — land on sign-in with the checkout as the callback.
      redirect(`/sign-in?callbackUrl=${encodeURIComponent(checkoutHref)}&email=${encodeURIComponent(submission.email)}`);
    }

    throw error;
  }

  return { error: null };
}
