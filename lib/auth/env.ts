import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

type AuthEnvKey =
  | "baseUrl"
  | "secret"
  | "githubId"
  | "githubSecret"
  | "localReviewPassword";

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
    githubId: string | null;
    githubSecret: string | null;
    localReviewPassword: string | null;
  };
  resolvedBy: {
    baseUrl: ResolvedCandidate;
    secret: ResolvedCandidate;
    githubId: ResolvedCandidate;
    githubSecret: ResolvedCandidate;
    localReviewPassword: ResolvedCandidate;
  };
  canonicalLocalOrigin: string;
  normalizedBaseUrl: string | null;
  missing: string[];
  callbackUrl: string | null;
  providerCallbackPath: string;
  githubProviderReady: boolean;
  githubAuthEnabled: boolean;
  githubAvailabilityReason: string | null;
  localReviewRequested: boolean;
  localReviewEnabled: boolean;
  localReviewProviderReady: boolean;
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
  githubId: {
    envNames: ["AUTH_GITHUB_ID"],
    label: "AUTH_GITHUB_ID",
  },
  githubSecret: {
    envNames: ["AUTH_GITHUB_SECRET"],
    label: "AUTH_GITHUB_SECRET",
  },
  localReviewPassword: {
    envNames: ["PAT_LOCAL_REVIEW_PASSWORD"],
    label: "PAT_LOCAL_REVIEW_PASSWORD",
  },
};

let cachedEnvSources: EnvSource[] | null = null;
const DEFAULT_CANONICAL_LOCAL_ORIGIN = "http://127.0.0.1:3001";

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
    githubId: resolveFromProcessOrFiles(CANDIDATES.githubId.envNames),
    githubSecret: resolveFromProcessOrFiles(CANDIDATES.githubSecret.envNames),
    localReviewPassword: resolveFromProcessOrFiles(CANDIDATES.localReviewPassword.envNames),
  };

  const baseUrl = resolvedBy.baseUrl.value;
  const normalizedBaseUrl = normalizeOrigin(baseUrl);
  const secret = resolvedBy.secret.value;
  const githubId = resolvedBy.githubId.value;
  const githubSecret = resolvedBy.githubSecret.value;
  const localReviewPassword = resolvedBy.localReviewPassword.value;
  const localReviewRequested =
    process.env.NODE_ENV !== "production" && process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH === "1";
  const localReviewEnabled = localReviewRequested;
  const canonicalLocalOrigin =
    normalizeOrigin(process.env.PAT_LOCAL_ORIGIN) ?? DEFAULT_CANONICAL_LOCAL_ORIGIN;
  const localGithubRequested = process.env.PAT_ENABLE_LOCAL_GITHUB_AUTH === "1";

  const callbackPath = "/api/auth/callback/github";
  const callbackUrl =
    normalizedBaseUrl && /^https?:\/\//.test(normalizedBaseUrl)
      ? `${normalizedBaseUrl}${callbackPath}`
      : null;

  const missing: string[] = [];
  if (!baseUrl) missing.push(CANDIDATES.baseUrl.label);
  if (!secret) missing.push(CANDIDATES.secret.label);
  if (!githubId) missing.push(CANDIDATES.githubId.label);
  if (!githubSecret) missing.push(CANDIDATES.githubSecret.label);

  const githubProviderReady = Boolean(githubId && githubSecret);
  const localGithubOriginAligned =
    process.env.NODE_ENV === "production" || normalizedBaseUrl === canonicalLocalOrigin;
  const githubAuthEnabled = Boolean(
    githubProviderReady &&
      (process.env.NODE_ENV === "production" || (localGithubOriginAligned && localGithubRequested))
  );
  const githubAvailabilityReason = !githubProviderReady
    ? "GitHub provider env is incomplete."
    : process.env.NODE_ENV === "production"
      ? null
      : !localGithubOriginAligned
        ? `Local GitHub sign-in is blocked until AUTH_URL and NEXTAUTH_URL are both set to ${canonicalLocalOrigin}.`
        : !localGithubRequested
          ? `Local GitHub sign-in stays hidden until the OAuth app allows ${callbackUrl ?? `${canonicalLocalOrigin}${callbackPath}`} and PAT_ENABLE_LOCAL_GITHUB_AUTH=1 is set.`
          : null;
  const localReviewProviderReady = Boolean(localReviewEnabled && secret && localReviewPassword);
  const ready = Boolean((normalizedBaseUrl && secret && githubAuthEnabled) || localReviewProviderReady);

  if (localReviewEnabled && !localReviewPassword) {
    missing.push(CANDIDATES.localReviewPassword.label);
  }

  return {
    values: {
      baseUrl,
      secret,
      githubId,
      githubSecret,
      localReviewPassword,
    },
    canonicalLocalOrigin,
    normalizedBaseUrl,
    resolvedBy,
    missing,
    callbackUrl,
    providerCallbackPath: callbackPath,
    githubProviderReady,
    githubAuthEnabled,
    githubAvailabilityReason,
    localReviewRequested,
    localReviewEnabled,
    localReviewProviderReady,
    ready,
    warnings: collectWarnings(),
  };
}

export function getResolvedAuthSecret() {
  return getResolvedAuthEnv().values.secret;
}
