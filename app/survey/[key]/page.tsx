import AssessmentModuleClient from "@/app/components/assessment/AssessmentModuleClient";

export default async function SurveyModulePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  return <AssessmentModuleClient moduleKey={key} />;
}
