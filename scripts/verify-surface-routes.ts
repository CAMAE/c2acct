import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const requiredFiles = [
    "app/layout.tsx",
    "app/firm/page.tsx",
    "app/vendor/page.tsx",
    "app/user/page.tsx",
    "app/badges/page.tsx",
    "app/briefs/executive/page.tsx",
    "app/firm/insights/page.tsx",
    "app/vendor/insights/page.tsx",
    "app/user/insights/page.tsx",
    "app/firm/modules/page.tsx",
    "app/vendor/modules/page.tsx",
    "app/user/modules/page.tsx",
  ];

  for (const file of requiredFiles) {
    assert(fs.existsSync(path.join(process.cwd(), file)), `Missing surface route file: ${file}`);
  }

  const layout = read("app/layout.tsx");
  const firmHome = read("app/firm/page.tsx");
  const vendorHome = read("app/vendor/page.tsx");
  const userHome = read("app/user/page.tsx");
  const badges = read("app/badges/page.tsx");
  const brief = read("app/briefs/executive/page.tsx");
  const firmInsights = read("app/firm/insights/page.tsx");
  const vendorInsights = read("app/vendor/insights/page.tsx");
  const userInsights = read("app/user/insights/page.tsx");
  const firmModules = read("app/firm/modules/page.tsx");
  const vendorModules = read("app/vendor/modules/page.tsx");
  const userModules = read("app/user/modules/page.tsx");
  const surveyModulePage = read("app/survey/[key]/page.tsx");
  const reviewModulePage = read("app/reviews/[moduleKey]/page.tsx");

  for (const href of [
    "/firm/insights",
    "/vendor/insights",
    "/user/insights",
    "/firm/modules",
    "/vendor/modules",
    "/user/modules",
    "/user/learning",
  ]) {
    assert(layout.includes(href), `Global nav must include ${href}`);
  }

  assert(firmHome.includes("/firm/insights") && firmHome.includes("/firm/modules"), "Firm home must link to insight and module overview pages");
  assert(vendorHome.includes("/vendor/insights") && vendorHome.includes("/vendor/modules"), "Vendor home must link to insight and module overview pages");
  assert(userHome.includes("/user/insights") && userHome.includes("/user/modules"), "User home must link to insight and module overview pages");

  assert(badges.includes("Tier 1") && badges.includes("Coming soon"), "Badges page must clearly distinguish Tier 1 live from Tier 2 coming soon");
  assert(brief.includes("internal professional-learning runtime") && brief.includes("Still missing"), "Executive brief must reflect current repo truth");

  assert(firmInsights.includes("Tier 1") && firmInsights.includes("/outputs"), "Firm insights page must expose Tier 1 entry points");
  assert(
    vendorInsights.includes("/products") &&
      (vendorInsights.includes("Observed signal") || vendorInsights.includes("observed signal")),
    "Vendor insights page must connect to canonical product intelligence routes"
  );
  assert(userInsights.includes("/user/learning") && userInsights.includes("/badges"), "User insights page must connect to real user-runtime and badge surfaces");

  assert(firmModules.includes("/survey") && firmModules.includes("/user/learning"), "Firm modules page must connect assessment and learning surfaces");
  assert(vendorModules.includes("/survey") && vendorModules.includes("/reviews"), "Vendor modules page must connect self-assessment and external-review surfaces");
  assert(userModules.includes("/user/learning") && userModules.includes("/survey"), "User modules page must connect learning and current assessment surfaces");

  assert(surveyModulePage.includes("const QUESTIONS_PER_PAGE = 5"), "Survey runtime must retain 5-question paging");
  assert(reviewModulePage.includes("const QUESTIONS_PER_PAGE = 5"), "Review runtime must retain 5-question paging");

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "global nav includes the new role-aware insight and module routes",
          "firm, vendor, and user homepages link to coherent overview surfaces",
          "badge and executive brief pages reflect current Tier 1 / Tier 2 and build truth",
          "assessment and review paging remain at five questions per page",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("VERIFY_SURFACE_ROUTES_ERROR", error instanceof Error ? error.message : error);
  process.exit(1);
});
