export const SUPPORTED_SURVEY_RUNTIME_INPUT_TYPES = ["SLIDER"] as const;

export type SupportedSurveyRuntimeInputType =
  (typeof SUPPORTED_SURVEY_RUNTIME_INPUT_TYPES)[number];

export function isSupportedSurveyRuntimeInputType(
  inputType: string
): inputType is SupportedSurveyRuntimeInputType {
  return (SUPPORTED_SURVEY_RUNTIME_INPUT_TYPES as readonly string[]).includes(inputType);
}
