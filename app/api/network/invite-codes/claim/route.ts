import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { resolveVisibilityContext } from "@/lib/visibility";
import {
  getInviteTerminalState,
  hashInviteCode,
  isInviteClaimSatisfied,
} from "@/lib/network/inviteCodes";
import { recordAuditEvent, toAuditDetailValue } from "@/lib/ops/auditEvents";
import { consumeDbRateLimit, getRequestClientIp } from "@/lib/ops/rateLimit";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const INVITE_CLAIM_WINDOW_MS = 60_000;
const INVITE_CLAIM_MAX_REQUESTS_PER_WINDOW = 12;

const ClaimInviteCodeSchema = z
  .object({
    code: z.string().trim().min(1),
  })
  .strict();

export async function POST(req: Request) {
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

  if (currentCompany.type !== "FIRM") {
    return forbiddenResponse("Only firm companies can claim sponsor invite codes");
  }

  const clientIp = getRequestClientIp(req);
  const quota = await consumeDbRateLimit({
    bucketKey: `invite-code-claim:${sessionUser.id}:${currentCompany.id}:${clientIp}`,
    limit: INVITE_CLAIM_MAX_REQUESTS_PER_WINDOW,
    windowMs: INVITE_CLAIM_WINDOW_MS,
  });
  if (!quota.allowed) {
    await recordAuditEvent({
      eventKey: "invite_code.claim.rate_limited",
      eventCategory: "RATE_LIMIT",
      outcome: "BLOCKED",
      severity: "WARN",
      actorUserId: sessionUser.id,
      actorCompanyId: currentCompany.id,
      subjectCompanyId: currentCompany.id,
      requestPath: "/api/network/invite-codes/claim",
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const parsed = ClaimInviteCodeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const now = new Date();
  const hashedCode = hashInviteCode(parsed.data.code);

  const claimResult = await prisma.$transaction(async (tx) => {
    const inviteCode = await tx.inviteCode.findUnique({
      where: { codeHash: hashedCode },
      select: {
        id: true,
        vendorCompanyId: true,
        status: true,
        expiresAt: true,
        maxClaims: true,
        claimCount: true,
        launchMode: true,
        productAccessMode: true,
        createdByUserId: true,
      },
    });

    if (!inviteCode) {
      return { ok: false as const, status: 404 as const, error: "Invite code not found" };
    }

    const existingRelationship = await tx.sponsorRelationship.findUnique({
      where: {
        vendorCompanyId_firmCompanyId: {
          vendorCompanyId: inviteCode.vendorCompanyId,
          firmCompanyId: currentCompany.id,
        },
      },
      select: {
        id: true,
        status: true,
        launchMode: true,
        productAccessMode: true,
      },
    });

    const terminalState = getInviteTerminalState(inviteCode, now);
    const claimAlreadySatisfied = isInviteClaimSatisfied({
      existingRelationship,
      inviteCode,
    });

    if (terminalState === "REVOKED") {
      return { ok: false as const, status: 403 as const, error: "Invite code has been revoked" };
    }

    if (terminalState === "EXPIRED") {
      await tx.inviteCode.updateMany({
        where: { id: inviteCode.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });
      return { ok: false as const, status: 403 as const, error: "Invite code has expired" };
    }

    if (claimAlreadySatisfied) {
      const satisfiedRelationship = existingRelationship!;
      const inviteCodeRow = await tx.inviteCode.findUniqueOrThrow({
        where: { id: inviteCode.id },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          maxClaims: true,
          claimCount: true,
          launchMode: true,
          productAccessMode: true,
        },
      });

      return {
        ok: true as const,
        inviteCode: inviteCodeRow,
        sponsorRelationship: {
          id: satisfiedRelationship.id,
          vendorCompanyId: inviteCode.vendorCompanyId,
          firmCompanyId: currentCompany.id,
          status: satisfiedRelationship.status,
          launchMode: satisfiedRelationship.launchMode,
          productAccessMode: satisfiedRelationship.productAccessMode,
        },
        consumedClaim: false,
      };
    }

    if (terminalState === "EXHAUSTED") {
      await tx.inviteCode.updateMany({
        where: { id: inviteCode.id, status: "ACTIVE" },
        data: { status: "EXHAUSTED" },
      });
      return { ok: false as const, status: 403 as const, error: "Invite code is no longer claimable" };
    }

    const consumedClaim = await tx.inviteCode.updateMany({
      where: {
        id: inviteCode.id,
        status: "ACTIVE",
        claimCount: inviteCode.claimCount,
      },
      data: {
        claimCount: { increment: 1 },
        status: inviteCode.claimCount + 1 >= inviteCode.maxClaims ? "EXHAUSTED" : "ACTIVE",
      },
    });

    if (consumedClaim.count !== 1) {
      const latestInviteCode = await tx.inviteCode.findUniqueOrThrow({
        where: { id: inviteCode.id },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          maxClaims: true,
          claimCount: true,
          launchMode: true,
          productAccessMode: true,
        },
      });

      const latestRelationship = await tx.sponsorRelationship.findUnique({
        where: {
          vendorCompanyId_firmCompanyId: {
            vendorCompanyId: inviteCode.vendorCompanyId,
            firmCompanyId: currentCompany.id,
          },
        },
        select: {
          id: true,
          status: true,
          launchMode: true,
          productAccessMode: true,
        },
      });

      if (
        latestRelationship &&
        isInviteClaimSatisfied({
          existingRelationship: latestRelationship,
          inviteCode: latestInviteCode,
        })
      ) {
        return {
          ok: true as const,
          inviteCode: latestInviteCode,
          sponsorRelationship: {
            id: latestRelationship.id,
            vendorCompanyId: inviteCode.vendorCompanyId,
            firmCompanyId: currentCompany.id,
            status: latestRelationship.status,
            launchMode: latestRelationship.launchMode,
            productAccessMode: latestRelationship.productAccessMode,
          },
          consumedClaim: false,
        };
      }

      return { ok: false as const, status: 403 as const, error: "Invite code is no longer claimable" };
    }

    const sponsorRelationship = await tx.sponsorRelationship.upsert({
      where: {
        vendorCompanyId_firmCompanyId: {
          vendorCompanyId: inviteCode.vendorCompanyId,
          firmCompanyId: currentCompany.id,
        },
      },
      update: {
        status: "ACTIVE",
        launchMode: inviteCode.launchMode,
        productAccessMode: inviteCode.productAccessMode,
      },
      create: {
        id: randomUUID(),
        vendorCompanyId: inviteCode.vendorCompanyId,
        firmCompanyId: currentCompany.id,
        status: "ACTIVE",
        launchMode: inviteCode.launchMode,
        productAccessMode: inviteCode.productAccessMode,
        createdByUserId: inviteCode.createdByUserId,
      },
      select: {
        id: true,
        vendorCompanyId: true,
        firmCompanyId: true,
        status: true,
        launchMode: true,
        productAccessMode: true,
      },
    });

    const inviteCodeRow = await tx.inviteCode.findUniqueOrThrow({
      where: { id: inviteCode.id },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        maxClaims: true,
        claimCount: true,
        launchMode: true,
        productAccessMode: true,
      },
    });

    return {
      ok: true as const,
      inviteCode: inviteCodeRow,
      sponsorRelationship,
      consumedClaim: true,
    };
  });

  if (!claimResult.ok) {
    await recordAuditEvent({
      eventKey: "invite_code.claim.rejected",
      eventCategory: "NETWORK",
      outcome: claimResult.error,
      severity: "WARN",
      actorUserId: sessionUser.id,
      actorCompanyId: currentCompany.id,
      subjectCompanyId: currentCompany.id,
      requestPath: "/api/network/invite-codes/claim",
      requestMethod: "POST",
    });
    return NextResponse.json(
      { ok: false, error: claimResult.error },
      { status: claimResult.status, headers: NO_STORE_HEADERS }
    );
  }

  const { ok: _ok, ...claimPayload } = claimResult;
  void _ok;
  await recordAuditEvent({
    eventKey: "invite_code.claim.accepted",
    eventCategory: "NETWORK",
    outcome: "ACCEPTED",
    actorUserId: sessionUser.id,
    actorCompanyId: currentCompany.id,
    subjectCompanyId: currentCompany.id,
    requestPath: "/api/network/invite-codes/claim",
    requestMethod: "POST",
    details: toAuditDetailValue({
      sponsorRelationshipId: claimPayload.sponsorRelationship.id,
      vendorCompanyId: claimPayload.sponsorRelationship.vendorCompanyId,
      consumedClaim: claimPayload.consumedClaim,
      inviteCodeId: claimPayload.inviteCode.id,
    }),
  });
  return NextResponse.json({ ok: true, ...claimPayload }, { headers: NO_STORE_HEADERS });
}
