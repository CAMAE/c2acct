import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function main() {
  const reportProfiles = fs.readFileSync(path.join(process.cwd(), "lib/report-profiles.ts"), "utf8");

  if (!reportProfiles.includes('key: "firm_baseline_report"')) {
    fail("firm_baseline_report is missing");
  }
  if (!reportProfiles.includes('primaryModuleKey:\n      getPrimaryReportingModuleForProfile("firm_baseline_report")?.key ?? ""')) {
    fail("firm_baseline_report primary module is no longer derived from the module catalog");
  }
  if (!reportProfiles.includes('key: "product_baseline_report"')) {
    fail("product_baseline_report is missing");
  }
  if (!reportProfiles.includes('key: "product_intelligence_report"')) {
    fail("product_intelligence_report is missing");
  }
  if (!reportProfiles.includes('supportedAxes: ["SELF", "EXTERNAL_REVIEW"]')) {
    fail("Product report profiles must support both SELF and EXTERNAL_REVIEW");
  }
  if (!reportProfiles.includes('intelligenceProfileKey: "product_intelligence"')) {
    fail("product_intelligence report profile drifted");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "firm_baseline_report",
          "product_baseline_report",
          "product_intelligence_report",
        ],
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
    "VERIFY_REPORT_PROFILES_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
