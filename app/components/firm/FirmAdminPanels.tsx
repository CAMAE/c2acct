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

type ManagedUser = {
  id: string;
  email: string;
  role: string;
  status: string;
};

type FirmAdminPanelsProps = {
  inviteUser: (formData: FormData) => Promise<void>;
  profileSettings: ProfileSettings;
  saveFirmProfile: (formData: FormData) => Promise<void>;
  individualSurfacesEnabled: boolean;
  userInsight: ManagedUser[];
};

export default function FirmAdminPanels({
  inviteUser,
  individualSurfacesEnabled,
  profileSettings,
  saveFirmProfile,
  userInsight,
}: FirmAdminPanelsProps) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="pat-card p-6">
          <div className="pat-label">Firm profile</div>
          <form action={saveFirmProfile} className="mt-4 grid gap-4">
            <CompanyProfileSettingsFields defaults={profileSettings} />
            <div>
              <button type="submit" className="pat-button-primary">
                Save firm profile
              </button>
            </div>
          </form>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            The current admin model keeps the editable firm contract honest: company identity is live now, and richer six-site profile fields can sync into this surface later.
          </p>
        </div>

        <div className="pat-card p-6">
          <div className="pat-label">{individualSurfacesEnabled ? "User Insight" : "Firm users"}</div>
          <div className="mt-4 text-xl font-semibold text-[var(--shell-ink)]">Manage users under the firm umbrella</div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {individualSurfacesEnabled
              ? "Open the user insight surface to invite users, review current progress status, and search for an individual user under this firm."
              : "Invite users and review current firm account status. Individual insight surfaces are not part of the current vendor and firm pilot."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {individualSurfacesEnabled ? (
              <Link className="pat-button-primary" href="/firm/admin/user-insight">
                Open user insight
              </Link>
            ) : null}
            <div className="pat-soft-panel px-4 py-3 text-sm text-[var(--shell-muted)]">
              Current users: <span className="font-semibold text-[var(--shell-ink)]">{userInsight.length}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="pat-card p-6">
          <div className="pat-label">Invite or update user</div>
          <form action={inviteUser} className="mt-4 grid gap-4 md:grid-cols-[1.3fr_0.8fr_auto] md:items-end">
            <input name="email" className="pat-input" placeholder="user@firm.com" required />
            <select name="role" className="pat-input" defaultValue="MEMBER">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
            <button type="submit" className="pat-button-primary">
              Save user
            </button>
          </form>
          <div className="mt-5 grid gap-3">
            {userInsight.map((user) => (
              <div key={user.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-[var(--shell-ink)]">{user.email}</div>
                  <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--shell-accent)]">
                    {user.role}
                  </span>
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                  Status: {user.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
