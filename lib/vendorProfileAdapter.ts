import { buildIntegrationEnvelope } from "@/lib/integrations/c2acct";

export type VendorExternalProfileContract = {
  entity: string;
  integration: {
    provider: "c2acct-six-site";
    mode: "manual-fallback" | "integration-ready";
    baseUrl: string | null;
    missingEnv: string[];
    notes: string[];
  };
  payload: {
    source: "manual-app-entry" | "c2acct-six-site";
    syncStatus: "manual" | "pending" | "synced";
    companyName: string;
    contactName: string | null;
    workEmail: string | null;
    phone: string | null;
    businessAddress: string | null;
    paymentDetails: string | null;
    companyDescription: string | null;
    website: string | null;
    products: Array<{
      name: string;
      slug: string | null;
      website: string | null;
      summary: string | null;
    }>;
  };
};

export function buildVendorExternalProfileContract(input: {
  companyName: string;
  contactName: string | null;
  workEmail: string | null;
  phone: string | null;
  businessAddress: string | null;
  paymentDetails: string | null;
  companyDescription: string | null;
  website: string | null;
  products: Array<{
    name: string;
    slug: string | null;
    website: string | null;
    summary: string | null;
  }>;
}): VendorExternalProfileContract {
  return buildIntegrationEnvelope("vendor-profile", {
    source: "manual-app-entry",
    syncStatus: "manual",
    companyName: input.companyName,
    contactName: input.contactName,
    workEmail: input.workEmail,
    phone: input.phone,
    businessAddress: input.businessAddress,
    paymentDetails: input.paymentDetails,
    companyDescription: input.companyDescription,
    website: input.website,
    products: input.products,
  });
}
