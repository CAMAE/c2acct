import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Membership Checkout | C2Acct",
  description: "Redirects to the vendor membership payment-processing route.",
};

export default async function VendorMembershipCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  redirect(`/vendor/membership/payment-processing${params?.plan ? `?plan=${params.plan}` : ""}`);
}
