#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = "/Users/camerongarrett/work/c2acct-live";
const normalizedExportPrefix = "Users/camerongarrett/work/c2acct-live/";
const artifactDir = path.join(repoRoot, "artifacts/audit");
const jsonArtifactPath = path.join(artifactDir, "export-vs-hotfix-diff-report.json");
const markdownArtifactPath = path.join(artifactDir, "export-vs-hotfix-diff-report.md");
const hotfixRoots = ["/Users/camerongarrett/.Trash"];
const exportRoots = ["/Users/camerongarrett/Downloads", "/Users/camerongarrett/.Trash"];
const hotfixSegments = ["01-app-root", "02-db-scripts-ops-tests", "03-docs-audit"];
const exportSegments = hotfixSegments;

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });
}

function statSafe(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function fileExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function isoFromMtime(ms) {
  return new Date(ms).toISOString();
}

function parseExcludeRules() {
  const scriptPath = path.join(repoRoot, "scripts/export-codebase-safe.sh");
  const scriptBody = fs.readFileSync(scriptPath, "utf8");
  return [...scriptBody.matchAll(/--exclude='([^']+)'/g)].map((match) => match[1]);
}

function globToRegex(pattern) {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesExportExclude(relativePath, excludeRules) {
  const posixPath = relativePath.replace(/\\/g, "/");
  const segments = posixPath.split("/").filter(Boolean);
  const basename = segments.at(-1) ?? "";

  for (const rule of excludeRules) {
    if (rule.endsWith("/")) {
      const dirRule = rule.slice(0, -1);
      if (
        posixPath === dirRule ||
        posixPath.startsWith(`${dirRule}/`) ||
        posixPath.includes(`/${dirRule}/`)
      ) {
        return true;
      }
      continue;
    }

    if (rule.includes("/")) {
      if (globToRegex(rule).test(posixPath)) {
        return true;
      }
      continue;
    }

    if (globToRegex(rule).test(basename)) {
      return true;
    }
  }

  return false;
}

function dedupeSegmentPick(files) {
  return [...files].sort((left, right) => {
    if (left.name.length !== right.name.length) {
      return left.name.length - right.name.length;
    }
    if (left.name !== right.name) {
      return left.name.localeCompare(right.name);
    }
    return right.mtimeMs - left.mtimeMs;
  })[0];
}

function selectHotfixSet() {
  const candidates = [];

  for (const root of hotfixRoots) {
    if (!fileExists(root)) {
      continue;
    }
    for (const name of fs.readdirSync(root)) {
      if (!name.endsWith(".zip") || !name.startsWith("PAT-c2acct-live-fix-local-review-signin-hotfix-")) {
        continue;
      }
      const match = name.match(
        /^(PAT-c2acct-live-fix-local-review-signin-hotfix-.+?)-(01-app-root|02-db-scripts-ops-tests|03-docs-audit)(?: .*?)?\.zip$/,
      );
      if (!match) {
        continue;
      }
      const fullPath = path.join(root, name);
      const stats = fs.statSync(fullPath);
      candidates.push({
        baseId: match[1],
        segment: match[2],
        path: fullPath,
        name,
        mtimeMs: stats.mtimeMs,
      });
    }
  }

  const grouped = new Map();
  for (const candidate of candidates) {
    const bucket = grouped.get(candidate.baseId) ?? new Map();
    const segmentFiles = bucket.get(candidate.segment) ?? [];
    segmentFiles.push(candidate);
    bucket.set(candidate.segment, segmentFiles);
    grouped.set(candidate.baseId, bucket);
  }

  const completeSets = [];
  for (const [baseId, segmentMap] of grouped.entries()) {
    const selectedSegments = {};
    let complete = true;
    for (const segment of hotfixSegments) {
      const segmentFiles = segmentMap.get(segment);
      if (!segmentFiles?.length) {
        complete = false;
        break;
      }
      selectedSegments[segment] = dedupeSegmentPick(segmentFiles);
    }
    if (!complete) {
      continue;
    }
    const files = hotfixSegments.map((segment) => selectedSegments[segment]);
    const newestMtimeMs = Math.max(...files.map((file) => file.mtimeMs));
    completeSets.push({ baseId, files, newestMtimeMs });
  }

  if (!completeSets.length) {
    throw new Error("No complete hotfix zip set found.");
  }

  completeSets.sort((left, right) => {
    if (right.newestMtimeMs !== left.newestMtimeMs) {
      return right.newestMtimeMs - left.newestMtimeMs;
    }
    return right.baseId.localeCompare(left.baseId);
  });

  return completeSets[0];
}

function parseTimestampFromDirName(name) {
  const match = name.match(/(\d{8}-\d{6})$/);
  return match ? match[1] : "";
}

function selectExportSet() {
  const completeSets = [];

  for (const root of exportRoots) {
    if (!fileExists(root)) {
      continue;
    }
    for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
      if (!dirent.isDirectory() || !dirent.name.startsWith("PAT-codebase-export-")) {
        continue;
      }
      const fullDir = path.join(root, dirent.name);
      const files = [];
      let complete = true;
      for (const segment of exportSegments) {
        const zipName = `PAT-c2acct-live-export-${segment}.zip`;
        const zipPath = path.join(fullDir, zipName);
        const stats = statSafe(zipPath);
        if (!stats) {
          complete = false;
          break;
        }
        files.push({
          segment,
          path: zipPath,
          name: zipName,
          mtimeMs: stats.mtimeMs,
        });
      }
      if (!complete) {
        continue;
      }
      completeSets.push({
        baseId: dirent.name,
        root: fullDir,
        files,
        newestMtimeMs: Math.max(...files.map((file) => file.mtimeMs)),
        sortableTimestamp: parseTimestampFromDirName(dirent.name),
      });
    }
  }

  if (!completeSets.length) {
    throw new Error("No complete export zip set found.");
  }

  completeSets.sort((left, right) => {
    if (right.sortableTimestamp !== left.sortableTimestamp) {
      return right.sortableTimestamp.localeCompare(left.sortableTimestamp);
    }
    if (right.newestMtimeMs !== left.newestMtimeMs) {
      return right.newestMtimeMs - left.newestMtimeMs;
    }
    return right.baseId.localeCompare(left.baseId);
  });

  return completeSets[0];
}

function normalizeZipEntry(entryName) {
  const posixEntry = entryName.replace(/\\/g, "/");
  if (posixEntry.startsWith(normalizedExportPrefix)) {
    return posixEntry.slice(normalizedExportPrefix.length);
  }
  const firstSlash = posixEntry.indexOf("/");
  if (firstSlash !== -1) {
    const firstSegment = posixEntry.slice(0, firstSlash);
    if (firstSegment.startsWith("PAT-c2acct-live-")) {
      return posixEntry.slice(firstSlash + 1);
    }
  }
  return posixEntry;
}

function parseZipListing(zipPath) {
  const output = run("unzip", ["-v", zipPath]);
  const lines = output.split(/\r?\n/);
  const entries = [];
  let boundaryCount = 0;
  let inTable = false;

  for (const line of lines) {
    if (line.startsWith("--------")) {
      boundaryCount += 1;
      if (boundaryCount === 1) {
        inTable = true;
        continue;
      }
      if (boundaryCount === 2) {
        break;
      }
    }
    if (!inTable || !line.trim()) {
      continue;
    }
    const match = line.match(
      /^\s*(\d+)\s+\S+\s+(\d+)\s+\S+\s+\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s+([0-9a-fA-F]{8})\s+(.*)$/,
    );
    if (!match) {
      continue;
    }
    entries.push({
      uncompressedSize: Number(match[1]),
      compressedSize: Number(match[2]),
      crc32: match[3].toLowerCase(),
      entryName: match[4],
    });
  }

  return entries;
}

function buildInventory(setLabel, zipFiles) {
  const byPath = new Map();
  const duplicateEntries = [];
  const conflictingEntries = [];

  for (const zipFile of zipFiles) {
    for (const entry of parseZipListing(zipFile.path)) {
      if (entry.entryName.endsWith("/")) {
        continue;
      }
      const relativePath = normalizeZipEntry(entry.entryName);
      if (!relativePath || relativePath.endsWith("/")) {
        continue;
      }
      const identity = `${entry.uncompressedSize}:${entry.crc32}`;
      const record = {
        setLabel,
        relativePath,
        identity,
        uncompressedSize: entry.uncompressedSize,
        compressedSize: entry.compressedSize,
        crc32: entry.crc32,
        sourceZip: zipFile.path,
        sourceSegment: zipFile.segment,
        zipEntry: entry.entryName,
      };

      const existing = byPath.get(relativePath);
      if (!existing) {
        byPath.set(relativePath, record);
        continue;
      }

      if (existing.identity === identity) {
        duplicateEntries.push({
          relativePath,
          first: existing,
          duplicate: record,
        });
        continue;
      }

      conflictingEntries.push({
        relativePath,
        first: existing,
        conflicting: record,
      });
    }
  }

  return { byPath, duplicateEntries, conflictingEntries };
}

function gitPathExists(ref, relativePath) {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}:${relativePath}`], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function normalizeCurrentPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function classifyExportOnly(relativePath, baseCommit) {
  const currentPath = normalizeCurrentPath(relativePath);
  const existsNow = fileExists(currentPath);
  const existedAtHotfixCommit = gitPathExists(baseCommit, relativePath);

  if (existedAtHotfixCommit) {
    return {
      bucket: "packaging_export_only",
      reason: "proved_hotfix_bundle_omission",
      detail: "Path existed at the hotfix commit but is absent from the hotfix zip union.",
      existsNow,
      existedAtHotfixCommit,
    };
  }

  return {
    bucket: "actual_change",
    reason: existsNow ? "proved_current_tree_addition" : "proved_later_export_snapshot_addition",
    detail: "Path does not exist at the hotfix commit and appears only in the later export bundle set.",
    existsNow,
    existedAtHotfixCommit,
  };
}

function classifyHotfixOnly(relativePath, baseCommit, excludeRules) {
  const currentPath = normalizeCurrentPath(relativePath);
  const existsNow = fileExists(currentPath);
  const existsAtHead = gitPathExists("HEAD", relativePath);
  const existedAtHotfixCommit = gitPathExists(baseCommit, relativePath);
  const exportExcluded = matchesExportExclude(relativePath, excludeRules);

  if ((existsNow || existsAtHead) && exportExcluded) {
    return {
      bucket: "packaging_export_only",
      reason: "proved_export_command_omission",
      detail: "Path still exists in the current tree and matches the export script exclusion list.",
      existsNow,
      existsAtHead,
      existedAtHotfixCommit,
      exportExcluded,
    };
  }

  if (existsNow || existsAtHead) {
    return {
      bucket: "packaging_export_only",
      reason: "proved_current_tree_present_but_missing_from_export_bundle",
      detail: "Path still exists in the current tree but is absent from the export zip union.",
      existsNow,
      existsAtHead,
      existedAtHotfixCommit,
      exportExcluded,
    };
  }

  return {
    bucket: "actual_change",
    reason: "proved_absent_from_current_tree",
    detail: "Path appears in the hotfix bundle set but is absent from the current tree and the later export bundle set.",
    existsNow,
    existsAtHead,
    existedAtHotfixCommit,
    exportExcluded,
  };
}

function bucketForPatSummary(relativePath) {
  const segments = relativePath.split("/");
  if (segments[0] === "app" && segments[1]) {
    return `${segments[0]}/${segments[1]}`;
  }
  if (segments[0] === "docs" && segments[1]) {
    return `${segments[0]}/${segments[1]}`;
  }
  if (segments[0] === "artifacts" && segments[1]) {
    return `${segments[0]}/${segments[1]}`;
  }
  if (segments[0] === "prisma" && segments[1]) {
    return `${segments[0]}/${segments[1]}`;
  }
  return segments[0] ?? relativePath;
}

function topBuckets(paths, limit = 8) {
  const counts = new Map();
  for (const item of paths) {
    const bucket = bucketForPatSummary(item.relativePath ?? item);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([bucket, count]) => ({ bucket, count }));
}

function buildPatChangeSummary(actualChanges) {
  const patRelevant = actualChanges.filter((item) =>
    [
      "app/",
      "lib/",
      "tests/",
      "docs/",
      "prisma/",
      "scripts/",
      "data/",
      "public/",
    ].some((prefix) => item.relativePath.startsWith(prefix)),
  );

  return topBuckets(patRelevant.length ? patRelevant : actualChanges);
}

function pickExamples(items, limit = 12) {
  return [...items]
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    .slice(0, limit);
}

function formatZipFile(file) {
  return {
    path: file.path,
    name: file.name,
    segment: file.segment,
    modifiedAt: isoFromMtime(file.mtimeMs),
  };
}

function shortExamples(items) {
  return items.map((item) => {
    const parts = [`- \`${item.relativePath}\``];
    if (item.reason) {
      parts.push(`: ${item.reason}`);
    }
    return parts.join("");
  });
}

