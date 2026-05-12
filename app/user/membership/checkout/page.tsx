import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Individual Membership Checkout | C2Acct",
  description: "Redirects to the individual membership payment-processing route.",
};

export default async function UserMembershipCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  redirect(`/user/membership/payment-processing${params?.plan ? `?plan=${params.plan}` : ""}`);
}
