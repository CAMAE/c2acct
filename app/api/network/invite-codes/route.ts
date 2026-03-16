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

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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
