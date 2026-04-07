import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export type RepoEnvSource = {
  file: string;
  values: Record<string, string>;
};

export type ResolvedRepoEnvValue = {
  value: string | null;
  envName: string;
  source: string | null;
  defined: boolean;
  blank: boolean;
};

const REPO_ENV_FILENAMES = [".env.local", ".env"] as const;

let cachedRepoEnvSources: RepoEnvSource[] | null = null;

function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOwnEnv(name: string) {
  return Object.prototype.hasOwnProperty.call(process.env, name);
}

export function getRepoEnvFiles(cwd = process.cwd()) {
  return REPO_ENV_FILENAMES.map((file) => path.join(cwd, file));
}

export function readRepoEnvSources(cwd = process.cwd()): RepoEnvSource[] {
  if (cwd === process.cwd() && cachedRepoEnvSources) {
    return cachedRepoEnvSources;
  }

  const sources = getRepoEnvFiles(cwd)
    .filter((file) => fs.existsSync(file))
    .map((file) => ({
      file: path.basename(file),
      values: dotenv.parse(fs.readFileSync(file)),
    }));

  if (cwd === process.cwd()) {
    cachedRepoEnvSources = sources;
  }

  return sources;
}

export function resolveRepoEnvValue(envNames: string[], cwd = process.cwd()): ResolvedRepoEnvValue {
  let firstBlankCandidate:
    | {
        source: string;
        envName: string;
      }
    | null = null;

  for (const envName of envNames) {
    if (hasOwnEnv(envName)) {
      const runtimeValue = process.env[envName];
      const trimmedRuntimeValue = runtimeValue?.trim();
      if (trimmedRuntimeValue) {
        return {
          value: trimmedRuntimeValue,
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

  const envSources = readRepoEnvSources(cwd);
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

export function applyRepoEnv(cwd = process.cwd()) {
  const applied = new Set<string>();

  for (const source of readRepoEnvSources(cwd)) {
    for (const [name, rawValue] of Object.entries(source.values)) {
      if (hasValue(process.env[name])) {
        continue;
      }

      if (applied.has(name) || !hasValue(rawValue)) {
        continue;
      }

      process.env[name] = rawValue.trim();
      applied.add(name);
    }
  }

  return {
    applied: [...applied],
    files: readRepoEnvSources(cwd).map((source) => source.file),
  };
}
