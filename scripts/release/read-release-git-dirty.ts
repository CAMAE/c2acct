import { getReleaseGitState } from "../../lib/release/git-state";

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

if (args.format === "json") {
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
