"use server";

import { randomUUID } from "crypto";
import {
  CompanyType,
  MembershipPlan,
  MembershipStatus,
  ModuleScope,
  ProductCapabilityCoverage,
  ProductTaxonomyFit,
  QuestionInputType,
  ResearchConfidence,
  SubjectKind,
  TaxonomyBucketKind,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessPortalAdmin } from "@/lib/authz";
import { recordOperatorAuditEvent } from "@/lib/operatorAudit";
import { hashPilotPassword, isSupportedPasswordHash, validatePilotPassword } from "@/lib/auth/passwords";
import { provisionOrganizationAccount } from "@/lib/provisioning/account";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getEmail(formData: FormData, key: string) {
  return getString(formData, key).toLowerCase();
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value === "" || value === "__none__" ? null : value;
}

function getBoolean(formData: FormData, key: string) {
  return getString(formData, key) === "on";
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function getReturnTo(formData: FormData, fallback: string) {
  return getString(formData, "returnTo") || fallback;
}

async function requireAdminActor() {
  const actor = await getSessionUser();
  if (!actor) {
    redirect(buildCanonicalSignInPath({ callbackUrl: "/admin", view: "admin" }));
  }

  if (!canAccessPortalAdmin(actor)) {
    redirect("/admin");
  }

  return actor;
}

async function ensureCompanySubject(
  companyId: string,
  companyName: string,
  client: Pick<typeof prisma, "subject"> = prisma
) {
  return client.subject.upsert({
    where: { companyId },
    update: {
      displayName: companyName,
      kind: SubjectKind.ORGANIZATION,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      key: `company:${companyId}`,
      displayName: companyName,
      kind: SubjectKind.ORGANIZATION,
      companyId,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
}

async function ensurePersonSubject(
  userId: string,
  email: string,
  client: Pick<typeof prisma, "subject"> = prisma
) {
  return client.subject.upsert({
    where: { key: `person:${userId}` },
    update: {
      displayName: email,
      kind: SubjectKind.PERSON,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      key: `person:${userId}`,
      displayName: email,
      kind: SubjectKind.PERSON,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
}

async function redirectWithRevalidate(path: string) {
  revalidatePath("/admin");
  revalidatePath(path);
  redirect(path);
}

export async function createOrganizationAction(formData: FormData) {
  const actor = await requireAdminActor();
  const name = getString(formData, "name");
  const type = getString(formData, "type");
  const returnTo = getReturnTo(formData, "/admin/organizations");

  if (!name || !Object.values(CompanyType).includes(type as CompanyType)) {
    redirect(returnTo);
  }

  // Transaction boundary (B5): company + audit are one unit.
  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        id: randomUUID(),
        name,
        type: type as CompanyType,
        updatedAt: new Date(),
      },
    });

    await recordOperatorAuditEvent(
      {
        actorUserId: actor.id,
        action: "create",
        entityType: "organization",
        entityId: company.id,
        summary: `Created organization ${company.name}`,
        details: { type: company.type },
      },
      tx
    );
  });

  await redirectWithRevalidate(returnTo);
}

export async function provisionOrganizationAccountAction(formData: FormData) {
  const actor = await requireAdminActor();
  const orgName = getString(formData, "orgName");
  const orgKind = getString(formData, "orgKind");
  const ownerEmail = getEmail(formData, "ownerEmail");
  const ownerName = getNullableString(formData, "ownerName");
  const temporaryPassword = getString(formData, "temporaryPassword");
  const returnTo = getReturnTo(formData, "/admin/organizations");

  const result = await provisionOrganizationAccount({
    orgName,
    orgKind,
    ownerEmail,
    ownerName,
    password: temporaryPassword,
    credentialMode: "temporary",
    actorUserId: actor.id,
    requestedVia: "admin-form",
  });

  if (!result.ok) {
    redirect(`${returnTo}?provisionError=${result.code}`);
  }

  await redirectWithRevalidate(`${returnTo}?provisioned=${encodeURIComponent(result.ownerEmail)}`);
}

export async function updateOrganizationAction(formData: FormData) {
  const actor = await requireAdminActor();
  const companyId = getString(formData, "companyId");
  const name = getString(formData, "name");
  const type = getString(formData, "type");
  const returnTo = getReturnTo(formData, `/admin/organizations/${companyId}`);

  if (!companyId || !name || !Object.values(CompanyType).includes(type as CompanyType)) {
    redirect(returnTo);
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      type: type as CompanyType,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "update",
    entityType: "organization",
    entityId: company.id,
    summary: `Updated organization ${company.name}`,
    details: { type: company.type },
  });

  await redirectWithRevalidate(returnTo);
}

export async function updateOrganizationMembershipAction(formData: FormData) {
  const actor = await requireAdminActor();
  const companyId = getString(formData, "companyId");
  const plan = getString(formData, "plan");
  const status = getString(formData, "status");
  const returnTo = getReturnTo(formData, `/admin/organizations/${companyId}`);

  if (
    !companyId ||
    !Object.values(MembershipPlan).includes(plan as MembershipPlan) ||
    !Object.values(MembershipStatus).includes(status as MembershipStatus)
  ) {
    redirect(returnTo);
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) {
    redirect(returnTo);
  }

  // Transaction boundary (B5): subject + membership + audit are one unit.
  await prisma.$transaction(async (tx) => {
    const subject = await ensureCompanySubject(company.id, company.name, tx);
    await tx.membershipSubscription.upsert({
      where: { subjectId: subject.id },
      update: {
        plan: plan as MembershipPlan,
        status: status as MembershipStatus,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        subjectId: subject.id,
        plan: plan as MembershipPlan,
        status: status as MembershipStatus,
        provider: "pat-operator",
        startedAt: new Date(),
      },
    });

    await recordOperatorAuditEvent(
      {
        actorUserId: actor.id,
        action: "update-membership",
        entityType: "organization",
        entityId: company.id,
        summary: `Updated organization membership for ${company.name}`,
        details: { plan, status },
      },
      tx
    );
  });

  await redirectWithRevalidate(returnTo);
}

export async function updateUserContextAction(formData: FormData) {
  const actor = await requireAdminActor();
  const userId = getString(formData, "userId");
  const role = getString(formData, "role");
  const companyId = getNullableString(formData, "companyId");
  const returnTo = getReturnTo(formData, "/admin/users");

  if (!userId || !["OWNER", "ADMIN", "MEMBER"].includes(role)) {
    redirect(returnTo);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      role: role as "OWNER" | "ADMIN" | "MEMBER",
      companyId,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "update",
    entityType: "user",
    entityId: user.id,
    summary: `Updated user ${user.email}`,
    details: { role, companyId },
  });

  await redirectWithRevalidate(returnTo);
}

