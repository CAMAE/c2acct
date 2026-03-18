import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "research/accounting-accreditation-cpe-sourcebook.md",
  "research/accounting-fields-of-study-matrix.md",
  "research/state-board-cpe-requirements-matrix.md",
  "research/aacsb-and-university-learning-design-notes.md",
  "research/gamification-and-engagement-sourcebook.md",
  "research/vendor-module-research-sourcebook.md",
  "research/firm-module-research-sourcebook.md",
  "research/user-accreditation-module-sourcebook.md",
  "research/masterwater-ethical-translation-for-learning.md",
  "research/masterwater-direct-notes.md",
  "research/mac-mini-automation-ops-notes.md",
  "research/SOURCE_MANIFEST.md",
  "research/RESEARCH_GAPS_AND_LIMITS.md",
];

const officialFiles = new Map([
  ["research/accounting-accreditation-cpe-sourcebook.md", ["nasbaregistry.org", "aacsb.edu", ".gov"]],
  ["research/accounting-fields-of-study-matrix.md", ["nasbaregistry.org"]],
  ["research/state-board-cpe-requirements-matrix.md", [".gov", "myfloridalicense.com", "tsbpa.texas.gov", "dca.ca.gov"]],
  ["research/mac-mini-automation-ops-notes.md", ["developer.apple.com"]],
]);

const minUrlCounts = new Map([
  ["research/accounting-accreditation-cpe-sourcebook.md", 12],
  ["research/accounting-fields-of-study-matrix.md", 4],
  ["research/state-board-cpe-requirements-matrix.md", 6],
  ["research/aacsb-and-university-learning-design-notes.md", 6],
  ["research/gamification-and-engagement-sourcebook.md", 8],
  ["research/vendor-module-research-sourcebook.md", 8],
  ["research/firm-module-research-sourcebook.md", 7],
  ["research/user-accreditation-module-sourcebook.md", 10],
  ["research/mac-mini-automation-ops-notes.md", 3],
  ["research/SOURCE_MANIFEST.md", 20],
]);

const errors = [];
const summary = [];

for (const rel of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Missing file: ${rel}`);
    continue;
  }

  const text = fs.readFileSync(full, "utf8");
  const urls = [...text.matchAll(/https?:\/\/[^\s)>\]]+/g)].map((m) => m[0]);
  const hasAccessed = /Accessed:\s*20\d\d-\d\d-\d\d/i.test(text);
  const hasLocalArtifact = /C:\\Users\\camer\\/i.test(text);

  if (!hasAccessed) {
    errors.push(`Missing accessed date: ${rel}`);
  }

  if (urls.length === 0 && !hasLocalArtifact) {
    errors.push(`No citations or local artifact reference: ${rel}`);
  }

  const minCount = minUrlCounts.get(rel);
  if (typeof minCount === "number" && urls.length < minCount) {
    errors.push(`Too few URLs in ${rel}: found ${urls.length}, expected at least ${minCount}`);
  }

  const officialDomains = officialFiles.get(rel);
  if (officialDomains) {
    for (const domain of officialDomains) {
      if (!text.includes(domain)) {
        errors.push(`Expected official domain ${domain} in ${rel}`);
      }
    }
  }

  summary.push({ rel, urlCount: urls.length, hasLocalArtifact });
}

for (const rel of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/approved CPE|approved for CPE/i.test(line)) {
      if (!/\b(no|not|cannot|unsupported|do not)\b/i.test(line)) {
        errors.push(`Unsupported approved-CPE language in ${rel}:${index + 1}`);
      }
    }
  });
}

if (errors.length > 0) {
  console.error("Research corpus verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Research corpus verification passed.");
for (const item of summary) {
  console.log(`${item.rel}: urls=${item.urlCount}${item.hasLocalArtifact ? " local-artifact=yes" : ""}`);
}
