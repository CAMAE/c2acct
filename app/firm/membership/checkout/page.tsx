import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Membership Checkout | C2Acct",
  description: "Redirects to the firm membership payment-processing route.",
};

export default async function FirmMembershipCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  redirect(`/firm/membership/payment-processing${params?.plan ? `?plan=${params.plan}` : ""}`);
}
