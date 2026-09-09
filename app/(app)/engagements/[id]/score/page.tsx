import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePortalExperience } from "@/lib/portalVisibility";

/**
 * Depth box 9 (2026-09-09, APPROVED flag-off): engagement scoring is not built.
 * No menu or card links here; a direct hit lands on the visitor's own workspace
 * with a one-line notice (or on sign-in when signed out).
 */
export const dynamic = "force-dynamic";

const WORKSPACE_BY_AUDIENCE: Record<string, string> = {
  firm: "/firm",
  vendor: "/vendor",
  consultant: "/consultants",
  individual: "/user",
};

export default async function EngagementScorePage() {
  const sessionUser = await getSessionUser();
  const experience = await resolvePortalExperience(sessionUser);
  const workspace = WORKSPACE_BY_AUDIENCE[experience.audience];
  redirect(workspace ? `${workspace}?notice=engagement-score` : "/sign-in");
}
