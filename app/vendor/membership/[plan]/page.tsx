import { notFound, redirect } from "next/navigation";
import MembershipTierDetailPage from "@/app/components/membership/MembershipTierDetailPage";
import { getSessionUser } from "@/lib/auth/session";
import { resolveCurrentMembership } from "@/lib/membership";
import {
  getMembershipTierDetailModel,
  parseMembershipPlanSegment,
} from "@/lib/membershipContent";

export const dynamic = "force-dynamic";

type Params = {
  plan: string;
};

export default async function VendorMembershipTierPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }

  const { plan } = await params;
  const parsedPlan = parseMembershipPlanSegment(plan);
  if (!parsedPlan) {
    notFound();
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "vendor");
  const model = getMembershipTierDetailModel({
    audience: "vendor",
    plan: parsedPlan,
    currentPlan: membership.plan,
    currentStatus: membership.status,
  });

  return <MembershipTierDetailPage displayName={membership.displayName} model={model} />;
}
