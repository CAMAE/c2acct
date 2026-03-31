import { Prisma } from "@prisma/client";

const compatibilityWarnings = new Set<string>();

function errorText(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "");
}

export function isPrismaMissingSchemaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

export function matchesPrismaMissingSchemaTarget(
  error: unknown,
  targets: string[]
) {
  if (!isPrismaMissingSchemaError(error)) {
    return false;
  }

  const text = errorText(error).toLowerCase();
  return targets.some((target) => text.includes(target.toLowerCase()));
}

export function warnPrismaCompatibilityOnce(key: string, message: string) {
  if (compatibilityWarnings.has(key)) {
    return;
  }

  compatibilityWarnings.add(key);
  console.warn(`[db-compat] ${message}`);
}
