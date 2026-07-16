import Link from "next/link";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import ScoreBar from "@/app/components/charts/ScoreBar";
import CardChip, { CardChipRow } from "@/app/components/cards/CardChip";
import { redirect } from "next/navigation";
import MembershipCard from "@/app/components/membership/MembershipCard";
import { getSessionUser } from "@/lib/auth/session";
import { resolveCurrentMembership } from "@/lib/membership";
import { UserProfileSettingsFields } from "@/app/components/profile/ProfileSettingsFields";
import { getUserProfileSettings, saveUserProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { getUserPatContext } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export default async function UserProfilePage() {
  const sessionUser = await getSessionUser();
  const userPatContext = sessionUser ? await getUserPatContext(sessionUser) : null;
  const membershipState = sessionUser ? await resolveCurrentMembership(sessionUser, "individual") : null;

  async function saveUserProfile(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor) {
      redirect("/sign-in/user");
    }

    const contactName = String(formData.get("contactName") ?? "").trim();
    await prisma.user.update({
      where: { id: actor.id },
      data: {
        name: contactName || null,
        updatedAt: new Date(),
      },
    }).catch(() => null);

    await saveUserProfileSettings(`user:${actor.id}`, {
      contactName,
      workEmail: String(formData.get("workEmail") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      businessAddress: String(formData.get("businessAddress") ?? "").trim(),
      companyDescription: String(formData.get("companyDescription") ?? "").trim(),
    });

    redirect("/user/profile");
  }

  const userRecord = sessionUser
    ? await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { name: true, email: true },
      }).catch(() => null)
    : null;

  const profileSettings = sessionUser
    ? await getUserProfileSettings(`user:${sessionUser.id}`, {
        contactName: userRecord?.name ?? "",
        workEmail: userRecord?.email ?? sessionUser.email,
        phone: "",
        businessAddress: "",
        companyDescription: "",
      })
    : null;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Individual profile</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Clean profile scaffold for the next PAT phase
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This page stays intentionally clean, but it now supports editable person-level PAT contact and profile settings without inventing a second account system.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="pat-card p-6">
          <div className="pat-label">Profile settings</div>
          {sessionUser && profileSettings ? (
            <form action={saveUserProfile} className="mt-4 grid gap-4">
              <UserProfileSettingsFields defaults={profileSettings} />
              <div>
                <button type="submit" className="pat-button-primary">
                  Save individual profile
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
              Sign in to edit the current individual profile settings.
            </div>
          )}
        </div>
        <div className="space-y-6">
          {membershipState ? (
            <MembershipCard
              audienceLabel="individual"
              href="/user/membership"
              plan={membershipState.membership.plan}
              status={membershipState.membership.status}
            />
          ) : null}
          <div className="pat-card p-6">
            <div className="pat-label">Current signed-in account</div>
            <div className="mt-2 text-sm font-semibold break-all text-[var(--shell-ink)]">
              {sessionUser?.email ?? "Not signed in"}
            </div>
            <CardChipRow>
              <CardChip>{sessionUser?.role ?? "Guest"}</CardChip>
              <CardChip>{userPatContext?.assessmentCount ?? 0} assessments</CardChip>
              <CardChip tone={userPatContext?.personSubjectId ? "positive" : "muted"}>
                {userPatContext?.personSubjectId ? "Subject connected" : "Subject pending"}
              </CardChip>
            </CardChipRow>
            <div className="mt-4">
              <ScoreLockup
                label="Latest score"
                score={userPatContext?.latestScore ?? null}
                context={`Company: ${sessionUser?.companyId ?? "Unbound"}`}
              />
              <div className="mt-3">
                <ScoreBar score={userPatContext?.latestScore ?? null} title="Individual latest score" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link className="pat-button-secondary" href="/user">
          Back to individual home
        </Link>
        <Link className="pat-button-secondary" href="/user?panel=profile">
          Review profile in workspace
        </Link>
      </section>
    </div>
  );
}
