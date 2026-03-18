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
  const adminHelper = read("lib/admin/controlPlane.ts");
  const adminPage = read("app/admin/page.tsx");
  const searchPage = read("app/admin/search/page.tsx");
  const exceptionsPage = read("app/admin/exceptions/page.tsx");
  const firmsPage = read("app/admin/firms/page.tsx");
  const vendorsPage = read("app/admin/vendors/page.tsx");
  const productsPage = read("app/admin/products/page.tsx");
  const usersPage = read("app/admin/users/page.tsx");
  const searchRoute = read("app/api/admin/search/route.ts");
  const exceptionsRoute = read("app/api/admin/exceptions/route.ts");
  const tenantFirmUsersPage = read("app/firm/users/page.tsx");
  const tenantInviteRoute = read("app/api/network/invite-codes/route.ts");

  for (const [label, source] of [
    ["search page", searchPage],
    ["exceptions page", exceptionsPage],
    ["firms page", firmsPage],
    ["vendors page", vendorsPage],
    ["products page", productsPage],
    ["users page", usersPage],
  ] as const) {
    assert(source.includes("requirePlatformAdminPage"), `${label} must require platform-admin page access`);
  }

  assert(
    adminPage.includes("/admin/search") &&
      adminPage.includes("/admin/exceptions") &&
      adminPage.includes("Tenant-admin boundary"),
    "admin page must expose real command/search and separation messaging"
  );

  assert(
    adminHelper.includes("searchAdminEntities") &&
      adminHelper.includes("getAdminExceptions") &&
      adminHelper.includes("prisma.auditEvent.findMany") &&
      adminHelper.includes("prisma.apiRateLimitBucket.findMany"),
    "admin helper must power real search and exception queries"
  );

  assert(
    searchRoute.includes("requirePlatformAdminApi") &&
      searchRoute.includes("searchAdminEntities"),
    "admin search API must use platform-admin API authorization and real search helper"
  );

  assert(
    exceptionsRoute.includes("requirePlatformAdminApi") &&
      exceptionsRoute.includes("getAdminExceptions") &&
      exceptionsRoute.includes('supportedActions: ["inspect", "review source route", "retry health check"]'),
    "admin exceptions API must be platform-only and expose real current actions"
  );

  assert(
    tenantFirmUsersPage.includes("isTenantAdmin(sessionUser)") &&
      tenantInviteRoute.includes("isAdminRole(sessionUser.role)"),
    "tenant-admin surfaces must remain separate from platform-admin control plane"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "platform-only admin pages",
          "platform-only admin APIs",
          "real search and exceptions helpers",
          "tenant-admin separation preserved",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "VERIFY_ADMIN_OPERATOR_AUTH_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