function main() {
  ensureDir(artifactDir);

  const excludeRules = parseExcludeRules();
  const hotfixSet = selectHotfixSet();
  const exportSet = selectExportSet();
  const baseCommit = hotfixSet.baseId.split("-").at(-1);

  const currentBranch = run("git", ["branch", "--show-current"]).trim();
  const currentHead = run("git", ["rev-parse", "HEAD"]).trim();
  const currentHeadShort = run("git", ["rev-parse", "--short=7", "HEAD"]).trim();

  const hotfixInventory = buildInventory("hotfix", hotfixSet.files);
  const exportInventory = buildInventory("export", exportSet.files);

  const allPaths = new Set([
    ...hotfixInventory.byPath.keys(),
    ...exportInventory.byPath.keys(),
  ]);

  const unchangedOverlaps = [];
  const modifiedOverlaps = [];
  const exportOnly = [];
  const hotfixOnly = [];

  for (const relativePath of [...allPaths].sort()) {
    const hotfixEntry = hotfixInventory.byPath.get(relativePath);
    const exportEntry = exportInventory.byPath.get(relativePath);

    if (hotfixEntry && exportEntry) {
      if (hotfixEntry.identity === exportEntry.identity) {
        unchangedOverlaps.push({
          relativePath,
          hotfix: hotfixEntry,
          export: exportEntry,
        });
      } else {
        modifiedOverlaps.push({
          relativePath,
          reason: "content_hash_changed",
          detail: "CRC32 and/or uncompressed size differ across bundle sets.",
          hotfix: hotfixEntry,
          export: exportEntry,
        });
      }
      continue;
    }

    if (exportEntry) {
      exportOnly.push({
        relativePath,
        export: exportEntry,
        ...classifyExportOnly(relativePath, baseCommit),
      });
      continue;
    }

    hotfixOnly.push({
      relativePath,
      hotfix: hotfixEntry,
      ...classifyHotfixOnly(relativePath, baseCommit, excludeRules),
    });
  }

  const actualChanges = [
    ...modifiedOverlaps.map((item) => ({
      kind: "modified_overlap",
      relativePath: item.relativePath,
      reason: item.reason,
      detail: item.detail,
      hotfix: item.hotfix,
      export: item.export,
    })),
    ...exportOnly.filter((item) => item.bucket === "actual_change").map((item) => ({
      kind: "export_only_actual_addition",
      ...item,
    })),
    ...hotfixOnly.filter((item) => item.bucket === "actual_change").map((item) => ({
      kind: "hotfix_only_actual_absence",
      ...item,
    })),
  ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const packagingOnly = [
    ...exportOnly.filter((item) => item.bucket === "packaging_export_only").map((item) => ({
      kind: "export_only_packaging_difference",
      ...item,
    })),
    ...hotfixOnly.filter((item) => item.bucket === "packaging_export_only").map((item) => ({
      kind: "hotfix_only_packaging_difference",
      ...item,
    })),
  ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const counts = {
    changedFileCount: actualChanges.length,
    onlyInExportCount: exportOnly.length,
    onlyInHotfixCount: hotfixOnly.length,
    unchangedOverlapCount: unchangedOverlaps.length,
    packagingOnlyDifferenceCount: packagingOnly.length,
    modifiedOverlapCount: modifiedOverlaps.length,
    exportOnlyActualAdditionCount: exportOnly.filter((item) => item.bucket === "actual_change").length,
    exportOnlyPackagingCount: exportOnly.filter((item) => item.bucket === "packaging_export_only").length,
    hotfixOnlyActualAbsenceCount: hotfixOnly.filter((item) => item.bucket === "actual_change").length,
    hotfixOnlyPackagingCount: hotfixOnly.filter((item) => item.bucket === "packaging_export_only").length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    currentRepoState: {
      branch: currentBranch,
      head: currentHead,
      headShort: currentHeadShort,
      hotfixBaseCommit: baseCommit,
    },
    normalization: {
      strippedExportPrefix: normalizedExportPrefix,
      hotfixContainerRule: "Strip the first zip-root directory when it starts with PAT-c2acct-live-.",
    },
    bundleSelection: {
      hotfixSet: {
        id: hotfixSet.baseId,
        laterThanProof: null,
        files: hotfixSet.files.map(formatZipFile),
      },
      exportSet: {
        id: exportSet.baseId,
        root: exportSet.root,
        files: exportSet.files.map(formatZipFile),
      },
    },
    counts,
    categoryExamples: {
      actualFileContentChanges: pickExamples(actualChanges),
      packagingExportOnlyDifferences: pickExamples(packagingOnly),
      unchangedOverlaps: pickExamples(unchangedOverlaps.map((item) => ({ relativePath: item.relativePath }))),
    },
    actualFileContentChanges: actualChanges,
    packagingExportOnlyDifferences: packagingOnly,
    unchangedOverlaps: unchangedOverlaps.map((item) => ({
      relativePath: item.relativePath,
      identity: item.hotfix.identity,
      hotfixSegment: item.hotfix.sourceSegment,
      exportSegment: item.export.sourceSegment,
    })),
    onlyInExport: exportOnly,
    onlyInHotfix: hotfixOnly,
    inventoryNotes: {
      hotfixDuplicateEntries: hotfixInventory.duplicateEntries.length,
      hotfixConflictingEntries: hotfixInventory.conflictingEntries,
      exportDuplicateEntries: exportInventory.duplicateEntries.length,
      exportConflictingEntries: exportInventory.conflictingEntries,
      exportExcludeRules: excludeRules,
    },
    patChangeSummary: buildPatChangeSummary(actualChanges),
  };

  const latestHotfixMtime = Math.max(...hotfixSet.files.map((file) => file.mtimeMs));
  const latestExportMtime = Math.max(...exportSet.files.map((file) => file.mtimeMs));
  report.bundleSelection.hotfixSet.laterThanProof = {
    hotfixLatestModifiedAt: isoFromMtime(latestHotfixMtime),
    exportLatestModifiedAt: isoFromMtime(latestExportMtime),
    exportSnapshotIsLater: latestExportMtime > latestHotfixMtime,
  };

  fs.writeFileSync(jsonArtifactPath, `${JSON.stringify(report, null, 2)}\n`);

  const patSummaryLine = report.patChangeSummary.length
    ? report.patChangeSummary.map((item) => `\`${item.bucket}\` (${item.count})`).join(", ")
    : "No actual file/content changes detected.";

  const markdown = [
    "# Export vs Hotfix Diff Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Snapshot Selection",
    "",
    `- Earlier hotfix bundle set: \`${hotfixSet.baseId}\``,
    `- Latest hotfix zip modified at: ${report.bundleSelection.hotfixSet.laterThanProof.hotfixLatestModifiedAt}`,
    `- Newest export bundle set: \`${exportSet.baseId}\``,
    `- Latest export zip modified at: ${report.bundleSelection.hotfixSet.laterThanProof.exportLatestModifiedAt}`,
    `- Export snapshot later than hotfix bundle set: ${report.bundleSelection.hotfixSet.laterThanProof.exportSnapshotIsLater ? "yes" : "no"}`,
    `- Normalized export prefix stripped: \`${normalizedExportPrefix}\``,
    "",
    "## Counts",
    "",
    `- Changed-file count: ${counts.changedFileCount}`,
    `- Only-in-export count: ${counts.onlyInExportCount}`,
    `- Only-in-hotfix count: ${counts.onlyInHotfixCount}`,
    `- Unchanged overlap count: ${counts.unchangedOverlapCount}`,
    `- Packaging/export-only difference count: ${counts.packagingOnlyDifferenceCount}`,
    "",
    "## Category Separation",
    "",
    `- Actual file/content changes: ${actualChanges.length}`,
    `- Packaging/export-only differences: ${packagingOnly.length}`,
    `- Unchanged overlaps: ${unchangedOverlaps.length}`,
    "",
    "## Export-Only Breakdown",
    "",
    `- Genuine current-tree additions: ${counts.exportOnlyActualAdditionCount}`,
    `- Earlier hotfix package omissions: ${counts.exportOnlyPackagingCount}`,
    "",
    "## Hotfix-Only Breakdown",
    "",
    `- Explained by export command or export packaging omission: ${counts.hotfixOnlyPackagingCount}`,
    `- Actual absences from the later current tree/export snapshot: ${counts.hotfixOnlyActualAbsenceCount}`,
    "",
    "## Representative Examples",
    "",
    "### Actual File/Content Changes",
    ...shortExamples(pickExamples(actualChanges)),
    "",
    "### Packaging/Export-Only Differences",
    ...shortExamples(pickExamples(packagingOnly)),
    "",
    "### Unchanged Overlaps",
    ...shortExamples(pickExamples(unchangedOverlaps.map((item) => ({ relativePath: item.relativePath })))),
    "",
    "## PAT Change Summary",
    "",
    `Most actual change volume by path bucket: ${patSummaryLine}`,
    "",
    "## Artifact Paths",
    "",
    `- JSON: \`${jsonArtifactPath}\``,
    `- Markdown: \`${markdownArtifactPath}\``,
  ].join("\n");

  fs.writeFileSync(markdownArtifactPath, `${markdown}\n`);

  process.stdout.write(
    [
      `Wrote ${jsonArtifactPath}`,
      `Wrote ${markdownArtifactPath}`,
      `changed=${counts.changedFileCount}`,
      `onlyInExport=${counts.onlyInExportCount}`,
      `onlyInHotfix=${counts.onlyInHotfixCount}`,
      `unchanged=${counts.unchangedOverlapCount}`,
      `packagingOnly=${counts.packagingOnlyDifferenceCount}`,
    ].join("\n"),
  );
}

main();
