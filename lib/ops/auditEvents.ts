import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type AuditEventInput = {
  eventKey: string;
  eventCategory: string;
  outcome: string;
  severity?: "INFO" | "WARN" | "ERROR";
  actorUserId?: string | null;
  actorCompanyId?: string | null;
  subjectCompanyId?: string | null;
  subjectProductId?: string | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  details?: Prisma.InputJsonValue;
};

export async function recordAuditEvent(input: AuditEventInput) {
  const payload = {
    id: randomUUID(),
    eventKey: input.eventKey,
    eventCategory: input.eventCategory,
    outcome: input.outcome,
    severity: input.severity ?? "INFO",
    actorUserId: input.actorUserId ?? null,
    actorCompanyId: input.actorCompanyId ?? null,
    subjectCompanyId: input.subjectCompanyId ?? null,
    subjectProductId: input.subjectProductId ?? null,
    requestPath: input.requestPath ?? null,
    requestMethod: input.requestMethod ?? null,
    detailsJson: input.details ?? undefined,
  } satisfies Prisma.AuditEventUncheckedCreateInput;

  try {
    await prisma.auditEvent.create({
      data: payload,
    });
  } catch (error) {
    console.error(
      "AUDIT_EVENT_WRITE_ERROR",
      JSON.stringify({
        ...payload,
        detailsJson: payload.detailsJson ?? null,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

export function toAuditDetailValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
