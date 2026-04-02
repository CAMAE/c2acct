import { getPublicReleaseFingerprint, getReleaseFingerprint } from "../../lib/release/fingerprint";

function parseArgs(argv: string[]) {
  const args = {
    format: "json",
    publicOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--format") {
      args.format = argv[index + 1] ?? "json";
      index += 1;
    } else if (value === "--public") {
      args.publicOnly = true;
    }
  }

  return args;
}

function toEnvLines(payload: Record<string, string | number>) {
  return Object.entries(payload)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

const args = parseArgs(process.argv.slice(2));
if (args.publicOnly) {
  const fingerprint = getPublicReleaseFingerprint();
  if (args.format === "env") {
    const envPayload = {
      release_id: fingerprint.releaseId,
      fingerprint_commit_sha: fingerprint.commitSha,
      fingerprint_branch: fingerprint.branch,
      fingerprint_canonical_root_name: fingerprint.canonicalRootName,
      fingerprint_build_timestamp: fingerprint.buildTimestamp,
      fingerprint_auth_mode: fingerprint.authMode,
      fingerprint_build_source_type: fingerprint.buildSourceType,
      fingerprint_build_id: fingerprint.buildId,
      fingerprint_release_fingerprint_seed: fingerprint.releaseFingerprintSeed,
      fingerprint_start_command: fingerprint.startCommand,
      fingerprint_git_dirty: fingerprint.gitDirty,
    };

    process.stdout.write(`${toEnvLines(envPayload)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(fingerprint, null, 2)}\n`);
  }
} else {
  const fingerprint = getReleaseFingerprint();
  if (args.format === "env") {
    const envPayload = {
      release_id: fingerprint.releaseId,
      fingerprint_commit_sha: fingerprint.commitSha,
      fingerprint_branch: fingerprint.branch,
      fingerprint_canonical_root: fingerprint.canonicalRoot,
      fingerprint_canonical_root_name: fingerprint.canonicalRootName,
      fingerprint_build_timestamp: fingerprint.buildTimestamp,
      fingerprint_auth_mode: fingerprint.authMode,
      fingerprint_build_source_type: fingerprint.buildSourceType,
      fingerprint_build_id: fingerprint.buildId,
      fingerprint_release_fingerprint_seed: fingerprint.releaseFingerprintSeed,
      fingerprint_start_command: fingerprint.startCommand,
      fingerprint_git_dirty: fingerprint.gitDirty,
    };

    process.stdout.write(`${toEnvLines(envPayload)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(fingerprint, null, 2)}\n`);
  }
}
