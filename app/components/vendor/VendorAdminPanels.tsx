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
  profileSettings: ProfileSettings;
  saveProfile: (formData: FormData) => Promise<void>;
};

export default function VendorAdminPanels({
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
    </>
  );
}
