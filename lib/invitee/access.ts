import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { CompanyType } from "@prisma/client";
import { isInviteeSurfacesEnabled } from "@/lib/pilotSurfaces";
import prisma from "@/lib/prisma";

const INVITEE_COOKIE_NAME = "pat_invitee_access";
const INVITEE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

export type InviteeAudience = "vendor" | "firm" | "user";

export type InviteeCodeConfig = {
  code: string;
  label: string;
  audience: InviteeAudience;
  destinationPath: "/vendor" | "/firm" | "/user";
  preloadCompany?: {
    name: string;
    type: CompanyType;
  };
};

export type InviteeAccessContext = {
  label: string;
  audience: InviteeAudience;
  destinationPath: string;
  companyId: string | null;
  companyName: string | null;
  expiresAt: string;
};

const DEFAULT_LOCAL_INVITEE_CODES: InviteeCodeConfig[] = [
  {
    code: "PAT-VENDOR-DEMO",
    label: "Vendor review",
    audience: "vendor",
    destinationPath: "/vendor",
    preloadCompany: {
      name: "PAT Demo Vendor",
      type: CompanyType.VENDOR,
    },
  },
  {
    code: "PAT-FIRM-DEMO",
    label: "Firm review",
    audience: "firm",
    destinationPath: "/firm",
    preloadCompany: {
      name: "PAT Demo Firm",
      type: CompanyType.FIRM,
    },
  },
  {
    code: "PAT-USER-DEMO",
    label: "User review",
    audience: "user",
    destinationPath: "/user",
    preloadCompany: {
      name: "PAT Demo Firm",
      type: CompanyType.FIRM,
    },
  },
] as const;

function cleanEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isInviteeAccessEnabled() {
  return isInviteeSurfacesEnabled() && cleanEnv(process.env.PAT_ENABLE_INVITEE_ACCESS) === "1";
}

function getInviteeSecret() {
  const envSecret =
    cleanEnv(process.env.PAT_INVITEE_SECRET) ??
    cleanEnv(process.env.AUTH_SECRET) ??
    cleanEnv(process.env.NEXTAUTH_SECRET);

  if (envSecret) {
    return envSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "pat-invitee-local-dev-secret";
  }

  return null;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function parseEnvInviteeCodes(): InviteeCodeConfig[] {
  const raw = cleanEnv(process.env.PAT_INVITEE_CODES_JSON);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as InviteeCodeConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getInviteeCodeConfigs() {
  return [...DEFAULT_LOCAL_INVITEE_CODES, ...parseEnvInviteeCodes()];
}

export async function resolveInviteeCode(code: string) {
  if (!isInviteeAccessEnabled()) {
    return { ok: false as const, error: "disabled" as const };
  }

  const entry = getInviteeCodeConfigs().find((candidate) => normalizeCode(candidate.code) === normalizeCode(code));
  if (!entry) {
    return { ok: false as const, error: "invalid_code" as const };
  }

  let companyId: string | null = null;
  let companyName: string | null = null;

  if (entry.preloadCompany) {
    const id = `${entry.preloadCompany.type.toLowerCase()}:${entry.preloadCompany.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const company = await prisma.company.upsert({
      where: { id },
      update: {
        name: entry.preloadCompany.name,
        type: entry.preloadCompany.type,
        updatedAt: new Date(),
      },
      create: {
        id,
        name: entry.preloadCompany.name,
        type: entry.preloadCompany.type,
        updatedAt: new Date(),
      },
      select: { id: true, name: true },
    }).catch(() => null);

    companyId = company?.id ?? null;
    companyName = company?.name ?? entry.preloadCompany.name;
  }

  return {
    ok: true as const,
    context: {
      label: entry.label,
      audience: entry.audience,
      destinationPath: entry.destinationPath,
      companyId,
      companyName,
      expiresAt: new Date(Date.now() + INVITEE_COOKIE_MAX_AGE_SECONDS * 1000).toISOString(),
    } satisfies InviteeAccessContext,
  };
}

function signInviteePayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function encodeInviteeCookie(context: InviteeAccessContext, secret: string) {
  const payload = Buffer.from(JSON.stringify(context), "utf8").toString("base64url");
  const signature = signInviteePayload(payload, secret);
  return `${payload}.${signature}`;
}

function decodeInviteeCookie(value: string, secret: string): InviteeAccessContext | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signInviteePayload(payload, secret);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as InviteeAccessContext;
    if (!parsed.expiresAt || Date.parse(parsed.expiresAt) <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setInviteeAccessCookie(context: InviteeAccessContext) {
  const secret = getInviteeSecret();
  if (!secret) {
    throw new Error("Invitee secret is not configured");
  }

  const cookieJar = await cookies();
  cookieJar.set(INVITEE_COOKIE_NAME, encodeInviteeCookie(context, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INVITEE_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function getInviteeAccessContext() {
  const secret = getInviteeSecret();
  if (!secret) {
    return null;
  }

  const cookieJar = await cookies();
  const raw = cookieJar.get(INVITEE_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }

  return decodeInviteeCookie(raw, secret);
}
