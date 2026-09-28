import { buildIntegrationEnvelope } from "@/lib/integrations/envelope";

export type VendorExternalProfileContract = {
  entity: string;
  integration: {
    provider: "none";
    mode: "manual-fallback" | "integration-ready";
    baseUrl: string | null;
    missingEnv: string[];
    notes: string[];
  };
  payload: {
    source: "manual-app-entry" | "external-sync";
    syncStatus: "manual" | "pending" | "synced";
    companyName: string;
    contactName: string | null;
    workEmail: string | null;
    phone: string | null;
    businessAddress: string | null;
    billingContactName: string | null;
    billingContactEmail: string | null;
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
  billingContactName: string | null;
  billingContactEmail: string | null;
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
    billingContactName: input.billingContactName,
    billingContactEmail: input.billingContactEmail,
    companyDescription: input.companyDescription,
    website: input.website,
    products: input.products,
  });
}
