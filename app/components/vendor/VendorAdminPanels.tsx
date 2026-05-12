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

type ProductSummary = {
  id: string;
  name: string;
  summary: string | null;
};

type VendorAdminPanelsProps = {
  contract: unknown;
  createProduct: (formData: FormData) => Promise<void>;
  profileSettings: ProfileSettings;
  products: ProductSummary[];
  saveProfile: (formData: FormData) => Promise<void>;
};

export default function VendorAdminPanels({
  contract,
  createProduct,
  profileSettings,
  products,
  saveProfile,
}: VendorAdminPanelsProps) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="pat-card p-6">
          <div className="pat-label">Profile management</div>
          <form action={saveProfile} className="mt-4 grid gap-4">
            <CompanyProfileSettingsFields defaults={profileSettings} />
            <div>
              <button type="submit" className="pat-button-primary">
                Save profile settings
              </button>
            </div>
          </form>
        </div>

        <div className="pat-card p-6">
          <div className="pat-label">Product management</div>
          <form action={createProduct} className="mt-4 grid gap-4">
            <input name="name" className="pat-input" placeholder="Product name" required />
            <input name="website" className="pat-input" placeholder="Product website" />
            <textarea name="summary" className="pat-textarea" rows={4} placeholder="Product summary" />
            <div>
              <button type="submit" className="pat-button-primary">
                Add product
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="pat-card p-6">
          <div className="pat-label">Current products</div>
          <div className="mt-4 grid gap-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{product.name}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                  {product.summary ?? "No summary yet."}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-secondary" href="/vendor/product-assessment">
              Product assessment
            </Link>
          </div>
        </div>

        <div className="pat-card p-6">
          <div className="pat-label">Future sync contract</div>
          <div className="mt-4 max-h-[24rem] overflow-auto rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
            <pre className="text-xs leading-6 whitespace-pre-wrap break-words text-[var(--shell-muted)]">
              {JSON.stringify(contract, null, 2)}
            </pre>
          </div>
          <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            This is integration-ready data, not a fake live c2acct.com / six-site sync.
          </div>
        </div>
      </section>
    </>
  );
}
