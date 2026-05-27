import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isPrismaMissingSchemaError, warnPrismaCompatibilityOnce } from "@/lib/prisma-compat";

type AuditClient = Prisma.TransactionClient | typeof prisma;

export type OperatorAuditInput = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: Prisma.JsonValue;
};

export async function recordOperatorAuditEvent(
  input: OperatorAuditInput,
  client: AuditClient = prisma
) {
  try {
    return await client.operatorAuditEvent.create({
      data: {
        id: randomUUID(),
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        details: input.details ?? {},
      },
    });
  } catch (error) {
    if (isPrismaMissingSchemaError(error)) {
      warnPrismaCompatibilityOnce(
        "operator-audit-missing",
        "OperatorAuditEvent is missing in the local database. Admin mutations will continue without persisted audit events until Prisma migrations are applied."
      );
      return null;
    }
    throw error;
  }
}

export function buildOperatorAuditSummary(input: {
  action: string;
  entityType: string;
  entityLabel: string;
}) {
  return `${input.action} ${input.entityType} ${input.entityLabel}`.trim();
}
