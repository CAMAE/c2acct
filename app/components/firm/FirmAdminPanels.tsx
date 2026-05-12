import Link from "next/link";
import { CompanyProfileSettingsFields } from "@/app/components/profile/ProfileSettingsFields";

type ProfileSettings = {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  businessAddress: string;
  paymentDetails: string;
  companyDescription: string;
  website: string;
};

type FirmAdminPanelsProps = {
  contract: unknown;
  profileSettings: ProfileSettings;
  saveFirmProfile: (formData: FormData) => Promise<void>;
  userCount: number;
  activeUserCount: number;
};

export default function FirmAdminPanels({
  contract,
  profileSettings,
  saveFirmProfile,
  userCount,
  activeUserCount,
}: FirmAdminPanelsProps) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="pat-card p-6">
          <div className="pat-label">Profile management</div>
          <form action={saveFirmProfile} className="mt-4 grid gap-4">
            <CompanyProfileSettingsFields defaults={profileSettings} />
            <div>
              <button type="submit" className="pat-button-primary">
                Save profile settings
              </button>
            </div>
          </form>
        </div>

        <div className="pat-card p-6">
          <div className="pat-label">User management</div>
          <div className="mt-4 text-xl font-semibold text-[var(--shell-ink)]">PAT access management</div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Keep PAT access explicit and deliberate. Review existing users separately from the add-user flow so firm onboarding stays readable and trustworthy.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Link href="/firm/admin/users" className="pat-card pat-card-interactive block p-5">
              <div className="pat-label">Existing Users</div>
              <div className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">Review PAT access users</div>
              <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                See role, status, and profile readiness for everyone currently given firm PAT access.
              </p>
              <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                Total users: <span className="font-semibold text-[var(--shell-ink)]">{userCount}</span>
                {" · "}
                Active: <span className="font-semibold text-[var(--shell-ink)]">{activeUserCount}</span>
              </div>
            </Link>
            <Link href="/firm/admin/users/add" className="pat-card pat-card-interactive block p-5">
              <div className="pat-label">Add User</div>
              <div className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">Create PAT access deliberately</div>
              <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                Add a firm user with the profile fields needed for sane PAT onboarding. This does not imply external identity sync exists.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Future sync contract</div>
        <div className="mt-4 max-h-[24rem] overflow-auto rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
          <pre className="text-xs leading-6 whitespace-pre-wrap break-words text-[var(--shell-muted)]">
            {JSON.stringify(contract, null, 2)}
          </pre>
        </div>
        <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          This is integration-ready firm data. It does not pretend a live c2acct.com / six-site sync already exists.
        </div>
      </section>
    </>
  );
}