function isPilotAccountKind(value: string) {
  return value === "vendor" || value === "firm" || value === "consultant" || value === "admin";
}

async function resolveProvisionedPasswordHash(input: {
  temporaryPassword: string;
  importedPasswordHash: string;
  returnTo: string;
}) {
  if (input.importedPasswordHash) {
    if (!isSupportedPasswordHash(input.importedPasswordHash)) {
      redirect(`${input.returnTo}?error=unsupported_password_hash`);
    }

    return input.importedPasswordHash;
  }

  const validation = validatePilotPassword(input.temporaryPassword);
  if (!validation.ok) {
    redirect(`${input.returnTo}?error=temporary_password_policy`);
  }

  return hashPilotPassword(input.temporaryPassword);
}

export async function createPilotUserAction(formData: FormData) {
  const actor = await requireAdminActor();
  const email = getEmail(formData, "email");
  const name = getNullableString(formData, "name");
  const accountKind = getString(formData, "accountKind");
  const role = getString(formData, "role");
  const companyId = getNullableString(formData, "companyId");
  const temporaryPassword = getString(formData, "temporaryPassword");
  const importedPasswordHash = getString(formData, "importedPasswordHash");
  const mustChangePassword = getBoolean(formData, "mustChangePassword");
  const returnTo = getReturnTo(formData, "/admin/users");

  if (!email || !isPilotAccountKind(accountKind) || !Object.values(UserRole).includes(role as UserRole)) {
    redirect(returnTo);
  }

  const company = companyId
    ? await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, type: true },
      })
    : null;
  if ((accountKind === "vendor" || accountKind === "firm") && !company) {
    redirect(returnTo);
  }
  if (accountKind === "vendor" && company?.type !== CompanyType.VENDOR) {
    redirect(returnTo);
  }
  if (accountKind === "firm" && company?.type !== CompanyType.FIRM) {
    redirect(returnTo);
  }

  const passwordHash = await resolveProvisionedPasswordHash({
    temporaryPassword,
    importedPasswordHash,
    returnTo,
  });
  const now = new Date();
  // Transaction boundary (B5): user + consultant profile + audit are one unit —
  // a mid-flow failure must not leave a user without its consultant profile.
  await prisma.$transaction(async (tx) => {
    const created = await tx.user.upsert({
      where: { email },
      update: {
        name,
        role: role as UserRole,
        companyId,
        passwordHash,
        mustChangePassword,
        passwordUpdatedAt: now,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        email,
        name,
        role: role as UserRole,
        companyId,
        passwordHash,
        mustChangePassword,
        passwordUpdatedAt: now,
        updatedAt: now,
      },
      select: { id: true, email: true },
    });

    if (accountKind === "consultant") {
      await tx.consultantProfile.upsert({
        where: { userId: created.id },
        update: { active: true, updatedAt: now },
        create: { id: randomUUID(), userId: created.id, active: true },
      });
    }

    await recordOperatorAuditEvent(
      {
        actorUserId: actor.id,
        action: "provision-pilot-user",
        entityType: "user",
        entityId: created.id,
        summary: `Provisioned pilot ${accountKind} account ${created.email}`,
        details: {
          accountKind,
          role,
          companyId,
          passwordSource: importedPasswordHash ? "imported-hash" : "temporary-password",
          mustChangePassword,
        },
      },
      tx
    );
    return created;
  });

  await redirectWithRevalidate(returnTo);
}

