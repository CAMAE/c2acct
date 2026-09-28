/**
 * Box 3f item L (2026-09-28): the neutral integration envelope. The former
 * six-site integration stub (never built) is gone; the
 * profile contracts keep their shape so the admin contract views and the future
 * sync work stay honest: no external sync is configured, data is entered in the app.
 */
export type IntegrationState = {
  provider: "none";
  mode: "manual-fallback";
  baseUrl: null;
  missingEnv: string[];
  notes: string[];
};

export function getIntegrationState(): IntegrationState {
  return {
    provider: "none",
    mode: "manual-fallback",
    baseUrl: null,
    missingEnv: [],
    notes: ["No external sync is configured. Profile data is entered in the app."],
  };
}

export function buildIntegrationEnvelope<T>(entity: string, payload: T) {
  return {
    entity,
    integration: getIntegrationState(),
    payload,
  };
}
