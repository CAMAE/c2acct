import { UserRole, type CompanyType } from "@prisma/client";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { canAccessPortalAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/auth/session";
import { sendFirmUserInviteEmail } from "@/lib/transactionalEmail";
import { getFirmManagedUserRecords } from "@/lib/userPat";

export const FIRM_ACCESS_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const satisfies readonly UserRole[];

export const FirmAdminUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.email("Enter a valid work email.").transform((value) => value.trim().toLowerCase()),
  phone: z.string().trim().min(1, "Phone is required."),
  title: z.string().trim().min(1, "Title is required."),
  role: z.enum(FIRM_ACCESS_ROLES, { error: "Select a valid PAT access role." }),
  department: z.string().trim().optional().default(""),
  onboardingNote: z.string().trim().optional().default(""),
});

export type FirmAdminUserInput = z.infer<typeof FirmAdminUserSchema>;

export type FirmAdminManagedUser = Awaited<ReturnType<typeof getFirmManagedAccessUsers>>[number];

export function normalizeFirmAdminUserInput(formData: FormData) {
  return FirmAdminUserSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    title: String(formData.get("title") ?? ""),
    role: String(formData.get("role") ?? ""),
    department: String(formData.get("department") ?? ""),
    onboardingNote: String(formData.get("onboardingNote") ?? ""),
  });
}

export function getFirmAdminUserConflictMessage(existingCompanyId: string | null, currentCompanyId: string) {
  if (existingCompanyId === currentCompanyId) {
    return "A PAT access user with this email already exists for the firm. Use Existing Users to update role or profile details.";
  }

  if (existingCompanyId) {
    return "This email is already attached to another company account and cannot be reused here.";
  }

  return "This email already exists in PAT and must be reviewed before assigning firm access here.";
}

export async function requireFirmAdminActor(sessionUser: SessionUser | null | undefined) {
  if (!sessionUser?.companyId || !canAccessPortalAdmin(sessionUser)) {
    return null;
  }

  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: { id: true, name: true, type: true },
  }).catch(() => null);

  if (!company || company.type !== ("FIRM" satisfies CompanyType)) {
    return null;
  }

  return company;
}

export async function getFirmManagedAccessUsers(companyId: string, search: string | null) {
  const [records, users] = await Promise.all([
    getFirmManagedUserRecords(companyId, search),
    prisma.user.findMany({
      where: {
        companyId,
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
                { Profile: { title: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ role: "asc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        Profile: {
          select: {
            phone: true,
            title: true,
            department: true,
            onboardingNote: true,
          },
        },
      },
    }),
  ]);

  const recordById = new Map(records.map((record) => [record.id, record]));

  return users.map((user) => {
    const record = recordById.get(user.id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: record?.status ?? "invited",
      phone: user.Profile?.phone ?? null,
      title: user.Profile?.title ?? null,
      department: user.Profile?.department ?? null,
      onboardingNote: user.Profile?.onboardingNote ?? null,
      assessmentProgress: record?.assessmentProgress ?? "No person-level PAT submissions yet",
      latestScore: record?.latestScore ?? null,
      latestSubmittedAt: record?.latestSubmittedAt ?? null,
      subjectMembershipReady: record?.subjectMembershipReady ?? false,
    };
  });
}

export async function createFirmManagedUser(companyId: string, input: FirmAdminUserInput) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  }).catch(() => null);
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, companyId: true },
  });

  if (existing) {
    return {
      ok: false as const,
      error: getFirmAdminUserConflictMessage(existing.companyId, companyId),
    };
  }

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role,
      companyId,
      updatedAt: new Date(),
      Profile: {
        create: {
          id: randomUUID(),
          phone: input.phone,
          title: input.title,
          department: input.department || null,
          onboardingNote: input.onboardingNote || null,
        },
      },
    },
    select: { id: true },
  });

  await sendFirmUserInviteEmail({
    toEmail: input.email,
    recipientName: input.name,
    firmName: company?.name ?? "your firm",
    role: input.role,
    title: input.title,
    onboardingNote: input.onboardingNote || null,
  });

  return { ok: true as const, userId: user.id };
}

export async function updateFirmManagedUserRole(input: {
  companyId: string;
  userId: string;
  role: UserRole;
}) {
  await prisma.user.updateMany({
    where: {
      id: input.userId,
      companyId: input.companyId,
    },
    data: {
      role: input.role,
      updatedAt: new Date(),
    },
  });
}
