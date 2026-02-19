import { PrismaClient, OrganizationType, UserRole, EngagementType, SubscriptionTier } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: {
      name: "Demo Firm LLC",
      type: OrganizationType.FIRM,
      subscription: {
        create: { tier: SubscriptionTier.PRO },
      },
      firmProfile: {
        create: {
          industry: "Accounting",
          size: 5,
        },
      },
      users: {
        create: {
          email: "owner@demofirm.com",
          name: "Demo Owner",
          role: UserRole.OWNER,
        },
      },
    },
    include: { firmProfile: true },
  });

  const firmProfileId = org.firmProfile?.id;
  if (!firmProfileId) throw new Error("FirmProfile not created");

  const client = await prisma.client.create({
    data: {
      firmId: firmProfileId,
      name: "Acme Construction",
      industry: "Construction",
    },
  });

  await prisma.engagement.create({
    data: {
      clientId: client.id,
      type: EngagementType.CFO,
      name: "Fractional CFO - 2026",
      alignmentProfile: {
        create: {
          riskScore: 0.35,
          stabilityScore: 0.72,
          complexityScore: 0.58,
          driftScore: 0.22,
          notes: "Seed profile to validate relationships.",
        },
      },
    },
  });

  console.log("✅ Seed complete:", {
    organizationId: org.id,
    firmProfileId,
    clientId: client.id
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
