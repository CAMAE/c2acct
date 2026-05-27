import { randomUUID } from "node:crypto";
import { type Prisma } from "@prisma/client";
import {
  COMPANY_CAPABILITY_SCORE_VERSION,
  type CapabilityScoreResult,
} from "@/lib/capabilityScoring";
import { recordPatDiagnostic } from "@/lib/patDiagnostics";

type CapabilityScoreWriter = {
  companyCapabilityScore: {
    findFirst(args: {
      where: {
        companyId: string;
        nodeId: string;
        scoreVersion: number;
      };
      select: {
        id: true;
      };
    }): Promise<{ id: string } | null>;
    update(args: {
      where: {
        id: string;
      };
      data: {
        score: number;
        computedAt: Date;
      };
    }): Promise<unknown>;
    create(args: {
      data: {
        id: string;
        companyId: string;
        nodeId: string;
        score: number;
        scoreVersion: number;
      };
    }): Promise<unknown>;
    deleteMany(args: {
      where: {
        companyId: string;
        nodeId: string;
        scoreVersion: number;
        id?: {
          not: string;
        };
      };
    }): Promise<unknown>;
  };
};

export async function writeCompanyCapabilityScores(
  client: CapabilityScoreWriter,
  input: {
    companyId: string;
    scores: CapabilityScoreResult[];
    scoreVersion?: number;
  }
) {
  const scoreVersion = input.scoreVersion ?? COMPANY_CAPABILITY_SCORE_VERSION;
  let createdCount = 0;
  let updatedCount = 0;
  let duplicateCleanupCount = 0;

  for (const capabilityScore of input.scores) {
    const existing = await client.companyCapabilityScore.findFirst({
      where: {
        companyId: input.companyId,
        nodeId: capabilityScore.nodeId,
        scoreVersion,
      },
      select: { id: true },
    });

    if (existing) {
      await client.companyCapabilityScore.update({
        where: { id: existing.id },
        data: {
          score: capabilityScore.score,
          computedAt: new Date(),
        },
      });

      await client.companyCapabilityScore.deleteMany({
        where: {
          companyId: input.companyId,
          nodeId: capabilityScore.nodeId,
          scoreVersion,
          id: { not: existing.id },
        },
      });
      updatedCount += 1;
      duplicateCleanupCount += 1;
      continue;
    }

    await client.companyCapabilityScore.create({
      data: {
        id: randomUUID(),
        companyId: input.companyId,
        nodeId: capabilityScore.nodeId,
        score: capabilityScore.score,
        scoreVersion,
      },
    });
    createdCount += 1;
  }

  recordPatDiagnostic({
    area: "capability_write",
    level: "info",
    status: "ok",
    summary: "Company capability scores written.",
    details: {
      scoreCount: input.scores.length,
      createdCount,
      updatedCount,
      duplicateCleanupCount,
      scoreVersion,
    },
  });

  return {
    scoreCount: input.scores.length,
    createdCount,
    updatedCount,
    duplicateCleanupCount,
    scoreVersion,
  };
}

export type CapabilityWriteClient = Prisma.TransactionClient;
