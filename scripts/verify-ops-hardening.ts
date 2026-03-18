import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertIncludes(source: string, pattern: string, message: string) {
  if (!source.includes(pattern)) {
    fail(message);
  }
}

function main() {
  const schema = read("prisma/schema.prisma");
  const surveySubmit = read("app/api/survey/submit/route.ts");
  const reviewSubmit = read("app/api/external-reviews/submit/route.ts");
  const inviteCreate = read("app/api/network/invite-codes/route.ts");
  const inviteClaim = read("app/api/network/invite-codes/claim/route.ts");
  const adminPage = read("app/admin/page.tsx");

  assertIncludes(schema, "model ApiRateLimitBucket", "ApiRateLimitBucket model missing from schema");
  assertIncludes(schema, "model AuditEvent", "AuditEvent model missing from schema");

  assertIncludes(surveySubmit, "consumeDbRateLimit", "survey submit route must use DB-backed rate limiting");
  assertIncludes(surveySubmit, "recordAuditEvent", "survey submit route must emit audit events");

  assertIncludes(reviewSubmit, "consumeDbRateLimit", "external review submit route must use DB-backed rate limiting");
  assertIncludes(reviewSubmit, "recordAuditEvent", "external review submit route must emit audit events");

  assertIncludes(inviteCreate, "consumeDbRateLimit", "invite create route must use DB-backed rate limiting");
  assertIncludes(inviteCreate, "recordAuditEvent", "invite create route must emit audit events");

  assertIncludes(inviteClaim, "consumeDbRateLimit", "invite claim route must use DB-backed rate limiting");
  assertIncludes(inviteClaim, "recordAuditEvent", "invite claim route must emit audit events");

  assertIncludes(adminPage, "Admin Operating Center", "admin page must expose operator surface");
  assertIncludes(adminPage, "Recent Audit Events", "admin page must expose audit-event visibility");

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "db-backed rate-limit primitives",
          "structured audit-event capture",
          "operator event visibility",
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
  console.error("VERIFY_OPS_HARDENING_ERROR", error instanceof Error ? error.message : error);
  process.exit(1);
}