export async function updatePilotUserPasswordAction(formData: FormData) {
  const actor = await requireAdminActor();
  const userId = getString(formData, "userId");
  const temporaryPassword = getString(formData, "temporaryPassword");
  const importedPasswordHash = getString(formData, "importedPasswordHash");
  const mustChangePassword = getBoolean(formData, "mustChangePassword");
  const returnTo = getReturnTo(formData, "/admin/users");

  if (!userId) {
    redirect(returnTo);
  }

  const passwordHash = await resolveProvisionedPasswordHash({
    temporaryPassword,
    importedPasswordHash,
    returnTo,
  });
  const now = new Date();
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword,
      passwordUpdatedAt: now,
      updatedAt: now,
    },
    select: { id: true, email: true },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "reset-pilot-password",
    entityType: "user",
    entityId: user.id,
    summary: `Reset pilot password for ${user.email}`,
    details: {
      passwordSource: importedPasswordHash ? "imported-hash" : "temporary-password",
      mustChangePassword,
    },
  });

  await redirectWithRevalidate(returnTo);
}

export async function updateUserMembershipAction(formData: FormData) {
  const actor = await requireAdminActor();
  const userId = getString(formData, "userId");
  const plan = getString(formData, "plan");
  const status = getString(formData, "status");
  const returnTo = getReturnTo(formData, "/admin/users");

  if (
    !userId ||
    !Object.values(MembershipPlan).includes(plan as MembershipPlan) ||
    !Object.values(MembershipStatus).includes(status as MembershipStatus)
  ) {
    redirect(returnTo);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user?.email) {
    redirect(returnTo);
  }

  // Transaction boundary (B5): subject + membership + audit are one unit.
  await prisma.$transaction(async (tx) => {
    const subject = await ensurePersonSubject(user.id, user.email!, tx);
    await tx.membershipSubscription.upsert({
      where: { subjectId: subject.id },
      update: {
        plan: plan as MembershipPlan,
        status: status as MembershipStatus,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        subjectId: subject.id,
        plan: plan as MembershipPlan,
        status: status as MembershipStatus,
        provider: "pat-operator",
        startedAt: new Date(),
      },
    });

    await recordOperatorAuditEvent(
      {
        actorUserId: actor.id,
        action: "update-membership",
        entityType: "user",
        entityId: user.id,
        summary: `Updated individual membership for ${user.email}`,
        details: { plan, status },
      },
      tx
    );
  });

  await redirectWithRevalidate(returnTo);
}

export async function createConsultantAction(formData: FormData) {
  const actor = await requireAdminActor();
  const email = getEmail(formData, "email");
  const name = getNullableString(formData, "name");
  const returnTo = getReturnTo(formData, "/admin/consultants");

  if (!email) {
    redirect(returnTo);
  }

  // Transaction boundary (B5): user + consultant profile + audit are one unit.
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        ...(name ? { name } : {}),
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        email,
        name,
        role: "MEMBER",
        updatedAt: new Date(),
      },
      select: { id: true, email: true },
    });

    const consultantProfile = await tx.consultantProfile.upsert({
      where: { userId: user.id },
      update: {
        active: true,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        userId: user.id,
        active: true,
      },
      select: { id: true },
    });

    await recordOperatorAuditEvent(
      {
        actorUserId: actor.id,
        action: "add-consultant",
        entityType: "consultant",
        entityId: consultantProfile.id,
        summary: `Added consultant ${user.email}`,
        details: { email },
      },
      tx
    );
  });

  revalidatePath("/consultants");
  await redirectWithRevalidate(returnTo);
}

