import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import AssessmentModuleClient from "@/app/components/assessment/AssessmentModuleClient";
import { getSessionUser } from "@/lib/auth/session";

export default async function SurveyModulePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/survey/${key}`)}`);
  }

  return (
    <>
      <EnsureCompanySelected />
      <AssessmentModuleClient moduleKey={key} />
    </>
  );
}
