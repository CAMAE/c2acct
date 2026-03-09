import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function run() {

  const insight = await prisma.insight.upsert({
    where: { key: "executive_brief" },
    update: {},
    create: {
      id: randomUUID(),
      key: "executive_brief",
      title: "Executive Brief"
    }
  });

  await prisma.insightUnlockRule.upsert({
    where: {
      insightId_capabilityKey: {
        insightId: insight.id,
        capabilityKey: "leadership_alignment"
      }
    },
    update: {},
    create: {
      id: randomUUID(),
      insightId: insight.id,
      capabilityKey: "leadership_alignment",
      minScore: 60
    }
  });

  console.log("Seeded insight rule.");

}

run().finally(()=>process.exit());
