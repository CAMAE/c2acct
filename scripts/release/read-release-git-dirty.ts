// AUDIT-D12-001 fix (Day-18 Block 2): explicit .ts extension so bare `node`
// (with Node 22.6+ native type-stripping) resolves the import. Without it,
// standalone `node scripts/release/read-release-git-dirty.ts` errors
// ERR_MODULE_NOT_FOUND because Node's ESM resolver doesn't probe extensions
// the way tsx does. The production paths in scripts/mac-mini/common.sh and
// scripts/release/prepare-standalone-runtime.mjs use `node --import tsx`,
// which accepts both forms. tsconfig moduleResolution=bundler permits the
// .ts extension, so typecheck stays clean.
import { getReleaseGitState, getStartupDirtyVerdict } from "../../lib/release/git-state.ts";

function parseArgs(argv: string[]) {
  const args = {
    root: process.cwd(),
    format: "state",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      args.root = argv[index + 1] ?? args.root;
      index += 1;
    } else if (value === "--format") {
      args.format = argv[index + 1] ?? args.format;
      index += 1;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));
const state = getReleaseGitState(args.root);

if (args.format === "startup") {
  // The mac-mini startup gate's verdict: "clean" | "ledger-only" | "dirty".
  // Separate from the `state` format on purpose — that one feeds the release
  // fingerprint, and the ledger exemption must not reach it.
  process.stdout.write(`${getStartupDirtyVerdict(args.root)}\n`);
} else if (args.format === "json") {
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
} else if (args.format === "env") {
  process.stdout.write(`git_dirty=${state.gitDirty}\n`);
  process.stdout.write(`dirty_entries=${state.dirtyEntries.map((entry) => entry.raw).join("|")}\n`);
  process.stdout.write(
    `ignored_dirty_entries=${state.ignoredDirtyEntries.map((entry) => entry.raw).join("|")}\n`
  );
} else {
  process.stdout.write(`${state.gitDirty}\n`);
}
