import type { CompanyProfileSettings, UserProfileSettings } from "@/lib/profileSettingsStore";

type CompanyProfileSettingsFieldsProps = {
  defaults: CompanyProfileSettings;
};

type UserProfileSettingsFieldsProps = {
  defaults: UserProfileSettings;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-semibold text-[var(--shell-ink)]">{children}</span>;
}

export function CompanyProfileSettingsFields({ defaults }: CompanyProfileSettingsFieldsProps) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <FieldLabel>Company name</FieldLabel>
        <input name="companyName" className="pat-input" defaultValue={defaults.companyName} placeholder="Company name" />
      </label>
      <label className="grid gap-2">
        <FieldLabel>Contact name</FieldLabel>
        <input name="contactName" className="pat-input" defaultValue={defaults.contactName} placeholder="Contact name" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel>Work email</FieldLabel>
          <input name="workEmail" type="email" className="pat-input" defaultValue={defaults.workEmail} placeholder="name@company.com" />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Phone</FieldLabel>
          <input name="phone" className="pat-input" defaultValue={defaults.phone} placeholder="Phone" />
        </label>
      </div>
      <label className="grid gap-2">
        <FieldLabel>Business address</FieldLabel>
        <textarea name="businessAddress" rows={3} className="pat-textarea" defaultValue={defaults.businessAddress} placeholder="Business address" />
      </label>
      <label className="grid gap-2">
        <FieldLabel>Payment details</FieldLabel>
        <textarea name="paymentDetails" rows={3} className="pat-textarea" defaultValue={defaults.paymentDetails} placeholder="Payment details" />
      </label>
      <label className="grid gap-2">
        <FieldLabel>Company description</FieldLabel>
        <textarea name="companyDescription" rows={5} className="pat-textarea" defaultValue={defaults.companyDescription} placeholder="Company description" />
      </label>
      <label className="grid gap-2">
        <FieldLabel>Website</FieldLabel>
        <input name="website" className="pat-input" defaultValue={defaults.website} placeholder="https://example.com" />
      </label>
    </div>
  );
}

export function UserProfileSettingsFields({ defaults }: UserProfileSettingsFieldsProps) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <FieldLabel>Contact name</FieldLabel>
        <input name="contactName" className="pat-input" defaultValue={defaults.contactName} placeholder="Contact name" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel>Work email</FieldLabel>
          <input name="workEmail" type="email" className="pat-input" defaultValue={defaults.workEmail} placeholder="name@company.com" />
        </label>
        <label className="grid gap-2">
          <FieldLabel>Phone</FieldLabel>
          <input name="phone" className="pat-input" defaultValue={defaults.phone} placeholder="Phone" />
        </label>
      </div>
      <label className="grid gap-2">
        <FieldLabel>Business address</FieldLabel>
        <textarea name="businessAddress" rows={3} className="pat-textarea" defaultValue={defaults.businessAddress} placeholder="Business address" />
      </label>
      <label className="grid gap-2">
        <FieldLabel>Company description</FieldLabel>
        <textarea name="companyDescription" rows={5} className="pat-textarea" defaultValue={defaults.companyDescription} placeholder="Company description" />
      </label>
    </div>
  );
}
