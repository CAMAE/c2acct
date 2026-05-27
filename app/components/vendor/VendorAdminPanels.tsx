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

type VendorAdminPanelsProps = {
  contract: unknown;
  profileSettings: ProfileSettings;
  saveProfile: (formData: FormData) => Promise<void>;
};

export default function VendorAdminPanels({
  contract,
  profileSettings,
  saveProfile,
}: VendorAdminPanelsProps) {
  return (
    <>
      <section className="pat-card p-6">
        <div className="pat-label">Profile management</div>
        <form action={saveProfile} className="mt-4 grid gap-4">
          <CompanyProfileSettingsFields defaults={profileSettings} />
          <div>
            <button type="submit" className="pat-button-primary">
              Save profile settings
            </button>
          </div>
        </form>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Future sync contract</div>
        <div className="mt-4 max-h-[24rem] overflow-auto rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
          <pre className="text-xs leading-6 whitespace-pre-wrap break-words text-[var(--shell-muted)]">
            {JSON.stringify(contract, null, 2)}
          </pre>
        </div>
        <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          This is integration-ready data, not a fake live c2acct.com / six-site sync.
        </div>
      </section>
    </>
  );
}
