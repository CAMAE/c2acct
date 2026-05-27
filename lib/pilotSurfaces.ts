export const INDIVIDUAL_SURFACES_FLAG_ENV = "PAT_ENABLE_INDIVIDUAL_SURFACES";
export const INVITEE_SURFACES_FLAG_ENV = "PAT_ENABLE_INVITEE_SURFACES";

function isEnabled(value: string | undefined) {
  return value === "1";
}

export function isIndividualSurfacesEnabled(env: NodeJS.ProcessEnv = process.env) {
  return isEnabled(env[INDIVIDUAL_SURFACES_FLAG_ENV]);
}

export function isInviteeSurfacesEnabled(env: NodeJS.ProcessEnv = process.env) {
  return isEnabled(env[INVITEE_SURFACES_FLAG_ENV]);
}

export function getPilotDisabledSignInPath(surface: "individual" | "invitee") {
  return `/sign-in?pilotDisabled=${surface}`;
}

export function getPilotDisabledMessage(surface: string | null | undefined) {
  if (surface === "individual") {
    return "Individual surfaces are shelved for the current vendor/firm pilot. Use Vendor or Firm for pilot QA.";
  }

  if (surface === "invitee") {
    return "Invitee access is shelved for the current vendor/firm pilot. Use the canonical sign-in hub instead.";
  }

  return null;
}
