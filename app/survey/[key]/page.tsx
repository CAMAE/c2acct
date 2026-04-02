import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import AssessmentModuleClient from "@/app/components/assessment/AssessmentModuleClient";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { getSessionUser } from "@/lib/auth/session";
import { USER_ALIGNMENT_MODULE_KEY, ensureUserAlignmentSystem } from "@/lib/userPat";

export default async function SurveyModulePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (key === USER_ALIGNMENT_MODULE_KEY) {
    await ensureUserAlignmentSystem();
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(buildCanonicalSignInPath({ callbackUrl: `/survey/${key}` }));
  }

  return (
    <>
      <EnsureCompanySelected />
      <AssessmentModuleClient moduleKey={key} />
    </>
  );
}
