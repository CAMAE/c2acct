import {
  ASSESSMENT_MODULE_CATALOG,
  type AssessmentModuleCatalogEntry,
} from "../lib/assessment-module-catalog";

function fail(message: string): never {
  throw new Error(message);
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function assertEntryShape(entry: AssessmentModuleCatalogEntry) {
  if (isBlank(entry.key)) {
    fail("Catalog entry is missing key");
  }
  if (isBlank(entry.title)) {
    fail(`Catalog entry ${entry.key} is missing title`);
  }
  if (isBlank(entry.reportProfileKey)) {
    fail(`Catalog entry ${entry.key} is missing reportProfileKey`);
  }
  if (isBlank(entry.intelligenceProfileKey)) {
    fail(`Catalog entry ${entry.key} is missing intelligenceProfileKey`);
  }
  if (!Number.isInteger(entry.displayOrder)) {
    fail(`Catalog entry ${entry.key} has non-integer displayOrder`);
  }
  if (entry.activationState === "LIVE" && !entry.isUserFacing) {
    fail(`LIVE catalog entry ${entry.key} must be user-facing in the current runtime model`);
  }
  if (entry.activationState === "BETA" && !entry.isUserFacing) {
    fail(`BETA catalog entry ${entry.key} must be user-facing in the current runtime model`);
  }
}

function main() {
  const seenKeys = new Set<string>();
  const primaryByProfile = new Map<string, AssessmentModuleCatalogEntry>();

  for (const entry of ASSESSMENT_MODULE_CATALOG) {
    assertEntryShape(entry);

    if (seenKeys.has(entry.key)) {
      fail(`Duplicate module key in catalog: ${entry.key}`);
    }
    seenKeys.add(entry.key);

    if (entry.reportingRole !== "PRIMARY_REPORTING") {
      continue;
    }

    const existing = primaryByProfile.get(entry.reportProfileKey);
    if (existing) {
      fail(
        `Multiple PRIMARY_REPORTING modules for profile ${entry.reportProfileKey}: ${existing.key}, ${entry.key}`
      );
    }

    primaryByProfile.set(entry.reportProfileKey, entry);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        moduleCount: ASSESSMENT_MODULE_CATALOG.length,
        primaryReportingProfiles: Array.from(primaryByProfile.entries()).map(([profile, entry]) => ({
          profile,
          key: entry.key,
        })),
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(
    "VERIFY_ASSESSMENT_MODULE_CATALOG_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
