import PortalSurfaceCard from "@/app/components/PortalSurfaceCard";
import MembershipCard from "@/app/components/membership/MembershipCard";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import {
  IndividualHelpInlineContent,
  IndividualMeetPatContent,
  individualWorkspaceCards,
} from "@/app/components/individual/IndividualPortalContent";
import { getSessionUser } from "@/lib/auth/session";
import { resolveCurrentMembership } from "@/lib/membership";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { resolvePortalExperience } from "@/lib/portalVisibility";
import { getUserAlignmentProgress, getUserPatContext } from "@/lib/userPat";
import { UserProfileSettingsFields } from "@/app/components/profile/ProfileSettingsFields";
import { getUserProfileSettings, saveUserProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Individual | C2Acct",
  description: "Individual PAT homepage scaffold and route entry.",
};

type SearchParams = {
  panel?: string;
};

function getPanelHref(panel: "workspace" | "pat" | "profile" | "help") {
  return panel === "workspace" ? "/user" : `/user?panel=${panel}`;
}

export default async function UserPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
  const activePanel =
    params?.panel === "pat" || params?.panel === "profile" || params?.panel === "help" ? params.panel : "workspace";
  const sessionUser = await getSessionUser();
  const experience = sessionUser ? await resolvePortalExperience(sessionUser) : null;
  const userPatContext = sessionUser ? await getUserPatContext(sessionUser) : null;
  const alignmentProgress = sessionUser ? await getUserAlignmentProgress(sessionUser) : null;
  const audienceMismatch = sessionUser ? experience?.audience !== "individual" : false;
  const membershipState = sessionUser ? await resolveCurrentMembership(sessionUser, "individual") : null;
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
  const panelOptions = [
    { key: "workspace", label: messages.common.workspace, href: getPanelHref("workspace") },
    { key: "pat", label: messages.nav.meet_pat, href: getPanelHref("pat") },
    { key: "profile", label: messages.common.profile, href: getPanelHref("profile") },
    { key: "help", label: messages.common.help, href: getPanelHref("help") },
  ] as const;
  const localizedCards = individualWorkspaceCards.map((card) => ({
    ...card,
    title: messages.portal.cards.individual[card.id]?.title ?? card.title,
    description: messages.portal.cards.individual[card.id]?.description ?? card.description,
  }));

  async function saveProfile(formData: FormData) {
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

    redirect("/user?panel=profile");
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{messages.portal.individual.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {messages.portal.individual.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.portal.individual.body}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <PortalPanelSelector activeKey={activePanel} options={panelOptions} />
        </div>
      </section>

      {activePanel === "pat" ? (
        <IndividualMeetPatContent />
      ) : activePanel === "profile" ? (
        <section className="space-y-6">
          <section className="pat-card p-8">
            <div className="pat-label">{messages.portal.individual.individualProfile}</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {messages.portal.individual.profileTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
              {messages.portal.individual.profileBody}
            </p>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <div className="pat-card p-6">
              <div className="pat-label">{messages.portal.individual.profileSettings}</div>
              {sessionUser && profileSettings ? (
                <form action={saveProfile} className="mt-4 grid gap-4">
                  <UserProfileSettingsFields defaults={profileSettings} />
                  <div>
                    <button type="submit" className="pat-button-primary">
                      {messages.common.saveIndividualProfile}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                  {messages.portal.individual.signInToEdit}
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
                <div className="pat-label">{messages.portal.individual.currentSignedInAccount}</div>
                <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
                  <div>Email: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser?.email ?? messages.common.notSignedIn}</span></div>
                  <div>{messages.portal.individual.role}: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser?.role ?? messages.common.guest}</span></div>
                  <div>{messages.portal.individual.companyContext}: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser?.companyId ?? messages.common.unbound}</span></div>
                  <div>{messages.portal.individual.personPatSubject}: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.personSubjectId ?? messages.insights.shared.pending}</span></div>
                  <div>{messages.portal.individual.assessmentCount}: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.assessmentCount ?? 0}</span></div>
                  <div>{messages.portal.individual.latestScore}: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.latestScore ?? "--"}</span></div>
                </div>
              </div>
            </div>
          </section>
        </section>
      ) : activePanel === "help" ? (
        <IndividualHelpInlineContent />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.individual.account}: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser?.email ?? messages.common.notSignedIn}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.individual.role}: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser?.role ?? messages.common.guest}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.individual.audience}: <span className="font-semibold text-[var(--shell-ink)]">{experience?.audience ?? messages.common.unbound}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.individual.personPatSubject}: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext ? (userPatContext.subjectMembershipReady ? messages.portal.individual.ready : messages.portal.individual.fallback) : messages.portal.individual.unavailable}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.individual.individualAlignment}: <span className="font-semibold text-[var(--shell-ink)]">{alignmentProgress?.tier1Unlocked ? messages.portal.individual.completed : messages.portal.individual.pending}</span>
            </div>
            {membershipState ? (
              <MembershipCard
                audienceLabel="individual"
                href="/user/membership"
                plan={membershipState.membership.plan}
                status={membershipState.membership.status}
              />
            ) : null}
          </section>

          {audienceMismatch ? (
            <section className="pat-card p-6">
              <div className="rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
                {messages.portal.individual.audienceMismatch}
              </div>
            </section>
          ) : null}

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {localizedCards.map((card) => (
              <PortalSurfaceCard key={card.id} surface={card} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