export async function deactivateConsultantAction(formData: FormData) {
  const actor = await requireAdminActor();
  const consultantProfileId = getString(formData, "consultantProfileId");
  const returnTo = getReturnTo(formData, "/admin/consultants");

  if (!consultantProfileId) {
    redirect(returnTo);
  }

  const consultantProfile = await prisma.consultantProfile.findUnique({
    where: { id: consultantProfileId },
    select: {
      id: true,
      User: {
        select: { email: true },
      },
    },
  });
  if (!consultantProfile) {
    redirect(returnTo);
  }

  await prisma.consultantProfile.update({
    where: { id: consultantProfileId },
    data: {
      active: false,
      updatedAt: new Date(),
      ConsultantAssignment: {
        update: {
          data: {
            active: false,
            updatedAt: new Date(),
          },
        },
      },
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "remove-consultant",
    entityType: "consultant",
    entityId: consultantProfile.id,
    summary: `Removed consultant ${consultantProfile.User.email}`,
    details: { email: consultantProfile.User.email },
  });

  revalidatePath("/consultants");
  await redirectWithRevalidate(returnTo);
}

export async function upsertConsultantAssignmentAction(formData: FormData) {
  const actor = await requireAdminActor();
  const consultantProfileId = getString(formData, "consultantProfileId");
  const companyId = getString(formData, "companyId");
  const returnTo = getReturnTo(formData, "/admin/consultants");

  if (!consultantProfileId || !companyId) {
    redirect(returnTo);
  }

  const [consultantProfile, company] = await Promise.all([
    prisma.consultantProfile.findUnique({
      where: { id: consultantProfileId },
      select: {
        id: true,
        active: true,
        User: {
          select: { email: true },
        },
      },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, type: true },
    }),
  ]);

  if (!consultantProfile || !consultantProfile.active || !company || company.type !== CompanyType.FIRM) {
    redirect(returnTo);
  }

  // Ecosystem-aware assignment per Phase 1 (Day-10) schema. Strict 1:1 means
  // a consultant has at most one ConsultantAssignment, and an ecosystem can
  // bind to at most one consultant. The admin form still posts the firm
  // companyId, so this action looks up (or creates) a solo-firm ecosystem
  // for that firm and points the assignment at it. Phase 5's /admin/ecosystems
  // surface will replace this lookup-or-create with explicit ecosystem
  // selection + vendor pairing.
  const existingMembership = await prisma.ecosystemFirm.findUnique({
    where: { firmCompanyId: companyId },
    select: { ecosystemId: true },
  });

  // Transaction boundary (B5): ecosystem + reassignment (delete + create) + audit
  // are one unit — a mid-flow failure must not leave the consultant with zero
  // assignments (deleteMany succeeded, create failed).
  // NOTE (Phase 5 / AUDIT-D10-001): this legacy Assign-firm flow still creates a
  // vendor-less "Solo:" ecosystem; deprecation deferred to Phase 5.
  await prisma.$transaction(async (tx) => {
    const ecosystemId =
      existingMembership?.ecosystemId ??
      (
        await tx.ecosystem.create({
          data: {
            id: randomUUID(),
            name: `Solo: ${company.name}`,
            updatedAt: new Date(),
            EcosystemFirm: {
              create: {
                firmCompanyId: companyId,
              },
            },
          },
          select: { id: true },
        })
      ).id;

    await tx.consultantAssignment.deleteMany({ where: { consultantProfileId } });

    const assignment = await tx.consultantAssignment.create({
      data: {
        id: randomUUID(),
        consultantProfileId,
        ecosystemId,
        active: true,
        updatedAt: new Date(),
      },
    });

    await recordOperatorAuditEvent(
      {
        actorUserId: actor.id,
        action: "assign-consultant",
        entityType: "consultant-assignment",
        entityId: assignment.id,
        summary: `Assigned consultant ${consultantProfile.User.email} to ${company.name}`,
        details: { companyId: company.id, companyName: company.name, ecosystemId },
      },
      tx
    );
  });

  revalidatePath("/consultants");
  revalidatePath(`/consultants/briefings/${company.id}`);
  await redirectWithRevalidate(returnTo);
}

