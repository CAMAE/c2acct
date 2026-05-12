import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { BOOTSTRAP_DEFAULT_PASSWORD_ENV, LOCAL_REVIEW_PASSWORD_ENV } from "@/lib/auth/localReview";

type AuthEnvKey =
  | "baseUrl"
  | "secret"
  | "localReviewPassword"
  | "bootstrapDefaultPassword"
  | "productionDomain";

type CandidateSpec = {
  envNames: string[];
  label: string;
};

type EnvSource = {
  file: string;
  values: Record<string, string>;
};

type ResolvedCandidate = {
  value: string | null;
  envName: string;
  source: string | null;
  defined: boolean;
  blank: boolean;
};

export type ResolvedAuthEnv = {
  values: {
    baseUrl: string | null;
    secret: string | null;
    localReviewPassword: string | null;
    bootstrapDefaultPassword: string | null;
    productionDomain: string | null;
  };
  resolvedBy: {
    baseUrl: ResolvedCandidate;
    secret: ResolvedCandidate;
    localReviewPassword: ResolvedCandidate;
    bootstrapDefaultPassword: ResolvedCandidate;
    productionDomain: ResolvedCandidate;
  };
  canonicalLocalOrigin: string;
  normalizedBaseUrl: string | null;
  expectedProductionOrigin: string;
  missing: string[];
  credentialsAuthEnabled: boolean;
  localReviewRequested: boolean;
  localReviewEnabled: boolean;
  localReviewProviderReady: boolean;
  productionAuthReady: boolean;
  ready: boolean;
  warnings: string[];
};

const CANDIDATES: Record<AuthEnvKey, CandidateSpec> = {
  baseUrl: {
    envNames: ["AUTH_URL", "NEXTAUTH_URL"],
    label: "AUTH_URL or NEXTAUTH_URL",
  },
  secret: {
    envNames: ["AUTH_SECRET", "NEXTAUTH_SECRET"],
    label: "AUTH_SECRET or NEXTAUTH_SECRET",
  },
  localReviewPassword: {
    envNames: [LOCAL_REVIEW_PASSWORD_ENV],
    label: LOCAL_REVIEW_PASSWORD_ENV,
  },
  bootstrapDefaultPassword: {
    envNames: [BOOTSTRAP_DEFAULT_PASSWORD_ENV],
    label: BOOTSTRAP_DEFAULT_PASSWORD_ENV,
  },
  productionDomain: {
    envNames: ["PAT_PRODUCTION_DOMAIN"],
    label: "PAT_PRODUCTION_DOMAIN",
  },
};

let cachedEnvSources: EnvSource[] | null = null;
const DEFAULT_CANONICAL_LOCAL_ORIGIN = "http://127.0.0.1:3001";
export const DEFAULT_PRODUCTION_DOMAIN = "patalign.com";

