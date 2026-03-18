import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, isAdminRole, unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { resolveVisibilityContext } from "@/lib/visibility";
import {
  DEFAULT_INVITE_MAX_CLAIMS,
  generateInviteCode,
  getDefaultInviteExpiry,
  hashInviteCode,
} from "@/lib/network/inviteCodes";
import { recordAuditEvent, toAuditDetailValue } from "@/lib/ops/auditEvents";
import { consumeDbRateLimit, getRequestClientIp } from "@/lib/ops/rateLimit";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const INVITE_CREATE_WINDOW_MS = 60_000;
const INVITE_CREATE_MAX_REQUESTS_PER_WINDOW = 6;

const CreateInviteCodeSchema = z
  .object({
    expiresAt: z.string().datetime().optional(),
    maxClaims: z.number().int().positive().max(100).optional(),
    launchMode: z.enum(["PRIVATE_LAUNCH"]).optional(),
    productAccessMode: z.enum(["NONE", "ALL_PRODUCTS"]).optional(),
  })
  .strict();

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const preferredCompanyId = await resolvePreferredViewerCompanyId();
  const visibilityContext = await resolveVisibilityContext({
    sessionUser,
    preferredCompanyId,
  });

  if (!visibilityContext?.currentCompany) {
    return forbiddenResponse("No company assigned");
  }
  const currentCompany = visibilityContext.currentCompany;

  if (currentCompany.type !== "VENDOR") {
    return forbiddenResponse("Only vendor companies can manage invite codes");
  }

  const inviteCodes = await prisma.inviteCode.findMany({
    where: { vendorCompanyId: currentCompany.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      maxClaims: true,
      claimCount: true,
      launchMode: true,
      productAccessMode: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, inviteCodes }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  if (!isAdminRole(sessionUser.role)) {
    return forbiddenResponse("Only company admins can create invite codes");
  }

  const preferredCompanyId = await resolvePreferredViewerCompanyId();
  const visibilityContext = await resolveVisibilityContext({
    sessionUser,
    preferredCompanyId,
  });

  if (!visibilityContext?.currentCompany) {
    return forbiddenResponse("No company assigned");
  }
  const currentCompany = visibilityContext.currentCompany;

  if (currentCompany.type !== "VENDOR") {
    return forbiddenResponse("Only vendor companies can create invite codes");
  }

  const clientIp = getRequestClientIp(req);
  const quota = await consumeDbRateLimit({
    bucketKey: `invite-code-create:${sessionUser.id}:${currentCompany.id}:${clientIp}`,
    limit: INVITE_CREATE_MAX_REQUESTS_PER_WINDOW,
    windowMs: INVITE_CREATE_WINDOW_MS,
  });
  if (!quota.allowed) {
    await recordAuditEvent({
      eventKey: "invite_code.create.rate_limited",
      eventCategory: "RATE_LIMIT",
      outcome: "BLOCKED",
      severity: "WARN",
      actorUserId: sessionUser.id,
      actorCompanyId: currentCompany.id,
      subjectCompanyId: currentCompany.id,
      requestPath: "/api/network/invite-codes",
      requestMethod: "POST",
      details: toAuditDetailValue({
        clientIp,
        requestCount: quota.requestCount,
        retryAfterSeconds: quota.retryAfterSeconds,
      }),
    });
    return NextResponse.json(
      { ok: false, error: "Too many requests", retryAfterSeconds: quota.retryAfterSeconds },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(quota.retryAfterSeconds),
        },
      }
    );
  }

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }

  const parsed = CreateInviteCodeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const plaintextCode = generateInviteCode();
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : getDefaultInviteExpiry();
  const inviteCode = await prisma.inviteCode.create({
    data: {
      id: randomUUID(),
      vendorCompanyId: currentCompany.id,
      codeHash: hashInviteCode(plaintextCode),
      status: "ACTIVE",
      expiresAt,
      maxClaims: parsed.data.maxClaims ?? DEFAULT_INVITE_MAX_CLAIMS,
      claimCount: 0,
      launchMode: parsed.data.launchMode ?? "PRIVATE_LAUNCH",
      productAccessMode: parsed.data.productAccessMode ?? "ALL_PRODUCTS",
      createdByUserId: sessionUser.id,
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      maxClaims: true,
      claimCount: true,
      launchMode: true,
      productAccessMode: true,
      createdAt: true,
    },
  });

  await recordAuditEvent({
    eventKey: "invite_code.create.accepted",
    eventCategory: "NETWORK",
    outcome: "ACCEPTED",
    actorUserId: sessionUser.id,
    actorCompanyId: currentCompany.id,
    subjectCompanyId: currentCompany.id,
    requestPath: "/api/network/invite-codes",
    requestMethod: "POST",
    details: toAuditDetailValue({
      inviteCodeId: inviteCode.id,
      maxClaims: inviteCode.maxClaims,
      productAccessMode: inviteCode.productAccessMode,
    }),
  });

  return NextResponse.json(
    {
      ok: true,
      inviteCode: {
        ...inviteCode,
        code: plaintextCode,
      },
    },
    { status: 201, headers: NO_STORE_HEADERS }
  );
}
