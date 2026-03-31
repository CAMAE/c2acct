"use server";

import { redirect } from "next/navigation";
import { resolveInviteeCode, setInviteeAccessCookie } from "@/lib/invitee/access";

export async function submitInviteeCode(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) {
    redirect("/sign-in/invitee?error=missing_code");
  }

  const result = await resolveInviteeCode(code);
  if (!result.ok) {
    redirect(`/sign-in/invitee?error=${result.error}`);
  }

  await setInviteeAccessCookie(result.context);
  redirect(result.context.destinationPath);
}