function hasValue(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeOrigin(value: string | null | undefined) {
  if (!hasValue(value)) {
    return null;
  }

  return value!.trim().replace(/\/$/, "");
}

function hasOwnEnv(name: string) {
  return Object.prototype.hasOwnProperty.call(process.env, name);
}

function getEnvFiles(): string[] {
  const cwd = process.cwd();
  return [".env.local", ".env"].map((file) => path.join(cwd, file));
}

function loadEnvSources(): EnvSource[] {
  if (cachedEnvSources) {
    return cachedEnvSources;
  }

  cachedEnvSources = getEnvFiles()
    .filter((file) => fs.existsSync(file))
    .map((file) => ({
      file: path.basename(file),
      values: dotenv.parse(fs.readFileSync(file)),
    }));

  return cachedEnvSources;
}

function resolveFromProcessOrFiles(envNames: string[]) {
  let firstBlankCandidate:
    | {
        source: string;
        envName: string;
      }
    | null = null;

  for (const envName of envNames) {
    if (hasOwnEnv(envName)) {
      const runtimeValue = process.env[envName];
      if (hasValue(runtimeValue)) {
        return {
          value: runtimeValue!.trim(),
          source: "runtime",
          envName,
          defined: true,
          blank: false,
        };
      }

      firstBlankCandidate ??= {
        source: "runtime",
        envName,
      };
    }
  }

  const envSources = loadEnvSources();
  for (const envName of envNames) {
    for (const source of envSources) {
      if (Object.prototype.hasOwnProperty.call(source.values, envName)) {
        const fileValue = source.values[envName];
        if (hasValue(fileValue)) {
          return {
            value: fileValue.trim(),
            source: source.file,
            envName,
            defined: true,
            blank: false,
          };
        }

        firstBlankCandidate ??= {
          source: source.file,
          envName,
        };
      }
    }
  }

  if (firstBlankCandidate) {
    return {
      value: null,
      source: firstBlankCandidate.source,
      envName: firstBlankCandidate.envName,
      defined: true,
      blank: true,
    };
  }

  return {
    value: null,
    source: null,
    envName: envNames[0],
    defined: false,
    blank: false,
  };
}

function collectWarnings() {
  const warnings: string[] = [];
  const envSources = loadEnvSources();

  if (envSources.length === 0) {
    return warnings;
  }

  for (const spec of Object.values(CANDIDATES)) {
    for (const envName of spec.envNames) {
      const localValue = envSources.find((source) => source.file === ".env.local")?.values[envName];
      const defaultValue = envSources.find((source) => source.file === ".env")?.values[envName];

      if (localValue !== undefined && !hasValue(localValue) && hasValue(defaultValue)) {
        warnings.push(
          `${envName} is blank in .env.local. Auth resolution ignores that blank value and falls back to the configured value in .env.`
        );
      }
    }
  }

  for (const spec of Object.values(CANDIDATES)) {
    if (spec.envNames.length < 2) {
      continue;
    }

    const [preferredName, fallbackName] = spec.envNames;
    const preferred = resolveFromProcessOrFiles([preferredName]);
    const fallback = resolveFromProcessOrFiles([fallbackName]);

    if (hasValue(preferred.value) && hasValue(fallback.value) && preferred.value !== fallback.value) {
      warnings.push(
        `${preferredName} and ${fallbackName} both have values. ${preferredName} takes precedence.`
      );
    }
  }

  return warnings;
}

export function getResolvedAuthEnv(): ResolvedAuthEnv {
  const resolvedBy = {
    baseUrl: resolveFromProcessOrFiles(CANDIDATES.baseUrl.envNames),
    secret: resolveFromProcessOrFiles(CANDIDATES.secret.envNames),
    localReviewPassword: resolveFromProcessOrFiles(CANDIDATES.localReviewPassword.envNames),
    bootstrapDefaultPassword: resolveFromProcessOrFiles(CANDIDATES.bootstrapDefaultPassword.envNames),
    productionDomain: resolveFromProcessOrFiles(CANDIDATES.productionDomain.envNames),
  };

  const baseUrl = resolvedBy.baseUrl.value;
  const normalizedBaseUrl = normalizeOrigin(baseUrl);
  const secret = resolvedBy.secret.value;
  const localReviewPassword = resolvedBy.localReviewPassword.value;
  const bootstrapDefaultPassword = resolvedBy.bootstrapDefaultPassword.value;
  const productionDomain = resolvedBy.productionDomain.value ?? DEFAULT_PRODUCTION_DOMAIN;
  const expectedProductionOrigin = `https://${productionDomain}`;
  const localReviewRequested =
    process.env.NODE_ENV !== "production" && process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH === "1";
  const localReviewEnabled = localReviewRequested;
  const canonicalLocalOrigin =
    normalizeOrigin(process.env.PAT_LOCAL_ORIGIN) ?? DEFAULT_CANONICAL_LOCAL_ORIGIN;

  const missing: string[] = [];
  if (!baseUrl) missing.push(CANDIDATES.baseUrl.label);
  if (!secret) missing.push(CANDIDATES.secret.label);
  if (localReviewEnabled && !localReviewPassword) {
    missing.push(LOCAL_REVIEW_PASSWORD_ENV);
  }

  const credentialsAuthEnabled = Boolean(normalizedBaseUrl && secret);
  const productionAuthReady =
    process.env.NODE_ENV !== "production" ||
    (normalizedBaseUrl === expectedProductionOrigin && Boolean(secret));
  const localReviewProviderReady = Boolean(credentialsAuthEnabled && localReviewEnabled && localReviewPassword);
  const warnings = collectWarnings();

  if (process.env.NODE_ENV === "production") {
    if (normalizedBaseUrl !== expectedProductionOrigin) {
      warnings.push(
        `Production AUTH_URL must be exactly ${expectedProductionOrigin}. Current resolved origin is ${normalizedBaseUrl ?? "missing"}.`
      );
    }

    if (normalizedBaseUrl && !normalizedBaseUrl.startsWith("https://")) {
      warnings.push("Production AUTH_URL must use https.");
    }
  }

  return {
    values: {
      baseUrl,
      secret,
      localReviewPassword,
      bootstrapDefaultPassword,
      productionDomain,
    },
    canonicalLocalOrigin,
    normalizedBaseUrl,
    expectedProductionOrigin,
    resolvedBy,
    missing,
    credentialsAuthEnabled,
    localReviewRequested,
    localReviewEnabled,
    localReviewProviderReady,
    productionAuthReady,
    ready: credentialsAuthEnabled && productionAuthReady,
    warnings,
  };
}

export function getResolvedAuthSecret() {
  return getResolvedAuthEnv().values.secret;
}
