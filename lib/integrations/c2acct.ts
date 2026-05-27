type IntegrationMode = "manual-fallback" | "integration-ready";

export type C2AcctIntegrationState = {
  provider: "c2acct-six-site";
  mode: IntegrationMode;
  baseUrl: string | null;
  missingEnv: string[];
  notes: string[];
};

function cleanEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getC2AcctIntegrationState(): C2AcctIntegrationState {
  const baseUrl = cleanEnv(process.env.C2ACCT_SIX_SITE_BASE_URL);
  const accessToken = cleanEnv(process.env.C2ACCT_SIX_SITE_TOKEN);
  const missingEnv: string[] = [];

  if (!baseUrl) {
    missingEnv.push("C2ACCT_SIX_SITE_BASE_URL");
  }

  if (!accessToken) {
    missingEnv.push("C2ACCT_SIX_SITE_TOKEN");
  }

  return {
    provider: "c2acct-six-site",
    mode: missingEnv.length === 0 ? "integration-ready" : "manual-fallback",
    baseUrl,
    missingEnv,
    notes:
      missingEnv.length === 0
        ? [
            "Runtime credentials are configured. A live adapter can be enabled without changing the PAT route contracts.",
          ]
        : [
            "PAT is using editable fallback behavior because live c2acct.com / six-site credentials are not configured in this environment.",
            "Missing requirements are listed in missingEnv so operators can finish the adapter later without guessing.",
          ],
  };
}

export function buildIntegrationEnvelope<T>(entity: string, payload: T) {
  return {
    entity,
    integration: getC2AcctIntegrationState(),
    payload,
  };
}