export async function removeConsultantAssignmentAction(formData: FormData) {
  const actor = await requireAdminActor();
  const assignmentId = getString(formData, "assignmentId");
  const returnTo = getReturnTo(formData, "/admin/consultants");

  if (!assignmentId) {
    redirect(returnTo);
  }

  const assignment = await prisma.consultantAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      ecosystemId: true,
      Ecosystem: {
        select: {
          name: true,
          EcosystemFirm: {
            select: { firmCompanyId: true },
            take: 1,
          },
        },
      },
      ConsultantProfile: {
        select: {
          User: {
            select: { email: true },
          },
        },
      },
    },
  });

  if (!assignment) {
    redirect(returnTo);
  }

  await prisma.consultantAssignment.update({
    where: { id: assignmentId },
    data: {
      active: false,
      updatedAt: new Date(),
    },
  });

  const firmCompanyId = assignment.Ecosystem.EcosystemFirm[0]?.firmCompanyId ?? null;

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "remove-consultant-assignment",
    entityType: "consultant-assignment",
    entityId: assignment.id,
    summary: `Removed consultant ${assignment.ConsultantProfile.User.email} from ${assignment.Ecosystem.name}`,
    details: { ecosystemId: assignment.ecosystemId, ecosystemName: assignment.Ecosystem.name, firmCompanyId },
  });

  revalidatePath("/consultants");
  if (firmCompanyId) {
    revalidatePath(`/consultants/briefings/${firmCompanyId}`);
  }
  await redirectWithRevalidate(returnTo);
}

