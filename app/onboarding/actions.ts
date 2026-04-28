"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PUBLIC_ONBOARDING_COOKIE,
  buildPublicOnboardingState,
  encodePublicOnboardingState,
  isPublicOnboardingAudience,
  normalizePublicOnboardingPlan,
} from "@/lib/publicOnboarding";

export async function savePublicOnboardingIntent(formData: FormData) {
  const rawAudience = String(formData.get("audience") ?? "");
  if (!isPublicOnboardingAudience(rawAudience)) {
    redirect("/onboarding");
  }

  const plan = normalizePublicOnboardingPlan(String(formData.get("plan") ?? ""));
  const state = buildPublicOnboardingState({
    audience: rawAudience,
    plan,
    step: "role-selected",
  });
  const cookieStore = await cookies();
  cookieStore.set(PUBLIC_ONBOARDING_COOKIE, encodePublicOnboardingState(state), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(`/onboarding/${rawAudience}?plan=${plan}&started=1`);
}