export async function createTaxonomyBucketAction(formData: FormData) {
  const actor = await requireAdminActor();
  const key = getString(formData, "key");
  const title = getString(formData, "title");
  const kind = getString(formData, "kind");
  const parentId = getNullableString(formData, "parentId");
  const description = getNullableString(formData, "description");
  const returnTo = getReturnTo(formData, "/admin/taxonomy");

  if (!key || !title || !Object.values(TaxonomyBucketKind).includes(kind as TaxonomyBucketKind)) {
    redirect(returnTo);
  }

  const bucket = await prisma.taxonomyBucket.create({
    data: {
      id: randomUUID(),
      key,
      title,
      kind: kind as TaxonomyBucketKind,
      parentId,
      description,
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "create",
    entityType: "taxonomy-bucket",
    entityId: bucket.id,
    summary: `Created taxonomy bucket ${bucket.key}`,
    details: { kind: bucket.kind, parentId },
  });

  await redirectWithRevalidate(returnTo);
}

export async function updateTaxonomyBucketAction(formData: FormData) {
  const actor = await requireAdminActor();
  const bucketId = getString(formData, "bucketId");
  const title = getString(formData, "title");
  const description = getNullableString(formData, "description");
  const kind = getString(formData, "kind");
  const parentId = getNullableString(formData, "parentId");
  const active = getBoolean(formData, "active");
  const returnTo = getReturnTo(formData, "/admin/taxonomy");

  if (!bucketId || !title || !Object.values(TaxonomyBucketKind).includes(kind as TaxonomyBucketKind)) {
    redirect(returnTo);
  }

  const bucket = await prisma.taxonomyBucket.update({
    where: { id: bucketId },
    data: {
      title,
      description,
      kind: kind as TaxonomyBucketKind,
      parentId,
      active,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "update",
    entityType: "taxonomy-bucket",
    entityId: bucket.id,
    summary: `Updated taxonomy bucket ${bucket.key}`,
    details: { active, kind, parentId },
  });

  await redirectWithRevalidate(returnTo);
}

export async function upsertTaxonomyBucketCapabilityAction(formData: FormData) {
  const actor = await requireAdminActor();
  const bucketId = getString(formData, "bucketId");
  const capabilityKey = getString(formData, "capabilityKey");
  const nodeId = getNullableString(formData, "nodeId");
  const coverage = getString(formData, "coverage");
  const confidence = getString(formData, "confidence");
  const notes = getNullableString(formData, "notes");
  const returnTo = getReturnTo(formData, "/admin/taxonomy");

  if (
    !bucketId ||
    !capabilityKey ||
    !Object.values(ProductCapabilityCoverage).includes(coverage as ProductCapabilityCoverage) ||
    !Object.values(ResearchConfidence).includes(confidence as ResearchConfidence)
  ) {
    redirect(returnTo);
  }

  const mapping = await prisma.taxonomyBucketCapability.upsert({
    where: {
      bucketId_capabilityKey: {
        bucketId,
        capabilityKey,
      },
    },
    update: {
      nodeId,
      coverage: coverage as ProductCapabilityCoverage,
      confidence: confidence as ResearchConfidence,
      notes,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      bucketId,
      capabilityKey,
      nodeId,
      coverage: coverage as ProductCapabilityCoverage,
      confidence: confidence as ResearchConfidence,
      notes,
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "upsert-mapping",
    entityType: "taxonomy-capability",
    entityId: mapping.id,
    summary: `Updated taxonomy capability mapping ${capabilityKey}`,
    details: { bucketId, coverage, confidence },
  });

  await redirectWithRevalidate(returnTo);
}

export async function updateModuleAction(formData: FormData) {
  const actor = await requireAdminActor();
  const moduleId = getString(formData, "moduleId");
  const title = getString(formData, "title");
  const description = getNullableString(formData, "description");
  const scope = getString(formData, "scope");
  const weight = getNumber(formData, "weight", 1);
  const active = getBoolean(formData, "active");
  const returnTo = getReturnTo(formData, "/admin/modules");

  if (!moduleId || !title || !Object.values(ModuleScope).includes(scope as ModuleScope)) {
    redirect(returnTo);
  }

  const moduleRecord = await prisma.surveyModule.update({
    where: { id: moduleId },
    data: {
      title,
      description,
      scope: scope as ModuleScope,
      weight,
      active,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "update",
    entityType: "module",
    entityId: moduleRecord.id,
    summary: `Updated module ${moduleRecord.key}`,
    details: { scope, weight, active },
  });

  await redirectWithRevalidate(returnTo);
}

export async function upsertSectionAction(formData: FormData) {
  const actor = await requireAdminActor();
  const sectionId = getNullableString(formData, "sectionId");
  const moduleId = getString(formData, "moduleId");
  const key = getString(formData, "key");
  const title = getString(formData, "title");
  const description = getNullableString(formData, "description");
  const order = getNumber(formData, "order", 1);
  const utilityFamily = getNullableString(formData, "utilityFamily");
  const utilityKey = getNullableString(formData, "utilityKey");
  const utilityLabel = getNullableString(formData, "utilityLabel");
  const subcategoryKey = getNullableString(formData, "subcategoryKey");
  const subcategoryTitle = getNullableString(formData, "subcategoryTitle");
  const basisKey = getNullableString(formData, "basisKey");
  const returnTo = getReturnTo(formData, "/admin/modules");

  if (!moduleId || !key || !title) {
    redirect(returnTo);
  }

  const section = sectionId
    ? await prisma.surveySection.update({
        where: { id: sectionId },
        data: {
          key,
          title,
          description,
          order,
          utilityFamily,
          utilityKey,
          utilityLabel,
          subcategoryKey,
          subcategoryTitle,
          basisKey,
          updatedAt: new Date(),
        },
      })
    : await prisma.surveySection.create({
        data: {
          id: randomUUID(),
          moduleId,
          key,
          title,
          description,
          order,
          utilityFamily,
          utilityKey,
          utilityLabel,
          subcategoryKey,
          subcategoryTitle,
          basisKey,
        },
      });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: sectionId ? "update" : "create",
    entityType: "section",
    entityId: section.id,
    summary: `${sectionId ? "Updated" : "Created"} section ${section.key}`,
    details: { moduleId, order, utilityKey, subcategoryKey },
  });

  await redirectWithRevalidate(returnTo);
}

export async function updateQuestionAction(formData: FormData) {
  const actor = await requireAdminActor();
  const questionId = getString(formData, "questionId");
  const prompt = getString(formData, "prompt");
  const order = getNumber(formData, "order", 1);
  const weight = getNumber(formData, "weight", 1);
  const inputType = getString(formData, "inputType");
  const required = getBoolean(formData, "required");
  const sectionId = getNullableString(formData, "sectionId");
  const returnTo = getReturnTo(formData, "/admin/modules");

  if (!questionId || !prompt || !Object.values(QuestionInputType).includes(inputType as QuestionInputType)) {
    redirect(returnTo);
  }

  const question = await prisma.surveyQuestion.update({
    where: { id: questionId },
    data: {
      prompt,
      order,
      weight,
      inputType: inputType as QuestionInputType,
      required,
      sectionId,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "update",
    entityType: "question",
    entityId: question.id,
    summary: `Updated question ${question.key}`,
    details: { order, weight, inputType, required, sectionId },
  });

  await redirectWithRevalidate(returnTo);
}

export async function upsertModuleCapabilityAction(formData: FormData) {
  const actor = await requireAdminActor();
  const moduleId = getString(formData, "moduleId");
  const nodeId = getString(formData, "nodeId");
  const weight = getNumber(formData, "weight", 1);
  const returnTo = getReturnTo(formData, "/admin/modules");
  if (!moduleId || !nodeId) {
    redirect(returnTo);
  }

  const mapping = await prisma.moduleCapability.upsert({
    where: {
      moduleId_nodeId: {
        moduleId,
        nodeId,
      },
    },
    update: { weight },
    create: {
      id: randomUUID(),
      moduleId,
      nodeId,
      weight,
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "upsert-mapping",
    entityType: "module-capability",
    entityId: mapping.id,
    summary: "Updated module capability mapping",
    details: { moduleId, nodeId, weight },
  });

  await redirectWithRevalidate(returnTo);
}

export async function upsertQuestionCapabilityAction(formData: FormData) {
  const actor = await requireAdminActor();
  const questionId = getString(formData, "questionId");
  const nodeId = getString(formData, "nodeId");
  const weight = getNumber(formData, "weight", 1);
  const returnTo = getReturnTo(formData, "/admin/modules");
  if (!questionId || !nodeId) {
    redirect(returnTo);
  }

  const mapping = await prisma.surveyQuestionCapability.upsert({
    where: {
      questionId_nodeId: {
        questionId,
        nodeId,
      },
    },
    update: { weight },
    create: {
      id: randomUUID(),
      questionId,
      nodeId,
      weight,
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "upsert-mapping",
    entityType: "question-capability",
    entityId: mapping.id,
    summary: "Updated question capability mapping",
    details: { questionId, nodeId, weight },
  });

  await redirectWithRevalidate(returnTo);
}

export async function updateInsightAction(formData: FormData) {
  const actor = await requireAdminActor();
  const insightId = getString(formData, "insightId");
  const title = getString(formData, "title");
  const body = getString(formData, "body");
  const tier = getNumber(formData, "tier", 1);
  const active = getBoolean(formData, "active");
  const returnTo = getReturnTo(formData, "/admin/insights/rules");
  if (!insightId || !title || !body) {
    redirect(returnTo);
  }

  const insight = await prisma.insight.update({
    where: { id: insightId },
    data: {
      title,
      body,
      tier,
      active,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "update",
    entityType: "insight",
    entityId: insight.id,
    summary: `Updated insight ${insight.key}`,
    details: { tier, active },
  });

  await redirectWithRevalidate(returnTo);
}

export async function upsertInsightCapabilityRuleAction(formData: FormData) {
  const actor = await requireAdminActor();
  const insightId = getString(formData, "insightId");
  const nodeId = getString(formData, "nodeId");
  const minScore = getNumber(formData, "minScore", 0);
  const required = getBoolean(formData, "required");
  const returnTo = getReturnTo(formData, "/admin/insights/rules");
  if (!insightId || !nodeId) {
    redirect(returnTo);
  }

  const rule = await prisma.insightCapabilityRule.upsert({
    where: {
      insightId_nodeId: {
        insightId,
        nodeId,
      },
    },
    update: {
      minScore,
      required,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      insightId,
      nodeId,
      minScore,
      required,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "upsert-rule",
    entityType: "insight-capability-rule",
    entityId: rule.id,
    summary: "Updated insight capability rule",
    details: { insightId, nodeId, minScore, required },
  });

  await redirectWithRevalidate(returnTo);
}

export async function upsertInsightUnlockRuleAction(formData: FormData) {
  const actor = await requireAdminActor();
  const insightId = getString(formData, "insightId");
  const badgeId = getString(formData, "badgeId");
  const required = getBoolean(formData, "required");
  const returnTo = getReturnTo(formData, "/admin/insights/rules");
  if (!insightId || !badgeId) {
    redirect(returnTo);
  }

  const rule = await prisma.insightUnlockRule.upsert({
    where: {
      insightId_badgeId: {
        insightId,
        badgeId,
      },
    },
    update: {
      required,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      insightId,
      badgeId,
      required,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "upsert-rule",
    entityType: "insight-unlock-rule",
    entityId: rule.id,
    summary: "Updated insight unlock rule",
    details: { insightId, badgeId, required },
  });

  await redirectWithRevalidate(returnTo);
}

export async function updateProductAction(formData: FormData) {
  const actor = await requireAdminActor();
  const productId = getString(formData, "productId");
  const name = getString(formData, "name");
  const summary = getNullableString(formData, "summary");
  const website = getNullableString(formData, "website");
  const active = getBoolean(formData, "active");
  const returnTo = getReturnTo(formData, `/admin/products/${productId}`);
  if (!productId || !name) {
    redirect(returnTo);
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      summary,
      website,
      active,
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "update",
    entityType: "product",
    entityId: product.id,
    summary: `Updated product ${product.name}`,
    details: { active },
  });

  await redirectWithRevalidate(returnTo);
}

export async function upsertProductTaxonomyAssignmentAction(formData: FormData) {
  const actor = await requireAdminActor();
  const productId = getString(formData, "productId");
  const bucketId = getString(formData, "bucketId");
  const fit = getString(formData, "fit");
  const confidence = getString(formData, "confidence");
  const notes = getNullableString(formData, "notes");
  const returnTo = getReturnTo(formData, `/admin/products/${productId}`);
  if (
    !productId ||
    !bucketId ||
    !Object.values(ProductTaxonomyFit).includes(fit as ProductTaxonomyFit) ||
    !Object.values(ResearchConfidence).includes(confidence as ResearchConfidence)
  ) {
    redirect(returnTo);
  }

  const assignment = await prisma.productTaxonomyAssignment.upsert({
    where: {
      productId_bucketId: {
        productId,
        bucketId,
      },
    },
    update: {
      fit: fit as ProductTaxonomyFit,
      confidence: confidence as ResearchConfidence,
      notes,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      productId,
      bucketId,
      fit: fit as ProductTaxonomyFit,
      confidence: confidence as ResearchConfidence,
      notes,
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "upsert-mapping",
    entityType: "product-taxonomy",
    entityId: assignment.id,
    summary: "Updated product taxonomy assignment",
    details: { productId, bucketId, fit, confidence },
  });

  await redirectWithRevalidate(returnTo);
}

export async function upsertProductCapabilityMapAction(formData: FormData) {
  const actor = await requireAdminActor();
  const productId = getString(formData, "productId");
  const capabilityKey = getString(formData, "capabilityKey");
  const nodeId = getNullableString(formData, "nodeId");
  const coverage = getString(formData, "coverage");
  const confidence = getString(formData, "confidence");
  const notes = getNullableString(formData, "notes");
  const returnTo = getReturnTo(formData, `/admin/products/${productId}`);
  if (
    !productId ||
    !capabilityKey ||
    !Object.values(ProductCapabilityCoverage).includes(coverage as ProductCapabilityCoverage) ||
    !Object.values(ResearchConfidence).includes(confidence as ResearchConfidence)
  ) {
    redirect(returnTo);
  }

  const mapping = await prisma.productCapabilityMap.upsert({
    where: {
      productId_capabilityKey: {
        productId,
        capabilityKey,
      },
    },
    update: {
      nodeId,
      coverage: coverage as ProductCapabilityCoverage,
      confidence: confidence as ResearchConfidence,
      notes,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      productId,
      capabilityKey,
      nodeId,
      coverage: coverage as ProductCapabilityCoverage,
      confidence: confidence as ResearchConfidence,
      notes,
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "upsert-mapping",
    entityType: "product-capability",
    entityId: mapping.id,
    summary: "Updated product capability mapping",
    details: { productId, capabilityKey, coverage, confidence },
  });

  await redirectWithRevalidate(returnTo);
}

export async function updatePortalAction(formData: FormData) {
  const actor = await requireAdminActor();
  const portalId = getString(formData, "portalId");
  const title = getString(formData, "title");
  const active = getBoolean(formData, "active");
  const returnTo = getReturnTo(formData, "/admin/runtime");
  if (!portalId || !title) {
    redirect(returnTo);
  }

  const portal = await prisma.portal.update({
    where: { id: portalId },
    data: {
      title,
      active,
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: actor.id,
    action: "update",
    entityType: "portal",
    entityId: portal.id,
    summary: `Updated portal ${portal.key}`,
    details: { active, title },
  });

  await redirectWithRevalidate(returnTo);
}
